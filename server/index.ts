import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma, ensureDbConnection } from './prismaClient';
import { IdeaStatus } from '../src/generated/prisma/client';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
  const user = (req as any).user as { role?: string } | undefined;
  if (!user || user.role !== 'INNOVATION_COMMITTEE') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const payload = (req as any).user as { sub: string };
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(404).json({ message: 'Not found' });
  return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// =============== Innovation Hub: Ideas (Committee) ===============
// List ideas with optional filters: status, sort
app.get('/api/ideas', authMiddleware, async (req, res) => {
  try {
    const { status, sort } = req.query as { status?: string; sort?: string };

    const where: any = {};
    if (status && status !== 'all') {
      // support simple aliases
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

    const ideas = await prisma.idea.findMany({
      where,
      orderBy,
    });
    return res.json(ideas);
  } catch (e: any) {
    console.error('GET /api/ideas error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to fetch ideas' });
  }
});

// Approve an idea
app.post('/api/ideas/:id/approve', authMiddleware, requireCommittee, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { notes } = (req.body || {}) as { notes?: string };
    const user = (req as any).user as { sub: string };

    const updated = await prisma.idea.update({
      where: { id },
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
    const user = (req as any).user as { sub: string };

    const updated = await prisma.idea.update({
      where: { id },
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

    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Idea must be APPROVED before promotion' });
    }

    const code = projectCode && String(projectCode).trim().length > 0
      ? String(projectCode).trim()
      : `BSJ-PROJ-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const updated = await prisma.idea.update({
      where: { id },
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

// GET /api/requisitions - list requests (basic demo)
app.get('/api/requisitions', async (_req, res) => {
  try {
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, comments: true, statusHistory: true },
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
        totalEstimated: 0, // Calculate from items or set default
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

(async () => {
  await ensureDbConnection();
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
})();
