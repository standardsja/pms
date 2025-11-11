#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import bcrypt from 'bcryptjs';
import multer from 'multer';
let sharp = null;
try {
	// optional dependency
	sharp = (await import('sharp')).default;
} catch {}
import sanitizeHtml from 'sanitize-html';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PDF debug logging toggle (default on in non-production, disable with PDF_DEBUG=0)
const PDF_DEBUG = process.env.PDF_DEBUG !== '0' && process.env.NODE_ENV !== 'production';
const logPdf = (...args) => { if (PDF_DEBUG) console.log('[pdf]', ...args); };

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Static files for uploads
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
try {
	await fs.access(UPLOAD_DIR);
} catch {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbs');
try { await fs.mkdir(THUMB_DIR, { recursive: true }); } catch {}

// Multer storage for idea images
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname);
		const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '_');
		cb(null, `idea_${Date.now()}_${base}${ext}`);
	},
});
const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (_req, file, cb) => {
		if (/^image\//.test(file.mimetype)) cb(null, true);
		else cb(new Error('Only image uploads are allowed'));
	},
});

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

// Utility: extract @mentions (simple heuristic). Returns array of usernames (raw) and matched user IDs.
async function extractMentions(prisma, text) {
	if (!text) return { raw: [], userIds: [] };
	const raw = Array.from(new Set(String(text).match(/@[a-zA-Z0-9._-]+/g) || []));
	if (raw.length === 0) return { raw: [], userIds: [] };
	// Attempt to match by exact name (case-insensitive) or email prefix before @
	const cleaned = raw.map(r => r.slice(1));
	const users = await prisma.user.findMany({
		where: {
			OR: [
				{ name: { in: cleaned, mode: 'insensitive' } },
				{ email: { in: cleaned.map(c => c.includes('.') ? c : `${c}%`), mode: 'insensitive' } },
			],
		},
		select: { id: true, name: true, email: true }
	});
	const userIds = users.map(u => u.id);
	return { raw, userIds };
}

// Get all ideas with optional filtering
app.get('/api/ideas', async (req, res) => {
	try {
		const { status, sort, include, category, tag } = req.query || {};
		const includeAttachments = include === 'attachments';
		
		// Get user ID and check if they're committee
		const actorId = getActingUserId(req);
		const userRoles = actorId ? await getRolesForUser(actorId) : [];
		const isCommittee = userRoles.includes('INNOVATION_COMMITTEE');
		
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

		// Parse multi-status: repeated ?status=APPROVED or comma-separated
		const rawStatuses = Array.isArray(status)
			? status
			: typeof status === 'string'
			? status.split(',').map((s) => s.trim()).filter(Boolean)
			: [];
		const mappedStatuses = rawStatuses
			.map((s) => statusMap[s] || statusMap[String(s).toUpperCase()] || statusMap[String(s).toLowerCase()])
			.filter(Boolean);
		
		// IMPORTANT: If user is NOT committee, only show APPROVED ideas
		if (!isCommittee) {
			where.status = 'APPROVED';
			console.log('[api/ideas] Non-committee user - showing only APPROVED ideas');
		} else if (mappedStatuses.length === 1) {
			where.status = mappedStatuses[0];
			console.log('[api/ideas] Committee - Status filter:', rawStatuses, '→', mappedStatuses[0]);
		} else if (mappedStatuses.length > 1) {
			where.status = { in: mappedStatuses };
			console.log('[api/ideas] Committee - Status filter:', rawStatuses, '→', mappedStatuses);
		}

		// Parse categories similarly
		const rawCats = Array.isArray(category)
			? category
			: typeof category === 'string'
			? category.split(',').map((c) => c.trim()).filter(Boolean)
			: [];
		const validCategories = new Set(['PROCESS_IMPROVEMENT','TECHNOLOGY','CUSTOMER_SERVICE','SUSTAINABILITY','COST_REDUCTION','PRODUCT_INNOVATION','OTHER']);
		const mappedCats = rawCats.filter((c) => validCategories.has(String(c)));
		if (mappedCats.length === 1) where.category = mappedCats[0];
		if (mappedCats.length > 1) where.category = { in: mappedCats };

		// Filter by tag (single or multiple)
		const rawTags = Array.isArray(tag)
			? tag
			: typeof tag === 'string'
			? tag.split(',').map((t) => t.trim()).filter(Boolean)
			: [];
		if (rawTags.length) {
			where.tags = { some: { tagId: { in: rawTags.map((x) => Number(x)).filter((n) => Number.isFinite(n)) } } };
		}

		let orderBy = { createdAt: 'desc' };
		if (sort === 'popular' || sort === 'popularity') orderBy = { voteCount: 'desc' };
		if (sort === 'trending') orderBy = [{ voteCount: 'desc' }, { createdAt: 'desc' }];

		console.log('[api/ideas] Query:', { where, orderBy, sort, includeAttachments });
		const ideas = await prisma.idea.findMany({
			where,
			orderBy,
			include: { 
				submitter: true, 
				attachments: includeAttachments, 
				tags: { include: { tag: true } }, 
				challenge: true, 
				votes: actorId ? { where: { userId: actorId } } : false,
				_count: { select: { comments: true } } 
			},
		});
		const payload = ideas.map((i) => {
			// Check if current user has voted
			const userVote = actorId && i.votes ? i.votes.find(v => v.userId === actorId) : null;
			
			return {
				id: i.id,
				title: i.title,
				description: i.description,
				descriptionHtml: i.descriptionHtml || null,
				category: i.category,
				status: i.status,
				stage: i.stage,
				isAnonymous: i.isAnonymous,
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
				hasVoted: !!userVote,
				userVoteType: userVote?.voteType || null,
				challenge: i.challenge ? { id: i.challenge.id, title: i.challenge.title } : null,
				tags: (i.tags || []).map(it => ({ id: it.tag.id, name: it.tag.name })),
				createdAt: i.createdAt,
				updatedAt: i.updatedAt,
				...(includeAttachments && {
					attachments: i.attachments,
					firstAttachmentUrl: i.attachments?.[0]?.fileUrl || null,
				}),
			};
		});
		res.json(payload);
	} catch (err) {
		console.error('GET /api/ideas error:', err);
		res.status(500).json({ error: 'Unable to load ideas', message: 'Unable to load ideas. Please try again later.' });
	}
});

// Get a single idea by ID with votes
app.get('/api/ideas/:id', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);
		const includeAttachments = req.query.include === 'attachments';

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
				},
				attachments: includeAttachments,
				tags: { include: { tag: true } },
				challenge: true,
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
			descriptionHtml: idea.descriptionHtml || null,
			category: idea.category,
			status: idea.status,
			stage: idea.stage,
			isAnonymous: idea.isAnonymous,
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
			challenge: idea.challenge ? { id: idea.challenge.id, title: idea.challenge.title } : null,
			tags: (idea.tags || []).map(it => ({ id: it.tag.id, name: it.tag.name })),
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
			})),
			...(includeAttachments && idea.attachments && {
				attachments: idea.attachments.map(a => ({
					id: a.id,
					fileName: a.fileName,
					fileUrl: a.fileUrl,
					fileSize: a.fileSize,
					mimeType: a.mimeType,
					uploadedAt: a.uploadedAt
				}))
			})
		};

		res.json(payload);
	} catch (err) {
		console.error('GET /api/ideas/:id error:', err);
		res.status(500).json({ error: 'Unable to load idea', message: 'Unable to load idea details. Please try again later.' });
	}
});

// Submit a new idea
// Multi-file upload: accept legacy single image (field 'image') and new 'files' array (max 5)
app.post('/api/ideas', upload.fields([{ name: 'files', maxCount: 5 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
	try {
		const actorId = getActingUserId(req);
		const { title, description, descriptionHtml, category, expectedBenefits, implementationNotes, isAnonymous, challengeId } = req.body || {};
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });
		if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

		// Sanitize optional HTML, and keep plain text
		let safeHtml = null;
		if (descriptionHtml) {
			safeHtml = sanitizeHtml(String(descriptionHtml), {
				allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img','h1','h2','h3','u','s','ins']),
				allowedAttributes: {
					...sanitizeHtml.defaults.allowedAttributes,
					img: ['src','alt','title','width','height'],
					a: ['href','name','target','rel'],
				},
				allowedSchemes: ['http','https','data','mailto'],
				allowProtocolRelative: false,
				transformTags: {
					a: (tagName, attribs) => ({
						tagName: 'a',
						attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' }
					}),
				},
			});
		}

		// Validate category against enum values; default to OTHER if invalid
		const validCategories = new Set(['PROCESS_IMPROVEMENT','TECHNOLOGY','CUSTOMER_SERVICE','SUSTAINABILITY','COST_REDUCTION','PRODUCT_INNOVATION','OTHER']);
		const cat = validCategories.has(String(category)) ? String(category) : 'OTHER';

		const idea = await prisma.idea.create({
			data: {
				title,
				description,
				descriptionHtml: safeHtml,
				category: cat,
				submittedBy: actorId,
				status: 'PENDING_REVIEW',
				isAnonymous: Boolean(isAnonymous),
				challengeId: challengeId ? Number(challengeId) : null,
			},
			include: { submitter: true }
		});

		// Gather uploaded files (new multi-files or legacy single image)
		const uploadedFiles = [];
		const filesField = req.files?.files;
		const legacyImageField = req.files?.image;
		if (Array.isArray(filesField)) uploadedFiles.push(...filesField);
		if (Array.isArray(legacyImageField)) uploadedFiles.push(...legacyImageField);

		for (const f of uploadedFiles) {
			const fileUrl = `/uploads/${f.filename}`;
			try {
				await prisma.ideaAttachment.create({
					data: {
						ideaId: idea.id,
						fileName: f.originalname,
						fileUrl,
						fileSize: f.size,
						mimeType: f.mimetype,
					},
				});
			} catch (createErr) {
				console.error('[attachments] Failed to persist attachment:', createErr);
			}

			// Optional thumbnail generation for images
			if (sharp && f.mimetype && f.mimetype.startsWith('image/')) {
				try {
					const inputPath = path.join(UPLOAD_DIR, f.filename);
					const thumbName = `thumb_${f.filename}`;
					const outPath = path.join(THUMB_DIR, thumbName);
					await sharp(inputPath).resize({ width: 480 }).jpeg({ quality: 80 }).toFile(outPath);
				} catch (thumbErr) {
					console.warn('[thumbs] generation failed:', thumbErr?.message);
				}
			}
		}

		// Tags assignment: accept tagIds (comma-separated) or tags[] fields
		const tagIds = [];
		const body = req.body || {};
		if (Array.isArray(body.tagIds)) {
			for (const v of body.tagIds) {
				const n = Number(v); if (Number.isFinite(n)) tagIds.push(n);
			}
		} else if (typeof body.tagIds === 'string') {
			for (const part of String(body.tagIds).split(',').map(s => s.trim())) {
				const n = Number(part); if (Number.isFinite(n)) tagIds.push(n);
			}
		}
		if (tagIds.length) {
			await prisma.$transaction(tagIds.map((tid) => prisma.ideaTag.upsert({
				where: { ideaId_tagId: { ideaId: idea.id, tagId: tid } },
				update: {},
				create: { ideaId: idea.id, tagId: tid },
			})));
			// Audit log
			await prisma.auditLog.create({ data: { ideaId: idea.id, userId: actorId, action: 'TAGS_UPDATED', message: `Tags set: ${tagIds.join(',')}` } });
		}

		// Reload with attachments
		const created = await prisma.idea.findUnique({
			where: { id: idea.id },
			include: { submitter: true, attachments: true, tags: { include: { tag: true } }, challenge: true }
		});

		res.json({
			id: created.id,
			title: created.title,
			description: created.description,
			descriptionHtml: created.descriptionHtml || null,
			category: created.category,
			status: created.status,
			stage: created.stage,
			isAnonymous: created.isAnonymous,
			submittedBy: created.submitter?.name || created.submitter?.email || String(created.submittedBy),
			submittedAt: created.submittedAt,
			voteCount: created.voteCount,
			viewCount: created.viewCount,
			createdAt: created.createdAt,
			updatedAt: created.updatedAt,
			attachments: created.attachments,
			challenge: created.challenge ? { id: created.challenge.id, title: created.challenge.title } : null,
			tags: (created.tags || []).map(it => ({ id: it.tag.id, name: it.tag.name })),
		});
	} catch (err) {
		console.error('POST /api/ideas error:', err);
		res.status(500).json({ error: 'failed to create idea', details: err?.message });
	}
});

// Duplicate detection: naive similarity on title+description
app.post('/api/ideas/check-duplicates', async (req, res) => {
	try {
		const { title, description } = req.body || {};
		if (!title && !description) return res.status(400).json({ error: 'title or description required' });

		// Fetch recent ideas to compare against (limit 200 for performance)
		const ideas = await prisma.idea.findMany({
			orderBy: { createdAt: 'desc' },
			take: 200,
			include: { submitter: true },
		});

		const textA = `${title || ''} ${description || ''}`.toLowerCase();
		const tokensA = new Set(textA.split(/[^a-z0-9]+/).filter(Boolean));

		const scored = ideas.map((i) => {
			const textB = `${i.title} ${i.description}`.toLowerCase();
			const tokensB = new Set(textB.split(/[^a-z0-9]+/).filter(Boolean));
			let inter = 0;
			for (const tok of tokensA) if (tokensB.has(tok)) inter++;
			const union = tokensA.size + tokensB.size - inter || 1;
			const jaccard = inter / union;
			return { id: i.id, title: i.title, snippet: i.description.slice(0, 180), score: jaccard, submittedAt: i.createdAt };
		}).filter(x => x.score > 0.25) // only keep somewhat similar
		  .sort((a, b) => b.score - a.score)
		  .slice(0, 5);

		res.json({ matches: scored });
	} catch (err) {
		console.error('POST /api/ideas/check-duplicates error:', err);
		res.status(500).json({ error: 'failed to check duplicates' });
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
		
		// If creating a new vote (not switching), check the 10-vote limit
		if (!existing) {
			const userVoteCount = await prisma.vote.count({ where: { userId: actorId } });
			if (userVoteCount >= 10) {
				return res.status(400).json({ error: 'vote limit reached', message: 'You can only vote on up to 10 ideas. Remove a vote to vote on this idea.' });
			}
		}
		
		if (existing) {
			// If same vote type, remove the vote (toggle behavior)
			if (existing.voteType === type) {
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
			} else {
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
			}
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
		res.status(500).json({ error: 'Unable to vote', message: 'We were unable to process your vote. Please try again.' });
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
		res.status(500).json({ error: 'Unable to remove vote', message: 'We were unable to remove your vote. Please try again.' });
	}
});

// Lightweight user search for mentions (no schema changes required)
app.get('/api/users', async (req, res) => {
	try {
		const { search, take } = req.query || {};
		const where = search ? {
			OR: [
				{ name: { contains: String(search), mode: 'insensitive' } },
				{ email: { contains: String(search), mode: 'insensitive' } },
			]
		} : {};
		const users = await prisma.user.findMany({
			where,
			orderBy: { name: 'asc' },
			take: Math.min(Number(take) || 10, 50),
			select: { id: true, name: true, email: true }
		});
		res.json(users.map(u => ({ id: u.id, name: u.name || u.email, email: u.email })));
	} catch (err) {
		console.error('GET /api/users error:', err);
		res.status(500).json({ error: 'failed to list users' });
	}
});

// Related ideas based on Jaccard similarity of title+description
app.get('/api/ideas/:id/related', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const base = await prisma.idea.findUnique({ where: { id }, select: { id: true, title: true, description: true } });
		if (!base) return res.status(404).json({ error: 'idea not found' });
		const others = await prisma.idea.findMany({
			where: { id: { not: id }, status: { in: ['PENDING_REVIEW','APPROVED','PROMOTED_TO_PROJECT'] } },
			orderBy: { createdAt: 'desc' },
			take: 250,
			include: { attachments: true }
		});
		const tokens = (s) => new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
		const A = tokens(`${base.title} ${base.description}`);
		const scored = others.map(o => {
			const B = tokens(`${o.title} ${o.description}`);
			let inter = 0; for (const t of A) if (B.has(t)) inter++;
			const union = A.size + B.size - inter || 1;
			const score = inter / union;
			return {
				id: o.id,
				title: o.title,
				snippet: String(o.description || '').slice(0, 160),
				score,
				firstAttachmentUrl: o.attachments?.[0]?.fileUrl || null,
			};
		}).filter(x => x.score > 0.15)
		  .sort((a,b) => b.score - a.score)
		  .slice(0, 5);
		res.json({ related: scored });
	} catch (err) {
		console.error('GET /api/ideas/:id/related error:', err);
		res.status(500).json({ error: 'failed to fetch related ideas' });
	}
});

// Leaderboard — compute from existing aggregates (no schema change)
app.get('/api/leaderboard', async (_req, res) => {
	try {
		// Gather users with counts
		const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
		const [ideasByUser, upvotesByIdea, commentsByUser] = await Promise.all([
			prisma.idea.groupBy({ by: ['submittedBy'], _count: { _all: true } }),
			prisma.idea.findMany({ select: { id: true, submittedBy: true, upvoteCount: true } }),
			prisma.ideaComment.groupBy({ by: ['userId'], _count: { _all: true } })
		]);
		const ideasMap = new Map(ideasByUser.map(r => [r.submittedBy, r._count._all]));
		const upvoteMap = new Map();
		for (const i of upvotesByIdea) {
			upvoteMap.set(i.submittedBy, (upvoteMap.get(i.submittedBy) || 0) + (i.upvoteCount || 0));
		}
		const commentsMap = new Map(commentsByUser.map(r => [r.userId, r._count._all]));
		const rows = users.map(u => {
			const ideaCount = ideasMap.get(u.id) || 0;
			const upvotes = upvoteMap.get(u.id) || 0;
			const comments = commentsMap.get(u.id) || 0;
			const points = ideaCount * 5 + upvotes * 1 + comments * 2;
			const badge = points >= 200 ? 'Platinum' : points >= 100 ? 'Gold' : points >= 50 ? 'Silver' : points >= 25 ? 'Bronze' : null;
			return { userId: u.id, name: u.name || u.email, email: u.email, ideaCount, upvotes, comments, points, badge };
		}).sort((a,b) => b.points - a.points).slice(0, 50);
		res.json({ leaderboard: rows });
	} catch (err) {
		console.error('GET /api/leaderboard error:', err);
		res.status(500).json({ error: 'failed to compute leaderboard' });
	}
});
// ============================================
// Threaded Comments (Idea Comments)
// ============================================

// List comments for an idea (flat with parentId; client can build tree)
app.get('/api/ideas/:id/comments', async (req, res) => {
	try {
		const ideaId = Number(req.params.id);
		if (!Number.isFinite(ideaId)) return res.status(400).json({ error: 'invalid idea id' });
		const comments = await prisma.ideaComment.findMany({
			where: { ideaId },
			orderBy: { createdAt: 'asc' },
			include: { user: { select: { id: true, name: true, email: true } } }
		});
		res.json(comments.map(c => ({
			id: c.id,
			ideaId: c.ideaId,
			userId: c.userId,
			userName: c.user.name || c.user.email,
			text: c.text,
			parentId: c.parentId || null,
			createdAt: c.createdAt,
			updatedAt: c.updatedAt,
		})));
	} catch (err) {
		console.error('GET /api/ideas/:id/comments error:', err);
		res.status(500).json({ error: 'Unable to load comments', message: 'Unable to load comments. Please try again.' });
	}
});

// Create a comment (optional parentId for threading)
app.post('/api/ideas/:id/comments', async (req, res) => {
	try {
		const ideaId = Number(req.params.id);
		const actorId = getActingUserId(req);
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });
		const { text, parentId } = req.body || {};
		if (!text || !String(text).trim()) return res.status(400).json({ error: 'text required' });
		// Basic existence check
		const idea = await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
		if (!idea) return res.status(404).json({ error: 'idea not found' });
		if (parentId) {
			const parent = await prisma.ideaComment.findUnique({ where: { id: Number(parentId) }, select: { id: true, ideaId: true } });
			if (!parent || parent.ideaId !== ideaId) return res.status(400).json({ error: 'invalid parentId' });
		}
		// Sanitize text (strip dangerous HTML if any)
		const safeText = sanitizeHtml(String(text), { allowedTags: [], allowedAttributes: {} });
		const mentions = await extractMentions(prisma, safeText);
		const created = await prisma.ideaComment.create({
			data: { ideaId, userId: actorId, text: safeText, parentId: parentId ? Number(parentId) : null },
			include: { user: { select: { id: true, name: true, email: true } } }
		});
		// Audit log
		await prisma.auditLog.create({ data: { ideaId, userId: actorId, action: 'COMMENT_CREATED', message: 'Comment added' } });
		// Notifications for mentions
		if (mentions.userIds && mentions.userIds.length) {
			await prisma.$transaction(mentions.userIds.map(uid => prisma.notification.create({
				data: {
					userId: uid,
					type: 'MENTION',
					message: `You were mentioned in idea #${ideaId}`,
					data: { ideaId, commentId: created.id }
				}
			})));
		}
		// TODO: Notifications (Task 28) — create notification records for mentions.userIds
		res.status(201).json({
			id: created.id,
			ideaId: created.ideaId,
			userId: created.userId,
			userName: created.user.name || created.user.email,
			text: created.text,
			parentId: created.parentId || null,
			createdAt: created.createdAt,
			updatedAt: created.updatedAt,
			mentions: mentions.raw,
			mentionUserIds: mentions.userIds,
		});
	} catch (err) {
		console.error('POST /api/ideas/:id/comments error:', err);
		res.status(500).json({ error: 'failed to create comment' });
	}
});

// Tags
app.get('/api/tags', async (_req, res) => {
	try {
		const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
		res.json(tags);
	} catch (err) { res.status(500).json({ error: 'failed to list tags' }); }
});
app.post('/api/tags', async (req, res) => {
	try {
		const { name } = req.body || {};
		if (!name) return res.status(400).json({ error: 'name required' });
		const tag = await prisma.tag.create({ data: { name: String(name) } });
		res.status(201).json(tag);
	} catch (err) { res.status(500).json({ error: 'failed to create tag' }); }
});

// Challenges
app.get('/api/challenges', async (_req, res) => {
	try {
		const list = await prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
		res.json(list);
	} catch (err) { res.status(500).json({ error: 'failed to list challenges' }); }
});
app.get('/api/challenges/:id', async (req, res) => {
	try {
		const id = Number(req.params.id);
		const ch = await prisma.challenge.findUnique({ where: { id }, include: { ideas: true } });
		if (!ch) return res.status(404).json({ error: 'challenge not found' });
		res.json(ch);
	} catch (err) { res.status(500).json({ error: 'failed to load challenge' }); }
});

// Stage transitions
app.get('/api/ideas/:id/stage-history', async (req, res) => {
	try {
		const ideaId = Number(req.params.id);
		const rows = await prisma.ideaStageHistory.findMany({ where: { ideaId }, orderBy: { createdAt: 'asc' } });
		res.json(rows);
	} catch (err) { res.status(500).json({ error: 'failed to list stage history' }); }
});
app.post('/api/ideas/:id/stage-transition', async (req, res) => {
	try {
		const ideaId = Number(req.params.id);
		const actorId = getActingUserId(req);
		const { toStage, note } = req.body || {};
		if (!toStage) return res.status(400).json({ error: 'toStage required' });
		const current = await prisma.idea.findUnique({ where: { id: ideaId }, select: { stage: true } });
		if (!current) return res.status(404).json({ error: 'idea not found' });
		await prisma.$transaction([
			prisma.idea.update({ where: { id: ideaId }, data: { stage: toStage } }),
			prisma.ideaStageHistory.create({ data: { ideaId, fromStage: current.stage, toStage, note: note || null, userId: actorId || null } }),
			prisma.auditLog.create({ data: { ideaId, userId: actorId || null, action: 'STAGE_CHANGED', message: `Stage → ${toStage}`, metadata: { note } } }),
		]);
		res.json({ ok: true });
	} catch (err) { res.status(500).json({ error: 'failed to transition stage' }); }
});

// Audit log
app.get('/api/ideas/:id/audit', async (req, res) => {
	try {
		const ideaId = Number(req.params.id);
		const rows = await prisma.auditLog.findMany({ where: { ideaId }, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } });
		res.json(rows.map(r => ({ id: r.id, action: r.action, message: r.message, createdAt: r.createdAt, userName: r.user?.name || r.user?.email || '—', metadata: r.metadata })));
	} catch (err) { res.status(500).json({ error: 'failed to fetch audit' }); }
});

// Notifications
app.get('/api/notifications', async (req, res) => {
	try {
		const userId = getActingUserId(req);
		if (!userId) return res.status(400).json({ error: 'x-user-id header required' });
		const rows = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
		res.json(rows);
	} catch (err) { res.status(500).json({ error: 'failed to list notifications' }); }
});
app.post('/api/notifications/:id/read', async (req, res) => {
	try {
		const id = Number(req.params.id);
		await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
		res.json({ ok: true });
	} catch (err) { res.status(500).json({ error: 'failed to mark read' }); }
});

// Full-text like search (naive)
app.get('/api/ideas/search', async (req, res) => {
	try {
		const q = String(req.query.q || '').trim();
		if (!q) return res.json({ results: [] });
		const ideas = await prisma.idea.findMany({
			where: {
				OR: [
					{ title: { contains: q, mode: 'insensitive' } },
					{ description: { contains: q, mode: 'insensitive' } },
				]
			},
			orderBy: { createdAt: 'desc' },
			take: 50,
			include: { attachments: true }
		});
		res.json({ results: ideas.map(i => ({ id: i.id, title: i.title, snippet: String(i.description || '').slice(0, 180), firstAttachmentUrl: i.attachments?.[0]?.fileUrl || null })) });
	} catch (err) { res.status(500).json({ error: 'failed to search' }); }
});

// Innovation dashboard aggregates
app.get('/api/innovation/stats', async (_req, res) => {
	try {
		const [byStatus, byCategory, byStage, totalIdeas] = await Promise.all([
			prisma.idea.groupBy({ by: ['status'], _count: { _all: true } }),
			prisma.idea.groupBy({ by: ['category'], _count: { _all: true } }),
			prisma.idea.groupBy({ by: ['stage'], _count: { _all: true } }),
			prisma.idea.count(),
		]);
		res.json({
			totalIdeas,
			byStatus: byStatus.map(r => ({ status: r.status, count: r._count._all })),
			byCategory: byCategory.map(r => ({ category: r.category, count: r._count._all })),
			byStage: byStage.map(r => ({ stage: r.stage, count: r._count._all })),
		});
	} catch (err) { res.status(500).json({ error: 'failed to compute stats' }); }
});

// Innovation analytics - comprehensive metrics for committee dashboard
app.get('/api/innovation/analytics', async (_req, res) => {
	try {
		// Get all ideas with votes and comments count
		const ideas = await prisma.idea.findMany({
			include: {
				votes: true,
				_count: { select: { comments: true } }
			}
		});

		// Calculate KPIs
		const totalIdeas = ideas.length;
		const underReview = ideas.filter(i => i.status === 'PENDING_REVIEW').length;
		const approved = ideas.filter(i => i.status === 'APPROVED').length;
		const totalVotes = ideas.reduce((sum, i) => sum + i.votes.length, 0);
		const totalComments = ideas.reduce((sum, i) => sum + (i._count?.comments || 0), 0);
		const totalEngagement = totalVotes + totalComments;

		// Submissions by month (last 12 months)
		const monthlySubmissions = Array(12).fill(0);
		const now = new Date();
		ideas.forEach(idea => {
			const createdAt = new Date(idea.createdAt);
			const monthsDiff = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth());
			if (monthsDiff >= 0 && monthsDiff < 12) {
				monthlySubmissions[11 - monthsDiff]++;
			}
		});

		// Ideas by category
		const categoryMap = {};
		ideas.forEach(idea => {
			categoryMap[idea.category] = (categoryMap[idea.category] || 0) + 1;
		});

		// Status pipeline
		const statusPipeline = {
			submitted: ideas.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'DRAFT').length,
			underReview: ideas.filter(i => i.status === 'PENDING_REVIEW').length,
			approved: ideas.filter(i => i.status === 'APPROVED').length,
			rejected: ideas.filter(i => i.status === 'REJECTED').length,
			promoted: ideas.filter(i => i.status === 'PROMOTED_TO_PROJECT').length,
		};

		// Top contributors
		const submitterMap = {};
		ideas.forEach(idea => {
			const submitter = idea.submittedBy || 'Unknown';
			if (!submitterMap[submitter]) {
				submitterMap[submitter] = { name: submitter, ideas: 0, votes: 0 };
			}
			submitterMap[submitter].ideas++;
			submitterMap[submitter].votes += idea.votes.length;
		});
		const topContributors = Object.values(submitterMap)
			.sort((a, b) => b.ideas - a.ideas)
			.slice(0, 5);

		// Weekly engagement (last 8 weeks)
		const weeklyViews = Array(8).fill(0);
		const weeklyVotes = Array(8).fill(0);
		const weeksAgo = 8;
		const msPerWeek = 7 * 24 * 60 * 60 * 1000;
		
		ideas.forEach(idea => {
			const createdAt = new Date(idea.createdAt).getTime();
			const weeksDiff = Math.floor((now.getTime() - createdAt) / msPerWeek);
			if (weeksDiff >= 0 && weeksDiff < weeksAgo) {
				const index = weeksAgo - 1 - weeksDiff;
				weeklyViews[index] += idea.viewCount || 0;
				weeklyVotes[index] += idea.votes.length;
			}
		});

		res.json({
			kpis: {
				totalIdeas,
				underReview,
				approved,
				promoted: statusPipeline.promoted,
				totalEngagement,
			},
			submissionsByMonth: monthlySubmissions,
			ideasByCategory: categoryMap,
			statusPipeline,
			topContributors,
			weeklyEngagement: {
				views: weeklyViews,
				votes: weeklyVotes,
			}
		});
	} catch (err) {
		console.error('GET /api/innovation/analytics error:', err);
		res.status(500).json({ error: 'Unable to compute analytics', message: 'Unable to load analytics data. Please try again later.' });
	}
});

// Delete a comment (owner-only for now; later extend to moderators/admin roles)
app.delete('/api/ideas/comments/:commentId', async (req, res) => {
	try {
		const commentId = Number(req.params.commentId);
		const actorId = getActingUserId(req);
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });
		const comment = await prisma.ideaComment.findUnique({ where: { id: commentId } });
		if (!comment) return res.status(404).json({ error: 'comment not found' });
		if (comment.userId !== actorId) return res.status(403).json({ error: 'not allowed to delete this comment' });
		await prisma.ideaComment.delete({ where: { id: commentId } });
		res.json({ ok: true });
	} catch (err) {
		console.error('DELETE /api/ideas/comments/:commentId error:', err);
		res.status(500).json({ error: 'failed to delete comment' });
	}
});

app.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});

