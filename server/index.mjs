#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import bcrypt from 'bcryptjs';

// PDF debug logging toggle (default on in non-production, disable with PDF_DEBUG=0)
const PDF_DEBUG = process.env.PDF_DEBUG !== '0' && process.env.NODE_ENV !== 'production';
const logPdf = (...args) => { if (PDF_DEBUG) console.log('[pdf]', ...args); };

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

// Simple helper - read acting user id from header `x-user-id` (demo only)
function getActingUserId(req) {
	const v = req.header('x-user-id') || req.header('X-User-Id') || req.header('authorization');
	if (!v) return null;
	// if Authorization: Bearer <id> (convenience for local testing) or direct id
	if (v.toLowerCase().startsWith('bearer ')) return Number(v.split(' ')[1]);
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

async function getRolesForUser(userId) {
	if (!userId) return [];
	const roles = await prisma.userRole.findMany({ where: { userId }, include: { role: true } });
	return roles.map(r => r.role.name);
}

// Utility: generate a simple reference string
function generateReference() {
	const dt = new Date();
	const year = dt.getFullYear();
	const rand = Math.floor(Math.random() * 9000) + 1000;
	return `REQ-${year}-${rand}`;
}

// Create a request and assign to the department manager (if present)
app.post('/requests', async (req, res) => {
	try {
		const actorId = getActingUserId(req);
		const {
			title,
			description,
			departmentId,
			items = [],
			fundingSourceId,
			totalEstimated,
			currency,
			priority,
			procurementType,
			vendorId,
			budgetCode,
		} = req.body;

		if (!title || !departmentId || !actorId) {
			return res.status(400).json({ error: 'title, departmentId and x-user-id header are required' });
		}

		// Debug log the received procurement type
		if (procurementType) {
			console.log('[debug] Received procurementType:', procurementType, 'type:', typeof procurementType);
		}

		const reference = generateReference();

		const created = await prisma.request.create({
			data: {
				reference,
				title,
				description,
				requesterId: actorId,
				departmentId,
				fundingSourceId: fundingSourceId || undefined,
				totalEstimated: totalEstimated ? new Prisma.Decimal(String(totalEstimated)) : undefined,
				currency: currency || undefined,
				priority: priority || undefined,
				procurementType: procurementType || undefined,
				vendorId: vendorId || undefined,
				budgetCode: budgetCode || undefined,
				status: 'SUBMITTED',
				submittedAt: new Date(),
				items: {
					create: (items || []).map(it => ({
						description: it.description,
						quantity: it.quantity || 1,
						unitPrice: it.unitPrice ? new Prisma.Decimal(String(it.unitPrice)) : new Prisma.Decimal('0'),
						totalPrice: it.totalPrice ? new Prisma.Decimal(String(it.totalPrice)) : new Prisma.Decimal('0'),
						accountCode: it.accountCode || undefined,
						stockLevel: it.stockLevel || undefined,
						unitOfMeasure: it.unitOfMeasure || undefined,
						partNumber: it.partNumber || undefined,
					})),
				},
			},
			include: { items: true },
		});

		// record action SUBMIT
		await prisma.requestAction.create({
			data: {
				requestId: created.id,
				action: 'SUBMIT',
				comment: 'Submitted by requester',
				performedById: actorId,
				metadata: { channel: 'web' },
			},
		});

		await prisma.requestStatusHistory.create({
			data: {
				requestId: created.id,
				status: 'SUBMITTED',
				changedById: actorId,
				comment: 'Initial submit',
			},
		});

		// assign to department manager if exists
		const dept = await prisma.department.findUnique({ where: { id: departmentId } });
		if (dept && dept.managerId) {
			await prisma.request.update({ where: { id: created.id }, data: { currentAssigneeId: dept.managerId, status: 'DEPARTMENT_REVIEW' } });
			await prisma.requestAction.create({ data: { requestId: created.id, action: 'ASSIGN', comment: 'Assigned to department manager', performedById: actorId, metadata: { to: dept.managerId } } });
			await prisma.requestStatusHistory.create({ data: { requestId: created.id, status: 'DEPARTMENT_REVIEW', changedById: actorId, comment: 'Assigned to department manager' } });
		}

		const result = await prisma.request.findUnique({ where: { id: created.id }, include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true, actions: true } });
		res.status(201).json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Simple test login for local dev: POST /auth/test-login { email }
// Returns user with department and roles; no password verification (dev only)
app.post('/auth/test-login', async (req, res) => {
	try {
		const { email } = req.body || {};
		if (!email) return res.status(400).json({ error: 'email required' });
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				department: true,
				roles: { include: { role: true } },
			},
		});
		if (!user) return res.status(404).json({ error: 'user not found' });

		const payload = {
			id: user.id,
			email: user.email,
			name: user.name,
			department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
			roles: (user.roles || []).map((ur) => ur.role.name),
		};
		return res.json({ token: 'demo-token', user: payload });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Password-based login for non-Azure flow (to be replaced/extended later with JWT & AD)
app.post('/api/auth/login', async (req, res) => {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				department: true,
				roles: { include: { role: true } },
			},
		});
		if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });

		const ok = await bcrypt.compare(String(password), user.passwordHash);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

		// Simple opaque token placeholder (swap for signed JWT later)
		const token = Buffer.from(`${user.id}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`).toString('base64');
		const roles = (user.roles || []).map(r => r.role.name);
		const userPayload = {
			id: user.id,
			email: user.email,
			name: user.name,
			roles,
			department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
		};
		return res.json({ token, user: userPayload });
	} catch (err) {
		console.error('Login error:', err);
		return res.status(500).json({ message: 'Login failed' });
	}
});

// List requests with simple filters
app.get('/requests', async (req, res) => {
	try {
		const { assignee, requester, status, departmentId } = req.query;
		const where = {};
		if (assignee) where.currentAssigneeId = Number(assignee);
		if (requester) where.requesterId = Number(requester);
		if (status) where.status = String(status);
		if (departmentId) where.departmentId = Number(departmentId);

		const list = await prisma.request.findMany({ where, orderBy: { createdAt: 'desc' }, include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true } });
		res.json(list);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Get a single request by ID
app.get('/requests/:id', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const request = await prisma.request.findUnique({ 
			where: { id }, 
			include: { 
				items: true, 
				requester: true, 
				department: true, 
				currentAssignee: true, 
				statusHistory: true 
			} 
		});
		
		if (!request) return res.status(404).json({ error: 'Request not found' });
		res.json(request);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Update request data (for manager/procurement/finance to fill their sections)
app.put('/requests/:id', async (req, res) => {
	try {
		const actorId = getActingUserId(req);
		const id = Number(req.params.id);
		const data = req.body;
		
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });
		
		const request = await prisma.request.findUnique({ where: { id } });
		if (!request) return res.status(404).json({ error: 'Request not found' });
		
		// Update request fields
		const updateData = {};
		if (data.managerName !== undefined) updateData.managerName = data.managerName;
		if (data.headName !== undefined) updateData.headName = data.headName;
		if (data.managerApproved !== undefined) updateData.managerApproved = Boolean(data.managerApproved);
		if (data.headApproved !== undefined) updateData.headApproved = Boolean(data.headApproved);
		if (data.commitmentNumber !== undefined) updateData.commitmentNumber = data.commitmentNumber;
		if (data.accountingCode !== undefined) updateData.accountingCode = data.accountingCode;
		if (data.budgetComments !== undefined) updateData.budgetComments = data.budgetComments;
		if (data.budgetOfficerName !== undefined) updateData.budgetOfficerName = data.budgetOfficerName;
		if (data.budgetManagerName !== undefined) updateData.budgetManagerName = data.budgetManagerName;
		if (data.procurementCaseNumber !== undefined) updateData.procurementCaseNumber = data.procurementCaseNumber;
		if (data.receivedBy !== undefined) updateData.receivedBy = data.receivedBy;
		if (data.dateReceived !== undefined) updateData.dateReceived = data.dateReceived;
		if (data.actionDate !== undefined) updateData.actionDate = data.actionDate;
		if (data.procurementComments !== undefined) updateData.procurementComments = data.procurementComments;
		if (data.procurementApproved !== undefined) updateData.procurementApproved = Boolean(data.procurementApproved);
		
		const updated = await prisma.request.update({ 
			where: { id }, 
			data: updateData,
			include: { 
				items: true, 
				requester: true, 
				department: true, 
				currentAssignee: true, 
				statusHistory: true 
			}
		});
		
		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Perform actions on a request: APPROVE, RETURN, ASSIGN
app.post('/requests/:id/action', async (req, res) => {
	try {
		const actorId = getActingUserId(req);
		const id = Number(req.params.id);
		const { action, comment, assignedToId } = req.body;
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });

		const request = await prisma.request.findUnique({ where: { id }, include: { requester: true, department: true } });
		if (!request) return res.status(404).json({ error: 'request not found' });

		// Basic authorization: allow if actor is currentAssignee or is the requester for return
		const isAssignee = request.currentAssigneeId && Number(request.currentAssigneeId) === Number(actorId);

		// handle ASSIGN explicitly
		if (action === 'ASSIGN') {
			if (!assignedToId) return res.status(400).json({ error: 'assignedToId required for ASSIGN' });
			await prisma.request.update({ where: { id }, data: { currentAssigneeId: Number(assignedToId) } });
			await prisma.requestAction.create({ data: { requestId: id, action: 'ASSIGN', comment: comment || '', performedById: actorId, metadata: { to: assignedToId } } });
			await prisma.requestStatusHistory.create({ data: { requestId: id, status: request.status, changedById: actorId, comment: `Assigned to ${assignedToId}` } });
			return res.json({ ok: true });
		}

		if (action === 'RETURN') {
			// return to requester
			await prisma.request.update({ where: { id }, data: { status: 'DEPARTMENT_RETURNED', currentAssigneeId: request.requesterId } });
			await prisma.requestAction.create({ data: { requestId: id, action: 'RETURN', comment: comment || '', performedById: actorId } });
			await prisma.requestStatusHistory.create({ data: { requestId: id, status: 'DEPARTMENT_RETURNED', changedById: actorId, comment: comment || '' } });
			return res.json({ ok: true });
		}

		if (action === 'APPROVE') {
			// require that actor is assignee (simple rule)
			if (!isAssignee) return res.status(403).json({ error: 'only current assignee may approve' });

			// Decide next step based on current status
			let nextStatus = null;
			let nextAssigneeId = null;

			switch (request.status) {
				case 'DEPARTMENT_REVIEW':
				case 'SUBMITTED':
					// move to HOD_REVIEW (find head of division in same department)
					nextStatus = 'HOD_REVIEW';
					// find user with role HEAD_OF_DIVISION in same department
					{
						const hodUserRole = await prisma.userRole.findFirst({ where: { role: { name: 'HEAD_OF_DIVISION' }, user: { departmentId: request.departmentId } }, include: { user: true } });
						if (hodUserRole && hodUserRole.user) nextAssigneeId = hodUserRole.user.id;
					}
					break;
				case 'HOD_REVIEW':
					// move to PROCUREMENT_REVIEW (load-balance across procurement officers)
					nextStatus = 'PROCUREMENT_REVIEW';
					{
						// Get all procurement officers
						const procOfficers = await prisma.userRole.findMany({ 
							where: { role: { name: 'PROCUREMENT' } }, 
							include: { user: true } 
						});
						
						if (procOfficers.length > 0) {
							// Count pending assignments for each procurement officer
							const countsPromises = procOfficers.map(async (uro) => {
								const count = await prisma.request.count({
									where: {
										currentAssigneeId: uro.user.id,
										status: { in: ['PROCUREMENT_REVIEW'] }
									}
								});
								return { userId: uro.user.id, count };
							});
							
							const counts = await Promise.all(countsPromises);
							
							// Find the officer with the fewest pending assignments
							const leastBusy = counts.reduce((min, curr) => (curr.count < min.count ? curr : min));
							nextAssigneeId = leastBusy.userId;
						}
					}
					break;
				case 'PROCUREMENT_REVIEW':
					// move to FINANCE_REVIEW (load-balance across finance officers)
					nextStatus = 'FINANCE_REVIEW';
					{
						// Get all finance officers
						const finOfficers = await prisma.userRole.findMany({ 
							where: { role: { name: 'FINANCE' } }, 
							include: { user: true } 
						});
						
						if (finOfficers.length > 0) {
							// Count pending assignments for each finance officer
							const countsPromises = finOfficers.map(async (uro) => {
								const count = await prisma.request.count({
									where: {
										currentAssigneeId: uro.user.id,
										status: { in: ['FINANCE_REVIEW'] }
									}
								});
								return { userId: uro.user.id, count };
							});
							
							const counts = await Promise.all(countsPromises);
							
							// Find the officer with the fewest pending assignments
							const leastBusy = counts.reduce((min, curr) => (curr.count < min.count ? curr : min));
							nextAssigneeId = leastBusy.userId;
						}
					}
					break;
				case 'FINANCE_REVIEW':
					// Finance approves; mark as FINANCE_APPROVED and assign back to Procurement for dispatch (least-load)
					nextStatus = 'FINANCE_APPROVED';
					{
						const procOfficers = await prisma.userRole.findMany({
							where: { role: { name: 'PROCUREMENT' } },
							include: { user: true }
						});
						if (procOfficers.length > 0) {
							const counts = await Promise.all(procOfficers.map(async (uro) => {
								const count = await prisma.request.count({
									where: {
										currentAssigneeId: uro.user.id,
										status: { in: ['FINANCE_APPROVED'] }
									}
								});
								return { userId: uro.user.id, count };
							}));
							const leastBusy = counts.reduce((min, curr) => (curr.count < min.count ? curr : min));
							nextAssigneeId = leastBusy.userId;
						} else {
							nextAssigneeId = null;
						}
					}
					break;
				default:
					// default to closed/approved
					nextStatus = 'CLOSED';
					nextAssigneeId = null;
			}

			// Apply changes
			await prisma.request.update({ where: { id }, data: { status: nextStatus || request.status, currentAssigneeId: nextAssigneeId } });
			await prisma.requestAction.create({ data: { requestId: id, action: 'APPROVE', comment: comment || '', performedById: actorId } });
			await prisma.requestStatusHistory.create({ data: { requestId: id, status: nextStatus || request.status, changedById: actorId, comment: comment || '' } });

			const updated = await prisma.request.findUnique({ where: { id }, include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true } });
			return res.json(updated);
		}

		// Custom action: SEND_TO_VENDOR — allowed when status is FINANCE_APPROVED by current assignee (Procurement)
		if (action === 'SEND_TO_VENDOR') {
			// require that actor is assignee
			if (!isAssignee) return res.status(403).json({ error: 'only current assignee may send to vendor' });
			if (request.status !== 'FINANCE_APPROVED') return res.status(400).json({ error: 'request must be FINANCE_APPROVED to send to vendor' });

			await prisma.request.update({ where: { id }, data: { status: 'SENT_TO_VENDOR', currentAssigneeId: null } });
			await prisma.requestAction.create({ data: { requestId: id, action: 'SEND_TO_VENDOR', comment: comment || 'Sent to vendor', performedById: actorId } });
			await prisma.requestStatusHistory.create({ data: { requestId: id, status: 'SENT_TO_VENDOR', changedById: actorId, comment: comment || 'Dispatched to vendor' } });

			const updated = await prisma.request.findUnique({ where: { id }, include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true } });
			return res.json(updated);
		}

		res.status(400).json({ error: 'unknown action' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

app.get('/', (req, res) => res.json({ ok: true }));

// Generate a PDF representation of a request
app.get('/requests/:id/pdf', async (req, res) => {
	try {
		const id = Number(req.params.id);
		logPdf('start', { id, query: req.query });
		const request = await prisma.request.findUnique({
			where: { id },
			include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
		});
		if (!request) return res.status(404).json({ error: 'Request not found' });

		const templatePath = path.join(process.cwd(), 'server', 'templates', 'request-pdf.html');
		const tpl = await fs.readFile(templatePath, 'utf8');

		const itemsRows = (request.items || []).map((it, idx) => {
			const qty = Number(it.quantity || 0);
			const unit = Number(it.unitPrice || 0);
			const subtotal = qty * unit;
			const unitFmt = isNaN(unit) ? '' : unit.toFixed(2);
			const subFmt = isNaN(subtotal) ? '' : subtotal.toFixed(2);
			return `<tr><td>${idx + 1}</td><td>${(it.description || '').replace(/</g, '&lt;')}</td><td>${qty}</td><td>${unitFmt}</td><td>${subFmt}</td></tr>`;
		}).join('');

		// Extract approval dates from status history
		const formatDate = (dateStr) => {
			if (!dateStr) return '—';
			try {
				return new Date(dateStr).toLocaleString('en-US', { 
					year: 'numeric', 
					month: 'short', 
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				});
			} catch {
				return String(dateStr);
			}
		};

		const getApprovalDate = (status) => {
			const entry = (request.statusHistory || []).find(h => h.status === status);
			return entry ? formatDate(entry.createdAt) : '—';
		};

		const submittedDate = formatDate(request.submittedAt || request.createdAt);
		const managerApprovalDate = getApprovalDate('DEPARTMENT_REVIEW');
		const hodApprovalDate = getApprovalDate('HOD_REVIEW');
		const procurementApprovalDate = getApprovalDate('PROCUREMENT_REVIEW');
		const financeApprovalDate = getApprovalDate('FINANCE_APPROVED');

		const html = tpl
			.replace(/{{reference}}/g, String(request.reference || request.id))
			.replace(/{{submittedAt}}/g, request.createdAt ? new Date(request.createdAt).toLocaleString() : '')
			.replace(/{{requesterName}}/g, request.requester?.name || '')
			.replace(/{{requesterEmail}}/g, request.requester?.email || '')
			.replace(/{{departmentName}}/g, request.department?.name || '')
			.replace(/{{priority}}/g, String(request.priority || ''))
			.replace(/{{currency}}/g, request.currency || '')
			.replace(/{{totalEstimated}}/g, request.totalEstimated ? String(request.totalEstimated) : '')
			.replace(/{{description}}/g, (request.description || '').replace(/</g, '&lt;'))
			.replace(/{{itemsRows}}/g, itemsRows)
			.replace(/{{managerName}}/g, request.managerName || '')
			.replace(/{{headName}}/g, request.headName || '')
			.replace(/{{budgetOfficerName}}/g, request.budgetOfficerName || '')
			.replace(/{{budgetManagerName}}/g, request.budgetManagerName || '')
			.replace(/{{commitmentNumber}}/g, request.commitmentNumber || '')
			.replace(/{{accountingCode}}/g, request.accountingCode || '')
			.replace(/{{status}}/g, request.status || '')
			.replace(/{{assigneeName}}/g, request.currentAssignee?.name || '')
			.replace(/{{procurementCaseNumber}}/g, request.procurementCaseNumber || '')
			.replace(/{{receivedBy}}/g, request.receivedBy || '')
			.replace(/{{dateReceived}}/g, request.dateReceived || '')
			.replace(/{{actionDate}}/g, request.actionDate || '')
			.replace(/{{procurementComments}}/g, (request.procurementComments || '').replace(/</g, '&lt;'))
			.replace(/{{submittedDate}}/g, submittedDate)
			.replace(/{{managerApprovalDate}}/g, managerApprovalDate)
			.replace(/{{hodApprovalDate}}/g, hodApprovalDate)
			.replace(/{{procurementApprovalDate}}/g, procurementApprovalDate)
			.replace(/{{financeApprovalDate}}/g, financeApprovalDate)
			.replace(/{{now}}/g, new Date().toLocaleString());
		logPdf('html-length', html.length);
e();
				let pdf;
				try {
					await page.setContent(html, { waitUntil: 'load' });
					await page.emulateMediaType('screen');
					pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' } });
				} finally {
					await browser.close().catch(() => {});
				}
				const renderMs = Date.now() - t0;

			res.setHeader('Content-Type', 'application/pdf');
		const filename = `request-${request.reference || request.id}.pdf`;
			// Open inline in the browser (view first), still suggesting a filename
			res.setHeader('Content-Disposition', `inline; filename=\"${filename}\"`);
			// Defensive: ensure we send a valid PDF buffer
			if (!pdf || !pdf.length || pdf.length < 100) {
					logPdf('error:small-buffer', { size: pdf ? pdf.length : 0, renderMs });
				return res.status(500).json({ error: 'PDF generation failed' });
			}
				res.setHeader('X-PDF-Size', String(pdf.length));
				res.setHeader('X-Render-Time', String(renderMs));
				logPdf('rendered', { size: pdf.length, renderMs });
			res.setHeader('Content-Length', String(pdf.length));
			res.status(200).end(pdf);
	} catch (err) {
				logPdf('error', err);
		res.status(500).json({ error: String(err) });
	}
});

// ============================================
// INNOVATION HUB API ROUTES
// ============================================

// Get all ideas with optional filtering
app.get('/api/ideas', async (req, res) => {
	try {
		const { status, sort } = req.query || {};
		
		// Map frontend status values to Prisma enum values
		const statusMap = {
			'pending': 'PENDING_REVIEW',
			'approved': 'APPROVED',
			'rejected': 'REJECTED',
			'draft': 'DRAFT',
			'promoted': 'PROMOTED_TO_PROJECT',
			// Also support direct enum values
			'PENDING_REVIEW': 'PENDING_REVIEW',
			'APPROVED': 'APPROVED',
			'REJECTED': 'REJECTED',
			'DRAFT': 'DRAFT',
			'PROMOTED_TO_PROJECT': 'PROMOTED_TO_PROJECT',
		};
		
		const where = {};
		if (status) {
			const mappedStatus = statusMap[String(status).toLowerCase()] || statusMap[String(status)];
			if (!mappedStatus) {
				console.log('[api/ideas] Invalid status received:', status);
				return res.status(400).json({ error: `Invalid status: ${status}. Valid values: pending, approved, rejected, draft, promoted` });
			}
			where.status = mappedStatus;
			console.log('[api/ideas] Status filter:', status, '→', mappedStatus);
		}
		
		const orderBy = sort === 'popular' || sort === 'popularity' ? { voteCount: 'desc' } : { createdAt: 'desc' };
		console.log('[api/ideas] Query:', { where, orderBy, sort });

		const ideas = await prisma.idea.findMany({
			where,
			orderBy,
			include: { submitter: true, _count: { select: { comments: true } } },
		});

		const payload = ideas.map((i) => ({
			id: i.id,
			title: i.title,
			description: i.description,
			category: i.category,
			status: i.status,
			// Include both submittedById (numeric) and submittedBy (display string) so the frontend can filter reliably
			submittedById: i.submittedBy,
			submittedBy: i.submitter?.name || i.submitter?.email || String(i.submittedBy),
			submittedAt: i.submittedAt,
			reviewedBy: i.reviewedBy,
			reviewedAt: i.reviewedAt,
			reviewNotes: i.reviewNotes,
			promotedAt: i.promotedAt,
			projectCode: i.projectCode,
			voteCount: i.voteCount,
			upvoteCount: i.upvoteCount || 0,
			downvoteCount: i.downvoteCount || 0,
			viewCount: i.viewCount,
			commentCount: i._count?.comments || 0,
			createdAt: i.createdAt,
			updatedAt: i.updatedAt,
		}));

		res.json(payload);
	} catch (err) {
		console.error('GET /api/ideas error:', err);
		res.status(500).json({ error: 'failed to fetch ideas' });
	}
});

// Get a single idea by ID with votes
app.get('/api/ideas/:id', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);

		const idea = await prisma.idea.findUnique({
			where: { id },
			include: {
				submitter: true,
				votes: {
					include: {
						user: {
							select: { id: true, name: true, email: true }
						}
					}
				}
			,
			_count: { select: { comments: true } }
			},
		});

		if (!idea) {
			return res.status(404).json({ error: 'idea not found' });
		}

		// Increment view count
		await prisma.idea.update({
			where: { id },
			data: { viewCount: { increment: 1 } }
		});

		// Check if current user has voted
		const hasVoted = actorId ? idea.votes.some(v => v.userId === actorId) : false;
		const userVote = actorId ? idea.votes.find(v => v.userId === actorId) : null;

		const payload = {
			id: idea.id,
			title: idea.title,
			description: idea.description,
			category: idea.category,
			status: idea.status,
			submittedById: idea.submittedBy,
			submittedBy: idea.submitter?.name || idea.submitter?.email || String(idea.submittedBy),
			submittedAt: idea.submittedAt,
			reviewedBy: idea.reviewedBy,
			reviewedAt: idea.reviewedAt,
			reviewNotes: idea.reviewNotes,
			promotedAt: idea.promotedAt,
			projectCode: idea.projectCode,
			voteCount: idea.voteCount,
			upvoteCount: idea.upvoteCount || 0,
			downvoteCount: idea.downvoteCount || 0,
			viewCount: idea.viewCount + 1, // Return incremented count
			commentCount: idea._count?.comments || 0,
			createdAt: idea.createdAt,
			updatedAt: idea.updatedAt,
			hasVoted,
			userVoteType: userVote?.voteType || null,
			votes: idea.votes.map(v => ({
				id: v.id,
				userId: v.userId,
				userName: v.user.name || v.user.email,
				voteType: v.voteType,
				createdAt: v.createdAt
			}))
		};

		res.json(payload);
	} catch (err) {
		console.error('GET /api/ideas/:id error:', err);
		res.status(500).json({ error: 'failed to fetch idea' });
	}
});

// Submit a new idea
app.post('/api/ideas', async (req, res) => {
	try {
		const actorId = getActingUserId(req);
		const { title, description, category, expectedBenefits, implementationNotes } = req.body || {};
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });
		if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

		// Validate category against enum values; default to OTHER if invalid
		const validCategories = new Set(['PROCESS_IMPROVEMENT','TECHNOLOGY','CUSTOMER_SERVICE','SUSTAINABILITY','COST_REDUCTION','PRODUCT_INNOVATION','OTHER']);
		const cat = validCategories.has(String(category)) ? String(category) : 'OTHER';

		const idea = await prisma.idea.create({
			data: {
				title,
				description,
				category: cat,
				submittedBy: actorId,
				status: 'PENDING_REVIEW',
			},
			include: { submitter: true }
		});

		res.json({
			id: idea.id,
			title: idea.title,
			description: idea.description,
			category: idea.category,
			status: idea.status,
			submittedBy: idea.submitter?.name || idea.submitter?.email || String(idea.submittedBy),
			submittedAt: idea.submittedAt,
			voteCount: idea.voteCount,
			viewCount: idea.viewCount,
			createdAt: idea.createdAt,
			updatedAt: idea.updatedAt,
		});
	} catch (err) {
		console.error('POST /api/ideas error:', err);
		res.status(500).json({ error: 'failed to create idea' });
	}
});

// Approve an idea
app.post('/api/ideas/:id/approve', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);
		const { notes } = req.body || {};

		const idea = await prisma.idea.update({
			where: { id },
			data: { status: 'APPROVED', reviewedBy: actorId, reviewedAt: new Date(), reviewNotes: notes || null },
			include: { submitter: true }
		});
		res.json(idea);
	} catch (err) {
		console.error('POST /api/ideas/:id/approve error:', err);
		res.status(500).json({ error: 'failed to approve idea' });
	}
});

// Reject an idea
app.post('/api/ideas/:id/reject', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);
		const { notes } = req.body || {};

		const idea = await prisma.idea.update({
			where: { id },
			data: { status: 'REJECTED', reviewedBy: actorId, reviewedAt: new Date(), reviewNotes: notes || null },
			include: { submitter: true }
		});
		res.json(idea);
	} catch (err) {
		console.error('POST /api/ideas/:id/reject error:', err);
		res.status(500).json({ error: 'failed to reject idea' });
	}
});

// Promote an idea to project
app.post('/api/ideas/:id/promote', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const { projectCode } = req.body || {};

		const idea = await prisma.idea.update({
			where: { id },
			data: { status: 'PROMOTED_TO_PROJECT', promotedAt: new Date(), projectCode: projectCode || null },
			include: { submitter: true }
		});
		res.json(idea);
	} catch (err) {
		console.error('POST /api/ideas/:id/promote error:', err);
		res.status(500).json({ error: 'failed to promote idea' });
	}
});

// Vote for an idea
app.post('/api/ideas/:id/vote', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);
		const { voteType } = req.body || {};
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });

		const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';

		// Check if already voted
		const existing = await prisma.vote.findUnique({ where: { ideaId_userId: { ideaId: id, userId: actorId } } });
		
		if (existing) {
			// If same vote type, treat as unvote
			if (existing.voteType === type) {
				return res.status(400).json({ error: 'already voted' });
			}
			// If different type, switch the vote
			await prisma.$transaction([
				prisma.vote.update({ where: { id: existing.id }, data: { voteType: type } }),
				prisma.idea.update({
					where: { id },
					data: {
						upvoteCount: type === 'UPVOTE' ? { increment: 1 } : { decrement: 1 },
						downvoteCount: type === 'DOWNVOTE' ? { increment: 1 } : { decrement: 1 },
						voteCount: type === 'UPVOTE' ? { increment: 2 } : { decrement: 2 } // net change of 2 when switching
					}
				}),
			]);
		} else {
			// Create new vote
			await prisma.$transaction([
				prisma.vote.create({ data: { ideaId: id, userId: actorId, voteType: type } }),
				prisma.idea.update({
					where: { id },
					data: {
						voteCount: type === 'UPVOTE' ? { increment: 1 } : { decrement: 1 },
						upvoteCount: type === 'UPVOTE' ? { increment: 1 } : undefined,
						downvoteCount: type === 'DOWNVOTE' ? { increment: 1 } : undefined,
					}
				}),
			]);
		}

		const idea = await prisma.idea.findUnique({
			where: { id },
			include: {
				submitter: true,
				votes: {
					include: {
						user: { select: { id: true, name: true, email: true } }
					}
				},
				_count: { select: { comments: true } }
			}
		});

		const userVote = idea.votes.find(v => v.userId === actorId);
		res.json({
			id: idea.id,
			title: idea.title,
			description: idea.description,
			category: idea.category,
			status: idea.status,
			submittedById: idea.submittedBy,
			submittedBy: idea.submitter?.name || idea.submitter?.email || String(idea.submittedBy),
			submittedAt: idea.submittedAt,
			reviewedBy: idea.reviewedBy,
			reviewedAt: idea.reviewedAt,
			reviewNotes: idea.reviewNotes,
			promotedAt: idea.promotedAt,
			projectCode: idea.projectCode,
			voteCount: idea.voteCount,
			upvoteCount: idea.upvoteCount || 0,
			downvoteCount: idea.downvoteCount || 0,
			viewCount: idea.viewCount,
			commentCount: idea._count?.comments || 0,
			createdAt: idea.createdAt,
			updatedAt: idea.updatedAt,
			hasVoted: !!userVote,
			userVoteType: userVote?.voteType || null,
			votes: idea.votes.map(v => ({
				id: v.id,
				userId: v.userId,
				userName: v.user.name || v.user.email,
				voteType: v.voteType,
				createdAt: v.createdAt
			}))
		});
	} catch (err) {
		console.error('POST /api/ideas/:id/vote error:', err);
		res.status(500).json({ error: 'failed to vote' });
	}
});

// Remove vote from an idea
app.delete('/api/ideas/:id/vote', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });

		const existing = await prisma.vote.findUnique({ where: { ideaId_userId: { ideaId: id, userId: actorId } } });
		if (!existing) return res.status(400).json({ error: 'not voted' });

		const wasUpvote = existing.voteType === 'UPVOTE';

		await prisma.$transaction([
			prisma.vote.delete({ where: { id: existing.id } }),
			prisma.idea.update({
				where: { id },
				data: {
					voteCount: wasUpvote ? { decrement: 1 } : { increment: 1 },
					upvoteCount: wasUpvote ? { decrement: 1 } : undefined,
					downvoteCount: !wasUpvote ? { decrement: 1 } : undefined,
				}
			}),
		]);

		const idea = await prisma.idea.findUnique({
			where: { id },
			include: {
				submitter: true,
				votes: {
					include: {
						user: { select: { id: true, name: true, email: true } }
					}
				},
				_count: { select: { comments: true } }
			}
		});

		res.json({
			id: idea.id,
			title: idea.title,
			description: idea.description,
			category: idea.category,
			status: idea.status,
			submittedById: idea.submittedBy,
			submittedBy: idea.submitter?.name || idea.submitter?.email || String(idea.submittedBy),
			submittedAt: idea.submittedAt,
			reviewedBy: idea.reviewedBy,
			reviewedAt: idea.reviewedAt,
			reviewNotes: idea.reviewNotes,
			promotedAt: idea.promotedAt,
			projectCode: idea.projectCode,
			voteCount: idea.voteCount,
			upvoteCount: idea.upvoteCount || 0,
			downvoteCount: idea.downvoteCount || 0,
			viewCount: idea.viewCount,
			commentCount: idea._count?.comments || 0,
			createdAt: idea.createdAt,
			updatedAt: idea.updatedAt,
			hasVoted: false,
			userVoteType: null,
			votes: idea.votes.map(v => ({
				id: v.id,
				userId: v.userId,
				userName: v.user.name || v.user.email,
				voteType: v.voteType,
				createdAt: v.createdAt
			}))
		});
	} catch (err) {
		console.error('DELETE /api/ideas/:id/vote error:', err);
		res.status(500).json({ error: 'failed to remove vote' });
	}
});

app.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});

