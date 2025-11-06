#!/usr/bin/env node
// Ensure environment variables from .env are available when running the server directly
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
			vendorId,
			budgetCode,
		} = req.body;

		if (!title || !departmentId || !actorId) {
			return res.status(400).json({ error: 'title, departmentId and x-user-id header are required' });
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

// Real login endpoint with password verification
// POST /auth/login { email, password }
app.post('/auth/login', async (req, res) => {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) return res.status(400).json({ error: 'email and password required' });

		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				department: true,
				roles: { include: { role: true } },
			},
		});
		if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid credentials' });

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'invalid credentials' });

		const payload = {
			id: user.id,
			email: user.email,
			name: user.name,
			department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
			roles: (user.roles || []).map((ur) => ur.role.name),
		};
		// TODO: replace demo-token with a signed JWT
		return res.json({ token: 'demo-token', user: payload });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'server error' });
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

// Alias for /requests (some frontend code uses /requisitions)
app.get('/requisitions', async (req, res) => {
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
					// move to PROCUREMENT_REVIEW (find procurement user)
					nextStatus = 'PROCUREMENT_REVIEW';
					{
						const proc = await prisma.userRole.findFirst({ where: { role: { name: 'PROCUREMENT' } }, include: { user: true } });
						if (proc && proc.user) nextAssigneeId = proc.user.id;
					}
					break;
				case 'PROCUREMENT_REVIEW':
					// move to FINANCE_REVIEW
					nextStatus = 'FINANCE_REVIEW';
					{
						const fin = await prisma.userRole.findFirst({ where: { role: { name: 'FINANCE' } }, include: { user: true } });
						if (fin && fin.user) nextAssigneeId = fin.user.id;
					}
					break;
				case 'FINANCE_REVIEW':
					nextStatus = 'FINANCE_APPROVED';
					nextAssigneeId = null;
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

		res.status(400).json({ error: 'unknown action' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

app.get('/', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});

