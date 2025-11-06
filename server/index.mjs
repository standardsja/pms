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

// Current schema stores a single enum Role on User; userRole table not present.
async function getRolesForUser(userId) {
    return [];
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
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) return res.status(404).json({ error: 'user not found' });
		const userRoles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
		const roles = userRoles.map(ur => ur.role?.name).filter(Boolean);

		const payload = {
			id: user.id,
			email: user.email,
			name: user.name,
			department: null,
			roles,
		};
		return res.json({ token: 'demo-token', user: payload });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: String(err) });
	}
});

// Real login endpoint: POST /auth/login { email, password }
// Validates passwordHash and returns normalized user payload
app.post('/auth/login', async (req, res) => {
	const { email, password } = req.body || {};
	if (!email || !password) return res.status(400).json({ error: 'email and password required' });

	// Fallback static users (in-memory) for when database is unreachable
	const fallbackUsers = {
		'test1@bsj.gov.jm': { password: 'Passw0rd!', name: 'Test User 1', role: 'USER' },
		'test2@bsj.gov.jm': { password: 'Passw0rd!', name: 'Test User 2', role: 'USER' },
		'committee@bsj.gov.jm': { password: 'Passw0rd!', name: 'Committee Member', role: 'INNOVATION_COMMITTEE' },
	};

	try {
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user || !user.passwordHash) {
			// Try fallback static users if DB record missing
			const fb = fallbackUsers[email];
			if (fb && fb.password === password) {
				return res.json({ token: 'demo-token', user: { id: `fb-${email}`, email, name: fb.name, department: null, roles: [fb.role] } });
			}
			return res.status(401).json({ error: 'invalid credentials' });
		}
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ error: 'invalid credentials' });
		const userRoles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
		const roles = userRoles.map(ur => ur.role?.name).filter(Boolean);
		return res.json({ token: 'demo-token', user: { id: user.id, email: user.email, name: user.name, department: null, roles } });
	} catch (err) {
		// If database unreachable, attempt fallback static users
		console.error('[auth/login] error, attempting fallback', err);
		const fb = fallbackUsers[email];
		if (fb && fb.password === password) {
			return res.json({ token: 'demo-token', user: { id: `fb-${email}`, email, name: fb.name, department: null, roles: [fb.role] } });
		}
		return res.status(500).json({ error: 'server error' });
	}
});

// Debug endpoint to verify stored user and password hash presence
app.get('/auth/debug', async (req, res) => {
    try {
        const email = String(req.query.email || '').trim();
        if (!email) return res.status(400).json({ error: 'email required' });
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) return res.status(404).json({ error: 'not found' });
		const userRoles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
		const roles = userRoles.map(ur => ur.role?.name).filter(Boolean);
		res.json({ id: user.id, email: user.email, roles, hasPasswordHash: !!user.passwordHash });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: String(err) });
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
                    // Placeholder: escalate to HOD_REVIEW; no HOD lookup table available in current schema
                    nextStatus = 'HOD_REVIEW';
                    nextAssigneeId = request.currentAssigneeId; // keep same until real role mapping added
                    break;
                case 'HOD_REVIEW':
                    // Placeholder: move to PROCUREMENT_REVIEW without re-assignment
                    nextStatus = 'PROCUREMENT_REVIEW';
                    nextAssigneeId = request.currentAssigneeId;
                    break;
                case 'PROCUREMENT_REVIEW':
                    // Placeholder: move to FINANCE_REVIEW
                    nextStatus = 'FINANCE_REVIEW';
                    nextAssigneeId = request.currentAssigneeId;
                    break;
                case 'FINANCE_REVIEW':
                    // Placeholder: mark finance approved; no re-assignment
                    nextStatus = 'FINANCE_APPROVED';
                    nextAssigneeId = request.currentAssigneeId;
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
					.replace(/{{now}}/g, new Date().toLocaleString());
				logPdf('html-length', html.length);

			// If requested, return just the HTML for preview/debug
			if ((req.query && (req.query.format === 'html' || req.query.view === 'html'))) {
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
					res.setHeader('X-HTML-Length', String(html.length));
				return res.status(200).send(html);
			}

			// Launch headless browser and render PDF
				const t0 = Date.now();
				const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
				const page = await browser.newPage();
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

app.listen(PORT, () => {
	console.log(`Server listening on ${PORT}`);
});

