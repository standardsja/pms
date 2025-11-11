#!/usr/bin/env node
/**
 * Unified Procurement Management System API Server
 * Consolidates procurement workflow, innovation hub, admin endpoints
 * Uses JWT authentication, port 4000 to match Vite proxy
 */
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import puppeteer from 'puppeteer';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me';

// PDF debug logging toggle
const PDF_DEBUG = process.env.PDF_DEBUG !== '0' && process.env.NODE_ENV !== 'production';
const logPdf = (...args: any[]) => { if (PDF_DEBUG) console.log('[pdf]', ...args); };

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static uploads directory
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

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

// ============================================
// HEALTH CHECKS
// ============================================

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e?.message || 'DB error' });
  }
});

app.get('/health/auth', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    res.json({
      status: 'ok',
      userCount,
      roleCount,
      dbReady: userCount > 0 && roleCount > 0,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(500).json({
      status: 'error',
      message: e?.message || 'Auth DB check failed',
      dbReady: false
    });
  }
});

// ============================================
// AUTHENTICATION
// ============================================

// Dev-only test login (no password required, returns JWT)
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

    const roles = (user.roles || []).map((ur) => ur.role.name);
    const token = jwt.sign(
      { sub: user.id, email: user.email, roles, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
      roles,
    };

    return res.json({ token, user: userPayload });
  } catch (err: any) {
    console.error('Test login error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Production password-based login (returns JWT)
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

    const roles = (user.roles || []).map(r => r.role.name);
    const token = jwt.sign(
      { sub: user.id, email: user.email, roles, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null,
    };

    return res.json({ token, user: userPayload });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// JWT middleware
function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Role check middleware for Innovation Committee
function requireCommittee(req: any, res: any, next: any) {
  const user = req.user as { roles?: string[] } | undefined;
  if (!user || !user.roles || !user.roles.includes('INNOVATION_COMMITTEE')) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const payload = req.user as { sub: number };
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      department: true,
      roles: { include: { role: true } }
    }
  });
  if (!user) return res.status(404).json({ message: 'Not found' });

  const roles = (user.roles || []).map(r => r.role.name);
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
    department: user.department ? { id: user.department.id, name: user.department.name, code: user.department.code } : null
  });
});

// ============================================
// PROCUREMENT WORKFLOW
// ============================================

// Helper: get acting user from x-user-id or JWT
function getActingUserId(req: any): number | null {
  // First check JWT
  if (req.user && req.user.sub) return Number(req.user.sub);

  // Fallback for legacy x-user-id header (dev convenience)
  const v = req.header('x-user-id') || req.header('X-User-Id') || req.header('authorization');
  if (!v) return null;
  if (v.toLowerCase().startsWith('bearer ')) return Number(v.split(' ')[1]);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Utility: generate request reference
function generateReference(): string {
  const dt = new Date();
  const year = dt.getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `REQ-${year}-${rand}`;
}

// Create a procurement request
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
      return res.status(400).json({ error: 'title, departmentId and authentication required' });
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
          create: (items || []).map((it: any) => ({
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

    // Assign to department manager if exists
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (dept && dept.managerId) {
      await prisma.request.update({
        where: { id: created.id },
        data: { currentAssigneeId: dept.managerId, status: 'DEPARTMENT_REVIEW' }
      });
      await prisma.requestAction.create({
        data: {
          requestId: created.id,
          action: 'ASSIGN',
          comment: 'Assigned to department manager',
          performedById: actorId,
          metadata: { to: dept.managerId }
        }
      });
      await prisma.requestStatusHistory.create({
        data: {
          requestId: created.id,
          status: 'DEPARTMENT_REVIEW',
          changedById: actorId,
          comment: 'Assigned to department manager'
        }
      });
    }

    const result = await prisma.request.findUnique({
      where: { id: created.id },
      include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true, actions: true }
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.error('POST /requests error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// List procurement requests
app.get('/requests', async (req, res) => {
  try {
    const { assignee, requester, status, departmentId } = req.query;
    const where: any = {};
    if (assignee) where.currentAssigneeId = Number(assignee);
    if (requester) where.requesterId = Number(requester);
    if (status) where.status = String(status);
    if (departmentId) where.departmentId = Number(departmentId);

    const list = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
    });
    res.json(list);
  } catch (err: any) {
    console.error('GET /requests error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Get single procurement request
app.get('/requests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const request = await prisma.request.findUnique({
      where: { id },
      include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (err: any) {
    console.error('GET /requests/:id error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Update procurement request (managers/procurement/finance fill sections)
app.put('/requests/:id', async (req, res) => {
  try {
    const actorId = getActingUserId(req);
    const id = Number(req.params.id);
    const data = req.body;

    if (!actorId) return res.status(400).json({ error: 'authentication required' });

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const updateData: any = {};
    if (data.managerName !== undefined) updateData.managerName = data.managerName;
    if (data.headName !== undefined) updateData.headName = data.headName;
    if (data.managerApproved !== undefined) updateData.managerApproved = Boolean(data.managerApproved);
    if (data.headApproved !== undefined) updateData.headApproved = Boolean(data.headApproved);
    if (data.commitmentNumber !== undefined) updateData.commitmentNumber = data.commitmentNumber;
    if (data.accountingCode !== undefined) updateData.accountingCode = data.accountingCode;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.budgetComments !== undefined) updateData.budgetComments = data.budgetComments;
    if (data.budgetOfficerName !== undefined) updateData.budgetOfficerName = data.budgetOfficerName;
    if (data.budgetManagerName !== undefined) updateData.budgetManagerName = data.budgetManagerName;
    if (data.budgetOfficerApproved !== undefined) updateData.budgetOfficerApproved = Boolean(data.budgetOfficerApproved);
    if (data.budgetManagerApproved !== undefined) updateData.budgetManagerApproved = Boolean(data.budgetManagerApproved);
    if (data.procurementCaseNumber !== undefined) updateData.procurementCaseNumber = data.procurementCaseNumber;
    if (data.receivedBy !== undefined) updateData.receivedBy = data.receivedBy;
    if (data.dateReceived !== undefined) updateData.dateReceived = data.dateReceived;
    if (data.actionDate !== undefined) updateData.actionDate = data.actionDate;
    if (data.procurementComments !== undefined) updateData.procurementComments = data.procurementComments;
    if (data.procurementApproved !== undefined) updateData.procurementApproved = Boolean(data.procurementApproved);

    const updated = await prisma.request.update({
      where: { id },
      data: updateData,
      include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('PUT /requests/:id error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Perform actions on request: APPROVE, RETURN, ASSIGN, SEND_TO_VENDOR
app.post('/requests/:id/action', async (req, res) => {
  try {
    const actorId = getActingUserId(req);
    const id = Number(req.params.id);
    const { action, comment, assignedToId } = req.body;
    if (!actorId) return res.status(400).json({ error: 'authentication required' });

    const request = await prisma.request.findUnique({
      where: { id },
      include: { requester: true, department: true }
    });
    if (!request) return res.status(404).json({ error: 'request not found' });

    const isAssignee = request.currentAssigneeId && Number(request.currentAssigneeId) === Number(actorId);

    if (action === 'ASSIGN') {
      if (!assignedToId) return res.status(400).json({ error: 'assignedToId required for ASSIGN' });
      await prisma.request.update({ where: { id }, data: { currentAssigneeId: Number(assignedToId) } });
      await prisma.requestAction.create({
        data: {
          requestId: id,
          action: 'ASSIGN',
          comment: comment || '',
          performedById: actorId,
          metadata: { to: assignedToId }
        }
      });
      await prisma.requestStatusHistory.create({
        data: {
          requestId: id,
          status: request.status,
          changedById: actorId,
          comment: `Assigned to ${assignedToId}`
        }
      });
      return res.json({ ok: true });
    }

    if (action === 'RETURN') {
      await prisma.request.update({
        where: { id },
        data: { status: 'DEPARTMENT_RETURNED', currentAssigneeId: request.requesterId }
      });
      await prisma.requestAction.create({
        data: { requestId: id, action: 'RETURN', comment: comment || '', performedById: actorId }
      });
      await prisma.requestStatusHistory.create({
        data: { requestId: id, status: 'DEPARTMENT_RETURNED', changedById: actorId, comment: comment || '' }
      });
      return res.json({ ok: true });
    }

    if (action === 'APPROVE') {
      if (!isAssignee) return res.status(403).json({ error: 'only current assignee may approve' });

      let nextStatus: string | null = null;
      let nextAssigneeId: number | null = null;

      switch (request.status) {
        case 'DEPARTMENT_REVIEW':
        case 'SUBMITTED':
          nextStatus = 'HOD_REVIEW';
          {
            const manager = await prisma.user.findUnique({ where: { id: actorId } });
            if (manager) {
              await prisma.request.update({
                where: { id },
                data: { managerName: manager.name || manager.email, managerApproved: true }
              });
            }
            const hodUserRole = await prisma.userRole.findFirst({
              where: { role: { name: 'HEAD_OF_DIVISION' }, user: { departmentId: request.departmentId } },
              include: { user: true }
            });
            if (hodUserRole && hodUserRole.user) nextAssigneeId = hodUserRole.user.id;
          }
          break;

        case 'HOD_REVIEW':
          nextStatus = 'PROCUREMENT_REVIEW';
          {
            const hod = await prisma.user.findUnique({ where: { id: actorId } });
            if (hod) {
              await prisma.request.update({
                where: { id },
                data: { headName: hod.name || hod.email, headApproved: true }
              });
            }
            // Load-balance procurement
            const procOfficers = await prisma.userRole.findMany({
              where: { role: { name: 'PROCUREMENT' } },
              include: { user: true }
            });
            if (procOfficers.length > 0) {
              const counts = await Promise.all(procOfficers.map(async (uro) => {
                const count = await prisma.request.count({
                  where: { currentAssigneeId: uro.user.id, status: { in: ['PROCUREMENT_REVIEW'] } }
                });
                return { userId: uro.user.id, count };
              }));
              const leastBusy = counts.reduce((min, curr) => (curr.count < min.count ? curr : min));
              nextAssigneeId = leastBusy.userId;
            }
          }
          break;

        case 'PROCUREMENT_REVIEW':
          nextStatus = 'FINANCE_REVIEW';
          {
            const finOfficers = await prisma.userRole.findMany({
              where: { role: { name: 'FINANCE' } },
              include: { user: true }
            });
            if (finOfficers.length > 0) {
              const counts = await Promise.all(finOfficers.map(async (uro) => {
                const count = await prisma.request.count({
                  where: { currentAssigneeId: uro.user.id, status: { in: ['FINANCE_REVIEW'] } }
                });
                return { userId: uro.user.id, count };
              }));
              const leastBusy = counts.reduce((min, curr) => (curr.count < min.count ? curr : min));
              nextAssigneeId = leastBusy.userId;
            }
          }
          break;

        case 'FINANCE_REVIEW':
          nextStatus = 'BUDGET_MANAGER_REVIEW';
          {
            const budgetOfficer = await prisma.user.findUnique({ where: { id: actorId } });
            if (budgetOfficer) {
              await prisma.request.update({
                where: { id },
                data: { budgetOfficerName: budgetOfficer.name || budgetOfficer.email, budgetOfficerApproved: true }
              });
            }
            const financeDept = await prisma.department.findUnique({
              where: { code: 'FIN' },
              include: { manager: true }
            });
            if (financeDept && financeDept.managerId) {
              const isProc = await prisma.userRole.findFirst({
                where: { userId: financeDept.managerId, role: { name: 'PROCUREMENT' } }
              });
              if (!isProc) {
                nextAssigneeId = financeDept.managerId;
                console.log('[workflow] Assigned Budget Manager userId=', nextAssigneeId);
              } else {
                console.warn('[workflow] Finance manager also has PROCUREMENT role; not assigning.');
                nextAssigneeId = null;
              }
            }
          }
          break;

        case 'BUDGET_MANAGER_REVIEW':
          nextStatus = 'FINANCE_APPROVED';
          {
            const budgetManager = await prisma.user.findUnique({ where: { id: actorId } });
            if (budgetManager) {
              await prisma.request.update({
                where: { id },
                data: { budgetManagerName: budgetManager.name || budgetManager.email, budgetManagerApproved: true }
              });
            }
            // Assign back to procurement
            const procOfficers = await prisma.userRole.findMany({
              where: { role: { name: 'PROCUREMENT' } },
              include: { user: true }
            });
            if (procOfficers.length > 0) {
              const counts = await Promise.all(procOfficers.map(async (uro) => {
                const count = await prisma.request.count({
                  where: { currentAssigneeId: uro.user.id, status: { in: ['FINANCE_APPROVED'] } }
                });
                return { userId: uro.user.id, count };
              }));
              const leastBusy = counts.reduce((min, curr) => (curr.count < min.count ? curr : min));
              nextAssigneeId = leastBusy.userId;
            }
          }
          break;

        default:
          nextStatus = 'CLOSED';
          nextAssigneeId = null;
      }

      await prisma.request.update({
        where: { id },
        data: { status: nextStatus || request.status, currentAssigneeId: nextAssigneeId }
      });
      await prisma.requestAction.create({
        data: { requestId: id, action: 'APPROVE', comment: comment || '', performedById: actorId }
      });
      await prisma.requestStatusHistory.create({
        data: { requestId: id, status: nextStatus || request.status, changedById: actorId, comment: comment || '' }
      });

      const updated = await prisma.request.findUnique({
        where: { id },
        include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
      });
      return res.json(updated);
    }

    if (action === 'SEND_TO_VENDOR') {
      if (!isAssignee) return res.status(403).json({ error: 'only current assignee may send to vendor' });
      if (request.status !== 'FINANCE_APPROVED') {
        return res.status(400).json({ error: 'request must be FINANCE_APPROVED to send to vendor' });
      }

      await prisma.request.update({
        where: { id },
        data: { status: 'SENT_TO_VENDOR', currentAssigneeId: null }
      });
      await prisma.requestAction.create({
        data: { requestId: id, action: 'SEND_TO_VENDOR', comment: comment || 'Sent to vendor', performedById: actorId }
      });
      await prisma.requestStatusHistory.create({
        data: { requestId: id, status: 'SENT_TO_VENDOR', changedById: actorId, comment: comment || 'Dispatched to vendor' }
      });

      const updated = await prisma.request.findUnique({
        where: { id },
        include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
      });
      return res.json(updated);
    }

    res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    console.error('POST /requests/:id/action error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Generate PDF for request
app.get('/requests/:id/pdf', async (req, res) => {
  try {
    const id = Number(req.params.id);
    logPdf('start', { id });
    const request = await prisma.request.findUnique({
      where: { id },
      include: { items: true, requester: true, department: true, currentAssignee: true, statusHistory: true }
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const templatePath = path.join(process.cwd(), 'server', 'templates', 'request-pdf.html');
    const tpl = await fsp.readFile(templatePath, 'utf8');

    const itemsRows = (request.items || []).map((it, idx) => {
      const qty = Number(it.quantity || 0);
      const unit = Number(it.unitPrice || 0);
      const subtotal = qty * unit;
      const unitFmt = isNaN(unit) ? '' : unit.toFixed(2);
      const subFmt = isNaN(subtotal) ? '' : subtotal.toFixed(2);
      return `<tr><td>${idx + 1}</td><td>${(it.description || '').replace(/</g, '&lt;')}</td><td>${qty}</td><td>${unitFmt}</td><td>${subFmt}</td></tr>`;
    }).join('');

    const formatDate = (dateStr: any) => {
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

    const getApprovalDate = (status: string) => {
      const entry = (request.statusHistory || []).find(h => h.status === status);
      return entry ? formatDate(entry.createdAt) : '—';
    };

    const submittedDate = formatDate(request.submittedAt || request.createdAt);
    const managerApprovalDate = getApprovalDate('DEPARTMENT_REVIEW');
    const hodApprovalDate = getApprovalDate('HOD_REVIEW');
    const procurementApprovalDate = getApprovalDate('PROCUREMENT_REVIEW');
    const financeApprovalDate = getApprovalDate('FINANCE_APPROVED');
    const effectiveCurrency = request.currency || 'JMD';

    const html = tpl
      .replace(/{{reference}}/g, String(request.reference || request.id))
      .replace(/{{submittedAt}}/g, request.createdAt ? new Date(request.createdAt).toLocaleString() : '')
      .replace(/{{requesterName}}/g, request.requester?.name || '')
      .replace(/{{requesterEmail}}/g, request.requester?.email || '')
      .replace(/{{departmentName}}/g, request.department?.name || '')
      .replace(/{{priority}}/g, String(request.priority || ''))
      .replace(/{{currency}}/g, effectiveCurrency)
      .replace(/{{totalEstimated}}/g, request.totalEstimated ? `${effectiveCurrency} ${request.totalEstimated}` : '')
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
    const t0 = Date.now();
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    let pdf: Buffer;
    try {
      await page.setContent(html, { waitUntil: 'load' });
      await page.emulateMediaType('screen');
      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' }
      });
    } finally {
      await browser.close().catch(() => { });
    }
    const renderMs = Date.now() - t0;

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `request-${request.reference || request.id}.pdf`;
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    if (!pdf || !pdf.length || pdf.length < 100) {
      logPdf('error:small-buffer', { size: pdf ? pdf.length : 0, renderMs });
      return res.status(500).json({ error: 'PDF generation failed' });
    }

    res.setHeader('X-PDF-Size', String(pdf.length));
    res.setHeader('X-Render-Time', String(renderMs));
    logPdf('rendered', { size: pdf.length, renderMs });
    res.setHeader('Content-Length', String(pdf.length));
    res.status(200).end(pdf);
  } catch (err: any) {
    logPdf('error', err);
    res.status(500).json({ error: String(err) });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

app.get('/admin/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true, description: true } },
          },
        },
      },
      orderBy: { email: 'asc' },
    });
    res.json(users);
  } catch (err: any) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/admin/users/:id/roles', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'roles must be an array of role names' });
    }

    const roleRecords = await prisma.role.findMany({
      where: { name: { in: roles } },
    });

    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.userRole.createMany({
      data: roleRecords.map(role => ({ userId, roleId: role.id })),
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: { select: { id: true, name: true, code: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });

    res.json(user);
  } catch (err: any) {
    console.error('POST /admin/users/:id/roles error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/admin/departments', async (req, res) => {
  try {
    const { name, code, managerId } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'name and code are required' });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        managerId: managerId || null,
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(department);
  } catch (err: any) {
    console.error('POST /admin/departments error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/admin/audit-log', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: new Date(String(startDate)) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(String(endDate)) };
    }
    if (userId) {
      where.performedById = Number(userId);
    }

    const auditLog = await prisma.requestAction.findMany({
      where,
      include: {
        performedBy: { select: { id: true, name: true, email: true } },
        request: { select: { id: true, reference: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(auditLog);
  } catch (err: any) {
    console.error('GET /admin/audit-log error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ============================================
// INNOVATION HUB (Ideas, Voting)
// ============================================

// List ideas
app.get('/api/ideas', async (req, res) => {
  try {
    const { status, sort } = req.query || {};
    const where: any = {};
    if (status) where.status = String(status);
    const orderBy = sort === 'popular' ? { voteCount: 'desc' } : { createdAt: 'desc' };

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
  } catch (err: any) {
    console.error('GET /api/ideas error:', err);
    res.status(500).json({ error: 'failed to fetch ideas' });
  }
});

// Get single idea
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
        },
        _count: { select: { comments: true } }
      },
    });

    if (!idea) {
      return res.status(404).json({ error: 'idea not found' });
    }

    await prisma.idea.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

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
      viewCount: idea.viewCount + 1,
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
  } catch (err: any) {
    console.error('GET /api/ideas/:id error:', err);
    res.status(500).json({ error: 'failed to fetch idea' });
  }
});

// Submit new idea
app.post('/api/ideas', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const actorId = getActingUserId(req);
    const { title, description, category } = req.body || {};
    if (!actorId) return res.status(400).json({ error: 'authentication required' });
    if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

    const validCategories = new Set(['PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER']);
    const cat = validCategories.has(String(category)) ? String(category) : 'OTHER';

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        category: cat as any,
        submittedBy: actorId,
        status: 'PENDING_REVIEW',
      },
      include: { submitter: true }
    });

    if (req.file) {
      const fileUrl = `/uploads/${req.file.filename}`;
      await prisma.ideaAttachment.create({
        data: {
          ideaId: idea.id,
          fileName: req.file.originalname,
          fileUrl,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
    }

    const created = await prisma.idea.findUnique({
      where: { id: idea.id },
      include: { attachments: true, submitter: true }
    });

    res.json({
      id: created!.id,
      title: created!.title,
      description: created!.description,
      category: created!.category,
      status: created!.status,
      submittedBy: created!.submitter?.name || created!.submitter?.email || String(created!.submittedBy),
      submittedAt: created!.submittedAt,
      voteCount: created!.voteCount,
      viewCount: created!.viewCount,
      createdAt: created!.createdAt,
      updatedAt: created!.updatedAt,
      attachments: created!.attachments,
    });
  } catch (err: any) {
    console.error('POST /api/ideas error:', err);
    res.status(500).json({ error: 'failed to create idea' });
  }
});

// Approve idea (committee only)
app.post('/api/ideas/:id/approve', authMiddleware, requireCommittee, async (req, res) => {
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
  } catch (err: any) {
    console.error('POST /api/ideas/:id/approve error:', err);
    res.status(500).json({ error: 'failed to approve idea' });
  }
});

// Reject idea (committee only)
app.post('/api/ideas/:id/reject', authMiddleware, requireCommittee, async (req, res) => {
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
  } catch (err: any) {
    console.error('POST /api/ideas/:id/reject error:', err);
    res.status(500).json({ error: 'failed to reject idea' });
  }
});

// Promote idea to project (committee only)
app.post('/api/ideas/:id/promote', authMiddleware, requireCommittee, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { projectCode } = req.body || {};

    const idea = await prisma.idea.update({
      where: { id },
      data: { status: 'PROMOTED_TO_PROJECT', promotedAt: new Date(), projectCode: projectCode || null },
      include: { submitter: true }
    });
    res.json(idea);
  } catch (err: any) {
    console.error('POST /api/ideas/:id/promote error:', err);
    res.status(500).json({ error: 'failed to promote idea' });
  }
});

// Vote for idea
app.post('/api/ideas/:id/vote', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const actorId = getActingUserId(req);
    const { voteType } = req.body || {};
    if (!actorId) return res.status(400).json({ error: 'authentication required' });

    const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';

    const existing = await prisma.vote.findUnique({ where: { ideaId_userId: { ideaId: id, userId: actorId } } });

    if (existing) {
      if (existing.voteType === type) {
        return res.status(400).json({ error: 'already voted' });
      }
      await prisma.$transaction([
        prisma.vote.update({ where: { id: existing.id }, data: { voteType: type as any } }),
        prisma.idea.update({
          where: { id },
          data: {
            upvoteCount: type === 'UPVOTE' ? { increment: 1 } : { decrement: 1 },
            downvoteCount: type === 'DOWNVOTE' ? { increment: 1 } : { decrement: 1 },
            voteCount: type === 'UPVOTE' ? { increment: 2 } : { decrement: 2 }
          }
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.vote.create({ data: { ideaId: id, userId: actorId, voteType: type as any } }),
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

    const userVote = idea!.votes.find(v => v.userId === actorId);
    res.json({
      id: idea!.id,
      title: idea!.title,
      description: idea!.description,
      category: idea!.category,
      status: idea!.status,
      submittedById: idea!.submittedBy,
      submittedBy: idea!.submitter?.name || idea!.submitter?.email || String(idea!.submittedBy),
      submittedAt: idea!.submittedAt,
      reviewedBy: idea!.reviewedBy,
      reviewedAt: idea!.reviewedAt,
      reviewNotes: idea!.reviewNotes,
      promotedAt: idea!.promotedAt,
      projectCode: idea!.projectCode,
      voteCount: idea!.voteCount,
      upvoteCount: idea!.upvoteCount || 0,
      downvoteCount: idea!.downvoteCount || 0,
      viewCount: idea!.viewCount,
      commentCount: idea!._count?.comments || 0,
      createdAt: idea!.createdAt,
      updatedAt: idea!.updatedAt,
      hasVoted: !!userVote,
      userVoteType: userVote?.voteType || null,
      votes: idea!.votes.map(v => ({
        id: v.id,
        userId: v.userId,
        userName: v.user.name || v.user.email,
        voteType: v.voteType,
        createdAt: v.createdAt
      }))
    });
  } catch (err: any) {
    console.error('POST /api/ideas/:id/vote error:', err);
    res.status(500).json({ error: 'failed to vote' });
  }
});

// Unvote idea
app.delete('/api/ideas/:id/vote', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const actorId = getActingUserId(req);
    if (!actorId) return res.status(400).json({ error: 'authentication required' });

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
      id: idea!.id,
      title: idea!.title,
      description: idea!.description,
      category: idea!.category,
      status: idea!.status,
      submittedById: idea!.submittedBy,
      submittedBy: idea!.submitter?.name || idea!.submitter?.email || String(idea!.submittedBy),
      submittedAt: idea!.submittedAt,
      reviewedBy: idea!.reviewedBy,
      reviewedAt: idea!.reviewedAt,
      reviewNotes: idea!.reviewNotes,
      promotedAt: idea!.promotedAt,
      projectCode: idea!.projectCode,
      voteCount: idea!.voteCount,
      upvoteCount: idea!.upvoteCount || 0,
      downvoteCount: idea!.downvoteCount || 0,
      viewCount: idea!.viewCount,
      commentCount: idea!._count?.comments || 0,
      createdAt: idea!.createdAt,
      updatedAt: idea!.updatedAt,
      hasVoted: false,
      userVoteType: null,
      votes: idea!.votes.map(v => ({
        id: v.id,
        userId: v.userId,
        userName: v.user.name || v.user.email,
        voteType: v.voteType,
        createdAt: v.createdAt
      }))
    });
  } catch (err: any) {
    console.error('DELETE /api/ideas/:id/vote error:', err);
    res.status(500).json({ error: 'failed to remove vote' });
  }
});

// Generic requisitions endpoint (alias for /requests for frontend compatibility)
app.get('/api/requisitions', async (req, res) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, comments: true, statusHistory: true },
    });
    res.json(requests);
  } catch (e: any) {
    console.error('Error fetching requisitions:', e);
    res.status(500).json({ message: e?.message || 'Failed to fetch requisitions' });
  }
});

app.post('/api/requisitions', async (req, res) => {
  try {
    const { title, requester, department, justification, items = [] } = req.body || {};
    if (!title || !requester || !department || !justification) {
      return res.status(400).json({ message: 'title, requester, department, and justification are required' });
    }

    const created = await prisma.request.create({
      data: {
        title,
        requester,
        department,
        justification,
        totalEstimated: 0,
        items: {
          create: items.map((it: any) => ({
            description: String(it.description || ''),
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(created);
  } catch (e: any) {
    console.error('Error creating requisition:', e);
    res.status(500).json({ message: e?.message || 'Failed to create requisition' });
  }
});

// Root route
app.get('/', (req, res) => res.json({ ok: true, service: 'PMS Unified API', version: '2.0' }));

// Start server
(async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection established');
  } catch (e) {
    console.error('✗ Database connection failed:', e);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Unified PMS API listening on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Auth Health: http://localhost:${PORT}/health/auth`);
  });
})();
