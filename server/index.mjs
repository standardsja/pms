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
async function handleLogin(req, res) {
	const { email, password } = req.body || {};
	if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

	// Fallback users for when database is unavailable
	const fallbackUsers = {
		'committee@bsj.gov.jm': { id: 14, password: 'Passw0rd!', name: 'Innovation Committee', roles: ['INNOVATION_COMMITTEE'] },
		'test1@bsj.gov.jm': { id: 38, password: 'Passw0rd!', name: 'Test User 1', roles: ['USER'] },
		'test2@bsj.gov.jm': { id: 39, password: 'Passw0rd!', name: 'Test User 2', roles: ['USER'] },
	};

	try {
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
			include: {
				department: true,
				roles: { include: { role: true } },
			},
		});
		
		if (user && user.passwordHash) {
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
		}
		
		// Fallback to hardcoded users if database user not found or no password
		const fallback = fallbackUsers[email.toLowerCase().trim()];
		if (fallback && fallback.password === password) {
			const token = Buffer.from(`fb-${fallback.id}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`).toString('base64');
			return res.json({
				token,
				user: {
					id: fallback.id,
					email,
					name: fallback.name,
					roles: fallback.roles,
					department: null,
				}
			});
		}
		
		return res.status(401).json({ message: 'Invalid credentials' });
	} catch (err) {
		console.error('[Login] Database error, trying fallback users:', err.message);
		
		// If database error, try fallback users
		const fallback = fallbackUsers[email.toLowerCase().trim()];
		if (fallback && fallback.password === password) {
			const token = Buffer.from(`fb-${fallback.id}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`).toString('base64');
			return res.json({
				token,
				user: {
					id: fallback.id,
					email,
					name: fallback.name,
					roles: fallback.roles,
					department: null,
				}
			});
		}
		
		return res.status(500).json({ message: 'Login service unavailable. Please try again later.' });
	}
}

// Mount login handler on both routes for compatibility
app.post('/auth/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// DB health check endpoint
app.get('/api/db/health', async (req, res) => {
	const started = Date.now();
	try {
		// Simple queries to validate connectivity and basic tables
		const [userCount, ideaCount, voteCount] = await Promise.all([
			prisma.user.count(),
			prisma.idea.count().catch(() => null),
			prisma.vote.count().catch(() => null),
		]);

		const sampleUser = await prisma.user.findFirst({ select: { id: true, email: true } });
		res.json({
			status: 'PASS',
			durationMs: Date.now() - started,
			dbUrlRedacted: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:(?:[^:@]*?)@/, ':***@') : null,
			userCount,
			ideaCount,
			voteCount,
			sampleUser,
			serverTime: new Date().toISOString(),
		});
	} catch (err) {
		console.error('[DB Health] Error:', err);
		res.status(500).json({
			status: 'FAIL',
			durationMs: Date.now() - started,
			error: err.message,
		});
	}
});

// Debug endpoint to check current user
app.get('/api/auth/me', async (req, res) => {
	try {
		const actorId = getActingUserId(req);
		if (!actorId) {
			return res.status(401).json({ error: 'Not authenticated', userId: null });
		}
		
		const user = await prisma.user.findUnique({ 
			where: { id: actorId },
			select: { id: true, email: true, name: true }
		});
		
		if (!user) {
			return res.json({ 
				error: 'User ID from header exists but not found in database', 
				userIdFromHeader: actorId,
				userExists: false 
			});
		}
		
		res.json({ user, userExists: true });
	} catch (err) {
		console.error('GET /api/auth/me error:', err);
		res.status(500).json({ error: 'Server error', details: err.message });
	}
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /admin/users - List all users with their roles
app.get('/admin/users', async (req, res) => {
	try {
		const users = await prisma.user.findMany({
			include: {
				roles: {
					include: {
						role: true
					}
				},
				department: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		});
		
		// Transform to include role names
		const usersWithRoles = users.map(user => ({
			id: user.id,
			email: user.email,
			name: user.name,
			departmentId: user.departmentId,
			department: user.department,
			roles: user.roles.map(ur => ur.role.name),
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		}));
		
		res.json(usersWithRoles);
	} catch (err) {
		console.error('[GET /admin/users]', err);
		res.status(500).json({ error: String(err) });
	}
});

// ============================================
// REQUEST ENDPOINTS
// ============================================

// List requests with simple filters
app.get('/requests', async (req, res) => {
	try {
		const { assignee, requester, status, departmentId } = req.query;
		const where = {};
		if (assignee) where.currentAssigneeId = Number(assignee);
		if (requester) where.requesterId = Number(requester);
		if (status && status.trim()) {
			// Validate that status is a valid RequestStatus enum value
			const validStatuses = [
				'DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'DEPARTMENT_RETURNED',
				'DEPARTMENT_APPROVED', 'HOD_REVIEW', 'PROCUREMENT_REVIEW', 
				'FINANCE_REVIEW', 'FINANCE_RETURNED', 'FINANCE_APPROVED',
				'SENT_TO_VENDOR', 'CLOSED', 'REJECTED'
			];
			const statusStr = String(status).trim().toUpperCase();
			if (validStatuses.includes(statusStr)) {
				where.status = statusStr;
			}
		}
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

		// Dynamically compute up/down vote counts from Vote table to avoid stale columns
		const ideaIds = ideas.map(i => i.id);
		let computedCounts = {};
		if (ideaIds.length) {
			// groupBy returns counts per ideaId + voteType
			const grouped = await prisma.vote.groupBy({
				by: ['ideaId', 'voteType'],
				where: { ideaId: { in: ideaIds } },
				_count: { voteType: true }
			});
			for (const g of grouped) {
				const cur = computedCounts[g.ideaId] || { up: 0, down: 0 };
				if (g.voteType === 'UPVOTE') cur.up = g._count.voteType; else cur.down = g._count.voteType;
				computedCounts[g.ideaId] = cur;
			}
		}

		// Optional lazy backfill: if stored counts differ from computed, update in background (fire and forget)
		Promise.resolve().then(async () => {
			try {
				for (const i of ideas) {
					const comp = computedCounts[i.id] || { up: 0, down: 0 };
					const expectedScore = comp.up - comp.down;
					if (i.upvoteCount !== comp.up || i.downvoteCount !== comp.down || i.voteCount !== expectedScore) {
						await prisma.idea.update({
							where: { id: i.id },
							data: { upvoteCount: comp.up, downvoteCount: comp.down, voteCount: expectedScore }
						});
					}
				}
			} catch (e) {
				console.warn('[api/ideas] lazy backfill failed:', e?.message);
			}
		});

		const payload = ideas.map((i) => {
			const comp = computedCounts[i.id] || null;
			let up = comp?.up ?? (i.upvoteCount || 0);
			let down = comp?.down ?? (i.downvoteCount || 0);
			// If both are zero but score exists (legacy data), infer counts from score
			if ((up === 0 && down === 0) && i.voteCount) {
				if (i.voteCount > 0) up = i.voteCount; else down = Math.abs(i.voteCount);
			}

			return {
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
			voteCount: up - down,
			upvoteCount: up,
			downvoteCount: down,
			viewCount: i.viewCount,
			commentCount: i._count?.comments || 0,
			createdAt: i.createdAt,
			updatedAt: i.updatedAt,
			};
		});

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
		console.log('[Vote] Request received:', { ideaId: req.params.id, body: req.body, userId: getActingUserId(req) });
		const id = Number(req.params.id);
		const actorId = getActingUserId(req);
		const { voteType } = req.body || {};
		if (!actorId) return res.status(400).json({ error: 'x-user-id header required' });

		// Check if user exists in database (handle fallback auth users)
		const userExists = await prisma.user.findUnique({ where: { id: actorId } });
		if (!userExists) {
			console.error(`[Vote] User ${actorId} does not exist in database`);
			return res.status(400).json({ error: 'User not found. Please log in with a valid account.' });
		}
		console.log('[Vote] User exists:', userExists.email);

		const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';
		console.log('[Vote] Vote type:', type);

		// Check if already voted
		const existing = await prisma.vote.findUnique({ where: { ideaId_userId: { ideaId: id, userId: actorId } } });
		console.log('[Vote] Existing vote:', existing);
		
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
						...(type === 'UPVOTE' ? { upvoteCount: { increment: 1 } } : { downvoteCount: { increment: 1 } }),
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
		console.error('Error details:', err.message);
		console.error('Error stack:', err.stack);
		res.status(500).json({ error: 'failed to vote', details: err.message });
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

// Innovation Hub Analytics endpoint
app.get('/api/innovation/analytics', async (req, res) => {
	try {
		// Total counts by status
		const statusCounts = await prisma.idea.groupBy({
			by: ['status'],
			_count: { status: true }
		});
		
		// Category breakdown
		const categoryBreakdown = await prisma.idea.groupBy({
			by: ['category'],
			_count: { category: true }
		});
		
		// Top contributors
		const topContributors = await prisma.idea.groupBy({
			by: ['submittedBy'],
			_count: { submittedBy: true },
			orderBy: { _count: { submittedBy: 'desc' } },
			take: 5
		});
		
		// Get user names for top contributors
		const contributorIds = topContributors.map(c => c.submittedBy);
		const users = await prisma.user.findMany({
			where: { id: { in: contributorIds } },
			select: { id: true, name: true, email: true }
		});
		
		const contributorsWithNames = topContributors.map(c => {
			const user = users.find(u => u.id === c.submittedBy);
			return {
				name: user?.name || user?.email || `User ${c.submittedBy}`,
				count: c._count.submittedBy
			};
		});
		
		// Submissions by month (last 12 months)
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
		
		const allIdeas = await prisma.idea.findMany({
			where: { submittedAt: { gte: twelveMonthsAgo } },
			select: { submittedAt: true }
		});
		
		const monthlySubmissions = Array(12).fill(0);
		const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		const currentMonth = new Date().getMonth();
		
		allIdeas.forEach(idea => {
			const monthDiff = Math.floor((new Date().getTime() - new Date(idea.submittedAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
			if (monthDiff < 12) {
				const index = 11 - monthDiff;
				if (index >= 0 && index < 12) monthlySubmissions[index]++;
			}
		});
		
		// Calculate monthly labels
		const monthLabels = [];
		for (let i = 0; i < 12; i++) {
			const monthIndex = (currentMonth - 11 + i + 12) % 12;
			monthLabels.push(monthNames[monthIndex]);
		}
		
		// Total engagement (views + votes)
		const totalIdeas = await prisma.idea.count();
		const aggregates = await prisma.idea.aggregate({
			_sum: { viewCount: true, voteCount: true }
		});
		
		const totalEngagement = (aggregates._sum.viewCount || 0) + Math.abs(aggregates._sum.voteCount || 0);
		
		// Status counts for KPIs
		const statusMap = {};
		statusCounts.forEach(s => {
			statusMap[s.status] = s._count.status;
		});
		
		res.json({
			kpis: {
				totalIdeas,
				underReview: statusMap.PENDING_REVIEW || 0,
				approved: statusMap.APPROVED || 0,
				promoted: statusMap.PROMOTED_TO_PROJECT || 0,
				totalEngagement
			},
			monthlySubmissions: {
				labels: monthLabels,
				data: monthlySubmissions
			},
			categoryBreakdown: categoryBreakdown.map(c => ({
				category: c.category,
				count: c._count.category
			})),
			statusCounts: statusCounts.map(s => ({
				status: s.status,
				count: s._count.status
			})),
			topContributors: contributorsWithNames
		});
	} catch (err) {
		console.error('GET /api/innovation/analytics error:', err);
		res.status(500).json({ error: 'failed to fetch analytics' });
	}
});

// Database connectivity check
async function checkDatabaseConnection() {
	try {
		await prisma.$connect();
		console.log('✓ Database connected successfully');
		return true;
	} catch (error) {
		console.warn('⚠️  Database connection failed:', error.message);
		console.warn('⚠️  Server will continue with fallback user authentication');
		return false;
	}
}

app.listen(PORT, async () => {
	console.log(`🚀 Server listening on port ${PORT}`);
	await checkDatabaseConnection();
});

