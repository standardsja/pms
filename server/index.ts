import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma, ensureDbConnection } from './prismaClient';
import { IdeaStatus } from '@prisma/client';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// Static files for uploads
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

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e?.message || 'DB error' });
  }
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const roles = user.roles.map(r => r.role.name);

    const token = jwt.sign(
      { sub: user.id, email: user.email, roles: roles, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        roles: roles,
        department: user.department ? {
          id: user.department.id,
          name: user.department.name,
          code: user.department.code
        } : null
      },
    });
  } catch (e: any) {
    console.error('Login error:', e);
    return res.status(500).json({ message: e?.message || 'Login failed' });
  }
});

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function requireCommittee(req: any, res: any, next: any) {
  const user = (req as any).user as { roles?: string[] } | undefined;
  if (!user || !user.roles || !user.roles.includes('INNOVATION_COMMITTEE')) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const payload = (req as any).user as { sub: number };
  const user = await prisma.user.findUnique({ 
    where: { id: payload.sub },
    include: {
      roles: {
        include: {
          role: true
        }
      },
      department: true
    }
  });
  if (!user) return res.status(404).json({ message: 'Not found' });
  const roles = user.roles.map(r => r.role.name);
  return res.json({ 
    id: user.id, 
    email: user.email, 
    name: user.name, 
    roles: roles,
    department: user.department ? {
      id: user.department.id,
      name: user.department.name,
      code: user.department.code
    } : null
  });
});

// =============== Innovation Hub: Ideas (Committee) ===============
// List ideas with optional filters: status, sort
app.get('/api/ideas', authMiddleware, async (req, res) => {
  try {
    const { status, sort, include } = req.query as { status?: string; sort?: string; include?: string };
    const user = (req as any).user as { roles?: string[] };
    const isCommittee = user.roles && user.roles.includes('INNOVATION_COMMITTEE');

    const where: any = {};
    
    // If user is NOT committee, only show APPROVED ideas
    if (!isCommittee) {
      where.status = 'APPROVED';
    } else if (status && status !== 'all') {
      // Committee members can filter by status
      const map: Record<string, IdeaStatus> = {
        pending: 'PENDING_REVIEW',
        approved: 'APPROVED',
        rejected: 'REJECTED',
        promoted: 'PROMOTED_TO_PROJECT',
      } as any;
      const s = (map[status] as IdeaStatus) || (status as IdeaStatus);
      where.status = s;
    }

    const orderBy: any = sort === 'popularity' ? { voteCount: 'desc' } : { createdAt: 'desc' };

    const includeAttachments = include === 'attachments';
    const ideas = await prisma.idea.findMany({
      where,
      orderBy,
      include: includeAttachments ? { attachments: true } : undefined,
    });
    return res.json(ideas);
  } catch (e: any) {
    console.error('GET /api/ideas error:', e);
    return res.status(500).json({ error: 'Unable to load ideas', message: 'Unable to load ideas. Please try again later.' });
  }
});

// Counts for dashboard (pending, approved, rejected, promoted)
app.get('/api/ideas/counts', authMiddleware, async (_req, res) => {
  try {
    const [pending, approved, rejected, promoted] = await Promise.all([
      prisma.idea.count({ where: { status: IdeaStatus.PENDING_REVIEW } }).catch(() => 0),
      prisma.idea.count({ where: { status: IdeaStatus.APPROVED } }).catch(() => 0),
      prisma.idea.count({ where: { status: IdeaStatus.REJECTED } }).catch(() => 0),
      // Many schemas used 'PROMOTED_TO_PROJECT' for promoted stage
      prisma.idea
        .count({ where: { OR: [{ status: (IdeaStatus as any).PROMOTED_TO_PROJECT }, { status: (IdeaStatus as any).PROMOTED }] } })
        .catch(() => 0),
    ]);
    res.json({ pending, approved, rejected, promoted });
  } catch (err) {
    console.error('GET /api/ideas/counts error:', err);
    res.status(500).json({ error: 'Unable to load idea counts' });
  }
});

// Get single idea (optionally with attachments)
app.get('/api/ideas/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { include } = req.query as { include?: string };
    const includeAttachments = include === 'attachments';
    const idea = await prisma.idea.findUnique({
      where: { id: parseInt(id, 10) },
      include: includeAttachments ? { attachments: true } : undefined,
    });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    return res.json(idea);
  } catch (e: any) {
    console.error('GET /api/ideas/:id error:', e);
    return res.status(500).json({ error: 'Unable to load idea', message: 'Unable to load idea details. Please try again later.' });
  }
});

// Create a new idea (optional single image upload)
app.post('/api/ideas', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const user = (req as any).user as { sub: number | string };
    const { title, description, category } = (req.body || {}) as Record<string, string>;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'title, description and category are required' });
    }

    let submittedBy: number = typeof user.sub === 'number' ? user.sub : parseInt(String(user.sub), 10);
    if (!Number.isFinite(submittedBy)) return res.status(400).json({ message: 'Invalid user id' });

    const idea = await prisma.idea.create({
      data: {
        title: String(title),
        description: String(description),
        category: category as any,
        status: 'PENDING_REVIEW',
        submittedBy: submittedBy as any, // Type mismatch - regenerate Prisma client to fix
      },
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

    // Reload with attachments included
    const created = await prisma.idea.findUnique({ where: { id: idea.id }, include: { attachments: true } });
    return res.status(201).json(created);
  } catch (e: any) {
    console.error('POST /api/ideas error:', e);
    return res.status(500).json({ error: 'failed to create idea', details: e?.message });
  }
});

// Approve an idea
app.post('/api/ideas/:id/approve', authMiddleware, requireCommittee, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { notes } = (req.body || {}) as { notes?: string };
    const user = (req as any).user as { sub: number };

    const updated = await prisma.idea.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: 'APPROVED',
        reviewedBy: user.sub,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });
    return res.json(updated);
  } catch (e: any) {
    console.error('POST /api/ideas/:id/approve error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to approve idea' });
  }
});

// Reject an idea
app.post('/api/ideas/:id/reject', authMiddleware, requireCommittee, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { notes } = (req.body || {}) as { notes?: string };
    const user = (req as any).user as { sub: number };

    const updated = await prisma.idea.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: 'REJECTED',
        reviewedBy: user.sub,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });
    return res.json(updated);
  } catch (e: any) {
    console.error('POST /api/ideas/:id/reject error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to reject idea' });
  }
});

// Promote an idea to project (requires APPROVED)
app.post('/api/ideas/:id/promote', authMiddleware, requireCommittee, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { projectCode } = (req.body || {}) as { projectCode?: string };

    const idea = await prisma.idea.findUnique({ where: { id: parseInt(id, 10) } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Idea must be APPROVED before promotion' });
    }

    const code = projectCode && String(projectCode).trim().length > 0
      ? String(projectCode).trim()
      : `BSJ-PROJ-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const updated = await prisma.idea.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: 'PROMOTED_TO_PROJECT',
        promotedAt: new Date(),
        projectCode: code,
      },
    });
    return res.json(updated);
  } catch (e: any) {
    console.error('POST /api/ideas/:id/promote error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to promote idea' });
  }
});

// POST /api/ideas/:id/vote - upvote/downvote an idea
app.post('/api/ideas/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { voteType } = (req.body || {}) as { voteType?: 'UPVOTE' | 'DOWNVOTE' };
    const userId = (req as any).userId;

    const idea = await prisma.idea.findUnique({ where: { id: parseInt(id, 10) } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';

    // Check existing vote
    const existing = await prisma.vote.findFirst({
      where: { ideaId: parseInt(id, 10), userId },
    });

    if (existing) {
      if (existing.voteType === type) {
        return res.status(400).json({ error: 'already voted', message: 'You have already voted on this idea' });
      }
      // Change vote type
      await prisma.vote.update({
        where: { id: existing.id },
        data: { voteType: type },
      });
    } else {
      // Create new vote
      await prisma.vote.create({
        data: { ideaId: parseInt(id, 10), userId, voteType: type },
      });
    }

    // Recalculate counts
    const upvotes = await prisma.vote.count({ where: { ideaId: parseInt(id, 10), voteType: 'UPVOTE' } });
    const downvotes = await prisma.vote.count({ where: { ideaId: parseInt(id, 10), voteType: 'DOWNVOTE' } });

    const updated = await prisma.idea.update({
      where: { id: parseInt(id, 10) },
      data: { upvoteCount: upvotes, downvoteCount: downvotes, voteCount: upvotes - downvotes },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error('POST /api/ideas/:id/vote error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to vote' });
  }
});

// DELETE /api/ideas/:id/vote - remove vote
app.delete('/api/ideas/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId = (req as any).userId;

    const existing = await prisma.vote.findFirst({
      where: { ideaId: parseInt(id, 10), userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    await prisma.vote.delete({ where: { id: existing.id } });

    // Recalculate
    const upvotes = await prisma.vote.count({ where: { ideaId: parseInt(id, 10), voteType: 'UPVOTE' } });
    const downvotes = await prisma.vote.count({ where: { ideaId: parseInt(id, 10), voteType: 'DOWNVOTE' } });

    const updated = await prisma.idea.update({
      where: { id: parseInt(id, 10) },
      data: { upvoteCount: upvotes, downvoteCount: downvotes, voteCount: upvotes - downvotes },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error('DELETE /api/ideas/:id/vote error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to remove vote' });
  }
});

// GET /requests - alias for direct backend access (frontend may call this without /api prefix)
app.get('/requests', async (_req, res) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        title: true,
        requesterId: true,
        departmentId: true,
        status: true,
        currentAssigneeId: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        currentAssignee: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json(requests);
  } catch (e: any) {
    console.error('GET /requests error:', e);
    return res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

// POST /requests - create a new procurement request
app.post('/requests', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const { 
      title, 
      description, 
      departmentId, 
      items = [], 
      totalEstimated, 
      currency,
      priority,
      procurementType 
    } = req.body || {};

    if (!title || !departmentId) {
      return res.status(400).json({ message: 'Title and department are required' });
    }

    // Generate reference
    const reference = `REQ-${Date.now()}`;

    const created = await prisma.request.create({
      data: {
        reference,
        title,
        description: description || null,
        requesterId: parseInt(String(userId), 10),
        departmentId: parseInt(String(departmentId), 10),
        totalEstimated: totalEstimated ? parseFloat(String(totalEstimated)) : null,
        currency: currency || 'JMD',
        priority: priority || 'MEDIUM',
        procurementType: procurementType || null,
        status: 'DRAFT',
        items: {
          create: items.map((it: any) => ({
            description: String(it.description || ''),
            quantity: Number(it.quantity || 1),
            unitPrice: parseFloat(String(it.unitPrice || 0)),
            totalPrice: parseFloat(String(it.totalPrice || 0)),
            accountCode: it.accountCode || null,
            stockLevel: it.stockLevel || null,
            unitOfMeasure: it.unitOfMeasure || null,
            partNumber: it.partNumber || null,
          })),
        },
      },
      include: { 
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return res.status(201).json(created);
  } catch (e: any) {
    console.error('POST /requests error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to create request' });
  }
});

// GET /requests/:id - fetch a single request by ID for editing
app.get('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        reference: true,
        title: true,
        description: true,
        requesterId: true,
        departmentId: true,
        status: true,
        fundingSourceId: true,
        budgetCode: true,
        totalEstimated: true,
        currency: true,
        priority: true,
        procurementType: true,
        expectedDelivery: true,
        currentAssigneeId: true,
        vendorId: true,
        managerName: true,
        headName: true,
        managerApproved: true,
        headApproved: true,
        commitmentNumber: true,
        accountingCode: true,
        budgetComments: true,
        budgetOfficerName: true,
        budgetManagerName: true,
        budgetOfficerApproved: true,
        budgetManagerApproved: true,
        procurementCaseNumber: true,
        receivedBy: true,
        dateReceived: true,
        procurementApproved: true,
        actionDate: true,
        procurementComments: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        currentAssignee: { select: { id: true, name: true, email: true } },
        statusHistory: true,
        actions: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    return res.json(request);
  } catch (e: any) {
    console.error('GET /requests/:id error:', e);
    return res.status(500).json({ message: 'Failed to fetch request' });
  }
});

// PATCH /requests/:id - update an existing request
app.patch('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updated = await prisma.request.update({
      where: { id: parseInt(id, 10) },
      data: updates,
      include: {
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error('PATCH /requests/:id error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to update request' });
  }
});

// PUT /requests/:id - alias for PATCH (frontend uses PUT for updates)
app.put('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updated = await prisma.request.update({
      where: { id: parseInt(id, 10) },
      data: updates,
      include: {
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error('PUT /requests/:id error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to update request' });
  }
});

// POST /requests/:id/submit - submit a draft request for approval workflow
app.post('/requests/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id: parseInt(id, 10) },
      include: { department: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft requests can be submitted' });
    }

    // Find department manager
    const deptManager = await prisma.user.findFirst({
      where: {
        departmentId: request.departmentId,
        roles: {
          some: {
            role: {
              name: 'DEPT_MANAGER'
            }
          }
        }
      },
    });

    const updated = await prisma.request.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: 'DEPARTMENT_REVIEW',
        currentAssigneeId: deptManager?.id || null,
        submittedAt: new Date(),
        statusHistory: {
          create: {
            status: 'DEPARTMENT_REVIEW',
            changedById: request.requesterId,
            comment: 'Request submitted for department manager review',
          },
        },
      },
      include: {
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        currentAssignee: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error('POST /requests/:id/submit error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to submit request' });
  }
});

// POST /requests/:id/action - approve/reject requests (manager, HOD, procurement, finance)
app.post('/requests/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const request = await prisma.request.findUnique({
      where: { id: parseInt(id, 10) },
      include: { department: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify user is the current assignee
    if (request.currentAssigneeId !== parseInt(String(userId), 10)) {
      return res.status(403).json({ message: 'Not authorized to approve this request' });
    }

    let nextStatus = request.status;
    let nextAssigneeId = null;

    if (action === 'APPROVE') {
      // Determine next workflow stage based on current status
      if (request.status === 'DEPARTMENT_REVIEW') {
        // Department Manager approved -> send to HOD
        const hod = await prisma.user.findFirst({
          where: {
            departmentId: request.departmentId,
            roles: { some: { role: { name: 'HEAD_OF_DIVISION' } } }
          }
        });
        nextStatus = 'HOD_REVIEW';
        nextAssigneeId = hod?.id || null;
      } else if (request.status === 'HOD_REVIEW') {
        // HOD approved -> send to Procurement
        const procurement = await prisma.user.findFirst({
          where: { roles: { some: { role: { name: 'PROCUREMENT' } } } }
        });
        nextStatus = 'PROCUREMENT_REVIEW';
        nextAssigneeId = procurement?.id || null;
      } else if (request.status === 'PROCUREMENT_REVIEW') {
        // Procurement approved -> send to Finance
        const finance = await prisma.user.findFirst({
          where: { roles: { some: { role: { name: 'FINANCE' } } } }
        });
        nextStatus = 'FINANCE_REVIEW';
        nextAssigneeId = finance?.id || null;
      } else if (request.status === 'FINANCE_REVIEW') {
        // Finance approved -> send to Budget Manager
        const budgetMgr = await prisma.user.findFirst({
          where: { roles: { some: { role: { name: 'BUDGET_MANAGER' } } } }
        });
        nextStatus = 'BUDGET_MANAGER_REVIEW';
        nextAssigneeId = budgetMgr?.id || null;
      } else if (request.status === 'BUDGET_MANAGER_REVIEW') {
        // Final approval
        nextStatus = 'FINANCE_APPROVED';
        nextAssigneeId = null;
      }
    } else if (action === 'REJECT') {
      // Rejected -> send back to requester as DRAFT
      nextStatus = 'DRAFT';
      nextAssigneeId = request.requesterId;
    }

    // Update request with new status
    const updated = await prisma.request.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: nextStatus,
        currentAssigneeId: nextAssigneeId,
        statusHistory: {
          create: {
            status: nextStatus,
            changedById: parseInt(String(userId), 10),
            comment: `${action === 'APPROVE' ? 'Approved' : 'Rejected'} at ${request.status} stage`,
          },
        },
      },
      include: {
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        currentAssignee: { select: { id: true, name: true, email: true } },
      },
    });

    return res.json(updated);
  } catch (e: any) {
    console.error('POST /requests/:id/action error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to process action' });
  }
});

// GET /api/tags - return empty array for now (Innovation Hub expects this)
app.get('/api/tags', async (_req, res) => {
  try {
    // TODO: Implement tags table if needed
    res.json([]);
  } catch (e: any) {
    console.error('GET /api/tags error:', e);
    res.status(500).json({ message: 'Failed to fetch tags' });
  }
});

// GET /api/challenges - return empty array for now
app.get('/api/challenges', async (_req, res) => {
  try {
    // TODO: Implement challenges table if needed
    res.json([]);
  } catch (e: any) {
    console.error('GET /api/challenges error:', e);
    res.status(500).json({ message: 'Failed to fetch challenges' });
  }
});

// GET /api/requests - list procurement requests (different from /api/requisitions)
app.get('/api/requests', async (_req, res) => {
  try {
    // Select only safe core fields to avoid schema drift issues with legacy databases
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        title: true,
        requesterId: true,
        departmentId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    return res.json(requests);
  } catch (e: any) {
    // If a column is missing on the connected database (e.g., P2022), fall back to a raw query
    console.error('GET /api/requests error:', e);
    if (e?.code === 'P2022') {
      try {
        const rows = await prisma.$queryRawUnsafe(
          'SELECT id, reference, title, requesterId, departmentId, status, createdAt, updatedAt FROM Request ORDER BY createdAt DESC'
        );
        // rows will not include requester/department objects; return as-is
        return res.json(rows);
      } catch (rawErr: any) {
        console.error('GET /api/requests fallback raw query failed:', rawErr);
      }
    }
    return res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

// GET /api/requisitions - list requests (basic demo)
app.get('/api/requisitions', async (_req, res) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, statusHistory: true },
    });

    // Return raw Prisma models. The frontend uses adaptRequestsResponse() to map fields.
    res.json(requests);
  } catch (e: any) {
    console.error('Error fetching requisitions:', e);
    res.status(500).json({ message: e?.message || 'Failed to fetch requisitions' });
  }
});

// Minimal POST /api/requisitions to create a request (optional/basic)
app.post('/api/requisitions', async (req, res) => {
  try {
    const { title, requesterId, departmentId, description, items = [] } = req.body || {};
    if (!title || !requesterId || !departmentId) {
      return res.status(400).json({ message: 'title, requesterId, and departmentId are required' });
    }

    const created = await prisma.request.create({
      data: {
        reference: `REQ-${Date.now()}`,
        title,
        requesterId: parseInt(String(requesterId), 10),
        departmentId: parseInt(String(departmentId), 10),
        description: description || null,
        totalEstimated: 0, // Calculate from items or set default
        items: {
          create: items.map((it: any) => ({
            description: String(it.description || ''),
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            totalPrice: Number(it.totalPrice || 0),
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

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /admin/users - Get all users with their roles and departments
app.get('/admin/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        roles: { include: { role: true } }
      },
      orderBy: { email: 'asc' }
    });
    
    const formatted = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      department: u.department?.name || null,
      roles: u.roles.map(r => r.role.name)
    }));
    
    res.json(formatted);
  } catch (e: any) {
    console.error('GET /admin/users error:', e);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// POST /admin/requests/:id/reassign - Admin can reassign any request to any user
app.post('/admin/requests/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigneeId, comment } = req.body;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Verify the requester is an admin
    const admin = await prisma.user.findUnique({
      where: { id: parseInt(String(userId), 10) },
      include: { roles: { include: { role: true } } }
    });

    const isAdmin = admin?.roles.some(r => r.role.name === 'ADMIN');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Update the request assignment
    const updated = await prisma.request.update({
      where: { id: parseInt(id, 10) },
      data: {
        currentAssigneeId: assigneeId ? parseInt(String(assigneeId), 10) : null,
        statusHistory: {
          create: {
            status: await prisma.request.findUnique({ where: { id: parseInt(id, 10) } }).then(r => r?.status || 'DRAFT'),
            changedById: parseInt(String(userId), 10),
            comment: comment || 'Request manually reassigned by admin',
          },
        },
      },
      include: {
        items: true,
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        currentAssignee: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('POST /admin/requests/:id/reassign error:', e);
    res.status(500).json({ message: 'Failed to reassign request' });
  }
});

// GET /api/auth/login - For compatibility (some parts of app may call this)
app.get('/api/auth/login', (req, res) => {
  res.status(405).json({ message: 'Use POST method' });
});

// GET /api/auth/test-login - Test endpoint
app.get('/api/auth/test-login', (req, res) => {
  res.status(405).json({ message: 'Use POST method' });
});

import http from 'http';
let server: http.Server | null = null;

async function start() {
  try {
    await ensureDbConnection();
    server = app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    // Fail fast so tsx watch can restart cleanly
    process.exit(1);
  }
}

function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  const closeServer = () => new Promise<void>((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
  Promise.all([
    closeServer(),
    prisma.$disconnect().catch(() => undefined),
  ]).then(() => {
    console.log('Cleanup complete. Exiting.');
    process.exit(0);
  });
}

['SIGINT','SIGTERM','SIGUSR2'].forEach(sig => {
  process.on(sig as NodeJS.Signals, () => gracefulShutdown(sig));
});

// Handle unhandled rejections so watch mode doesn't hang
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Let the process exit; tsx will restart
  process.exit(1);
});

start();
