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
        }
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
      user: { id: user.id, email: user.email, name: user.name, roles: roles },
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

// Helper to get user ID from JWT token in request
function getActingUserId(req: any): number | null {
  const user = (req as any).user as { sub: number | string } | undefined;
  if (!user || !user.sub) return null;
  const userId = typeof user.sub === 'number' ? user.sub : parseInt(String(user.sub), 10);
  return Number.isFinite(userId) ? userId : null;
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
      }
    }
  });
  if (!user) return res.status(404).json({ message: 'Not found' });
  const roles = user.roles.map(r => r.role.name);
  return res.json({ id: user.id, email: user.email, name: user.name, roles: roles });
});

// =============== Innovation Hub: Ideas (Committee) ===============
// List ideas with optional filters: status, sort
app.get('/api/ideas', authMiddleware, async (req, res) => {
  try {
    const { status, sort, include } = req.query as { status?: string; sort?: string; include?: string };
    const user = (req as any).user as { sub: number | string; roles?: string[] };
    const userId = typeof user.sub === 'number' ? user.sub : parseInt(String(user.sub), 10);
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
    const includeObj: any = {
      submitter: { select: { id: true, name: true, email: true } },
      votes: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { comments: true } }
    };
    if (includeAttachments) includeObj.attachments = true;
    
    const ideas = await prisma.idea.findMany({
      where,
      orderBy,
      include: includeObj,
    });

    // Transform ideas to include vote counts and user vote status
    const transformedIdeas = ideas.map(idea => {
      const votes = idea.votes as any[];
      const userVote = votes.find(v => v.userId === userId);
      const upvoteCount = votes.filter(v => v.voteType === 'UPVOTE').length;
      const downvoteCount = votes.filter(v => v.voteType === 'DOWNVOTE').length;

      return {
        ...idea,
        upvoteCount,
        downvoteCount,
        hasVoted: !!userVote,
        userVoteType: userVote?.voteType || null,
        commentCount: (idea._count as any)?.comments || 0
      };
    });

    return res.json(transformedIdeas);
  } catch (e: any) {
    console.error('GET /api/ideas error:', e);
    return res.status(500).json({ error: 'Unable to load ideas', message: 'Unable to load ideas. Please try again later.' });
  }
});

// Get single idea (optionally with attachments)
app.get('/api/ideas/:id', authMiddleware, async (req, res) => {
  try {
      const { id } = req.params as { id: string };
      if (!id) {
        return res.status(400).json({ error: 'Missing idea id in request path' });
      }
      const parsedId = parseInt(id, 10);
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: 'Invalid idea id' });
      }
    const { include } = req.query as { include?: string };
    const user = (req as any).user as { sub: number | string };
    const userId = typeof user.sub === 'number' ? user.sub : parseInt(String(user.sub), 10);
    
    const includeAttachments = include === 'attachments';
    const includeObj: any = { 
      submitter: { select: { id: true, name: true, email: true } },
      votes: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { comments: true } }
    };
    if (includeAttachments) includeObj.attachments = true;
    
      const idea = await prisma.idea.findUnique({
        where: { id: parsedId },
      include: includeObj,
    });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    // Increment view count
    await prisma.idea.update({
      where: { id: parsedId },
      data: { viewCount: { increment: 1 } }
    });

    // Transform idea to include vote information
    const votes = idea.votes as any[];
    const userVote = votes.find(v => v.userId === userId);
    const upvoteCount = votes.filter(v => v.voteType === 'UPVOTE').length;
    const downvoteCount = votes.filter(v => v.voteType === 'DOWNVOTE').length;

    const transformedIdea = {
      ...idea,
      upvoteCount,
      downvoteCount,
      hasVoted: !!userVote,
      userVoteType: userVote?.voteType || null,
      commentCount: (idea._count as any)?.comments || 0,
      viewCount: idea.viewCount + 1 // Return incremented count
    };

    return res.json(transformedIdea);
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

// GET /api/ideas/counts - dashboard stats
app.get('/api/ideas/counts', authMiddleware, async (_req, res) => {
  try {
    const groups = await prisma.idea.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const stats: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      promoted: 0,
      draft: 0,
      total: 0,
    };
    groups.forEach(g => {
      const s = String(g.status);
      if (s === 'PENDING_REVIEW') stats.pending = g._count._all;
      else if (s === 'APPROVED') stats.approved = g._count._all;
      else if (s === 'REJECTED') stats.rejected = g._count._all;
      else if (s === 'PROMOTED_TO_PROJECT') stats.promoted = g._count._all;
      else if (s === 'DRAFT') stats.draft = g._count._all as any;
      stats.total += g._count._all;
    });
    return res.json(stats);
  } catch (e: any) {
    console.error('GET /api/ideas/counts error:', e);
    return res.status(500).json({ message: 'Unable to load idea counts' });
  }
});

// Vote for an idea
app.post('/api/ideas/:id/vote', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const actorId = getActingUserId(req);
    const { voteType } = req.body || {};
    if (!actorId) return res.status(400).json({ error: 'User ID required' });

    // Check if user exists in database
    const userExists = await prisma.user.findUnique({ where: { id: actorId } });
    if (!userExists) {
      return res.status(400).json({ error: 'User not found. Please log in with a valid account.' });
    }

    const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';

    // Check if already voted
    const existing = await prisma.vote.findUnique({ 
      where: { ideaId_userId: { ideaId: id, userId: actorId } }
    }) as any;
    
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
            }
          }),
        ]);
      } else {
        // If different type, switch the vote
        await prisma.$transaction([
          prisma.vote.update({ where: { id: existing.id }, data: { voteType: type } as any }),
          prisma.idea.update({
            where: { id },
            data: {
              voteCount: type === 'UPVOTE' ? { increment: 2 } : { decrement: 2 } // net change of 2 when switching
            }
          }),
        ]);
      }
    } else {
      // Create new vote
      await prisma.$transaction([
        prisma.vote.create({ data: { ideaId: id, userId: actorId, voteType: type } as any }),
        prisma.idea.update({
          where: { id },
          data: {
            voteCount: type === 'UPVOTE' ? { increment: 1 } : { decrement: 1 },
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

    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    const userVote = idea.votes.find(v => v.userId === actorId) as any;
    const upvoteCount = idea.votes.filter((v: any) => v.voteType === 'UPVOTE').length;
    const downvoteCount = idea.votes.filter((v: any) => v.voteType === 'DOWNVOTE').length;
    
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
      upvoteCount,
      downvoteCount,
      viewCount: idea.viewCount,
      commentCount: idea._count?.comments || 0,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
      hasVoted: !!userVote,
      userVoteType: userVote?.voteType || null,
      votes: idea.votes.map((v: any) => ({
        id: v.id,
        userId: v.userId,
        userName: v.user.name || v.user.email,
        voteType: v.voteType,
        createdAt: v.createdAt
      }))
    });
  } catch (e: any) {
    console.error('POST /api/ideas/:id/vote error:', e);
    res.status(500).json({ error: 'Unable to vote', message: 'We were unable to process your vote. Please try again.' });
  }
});

// Remove vote from an idea
app.delete('/api/ideas/:id/vote', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const actorId = getActingUserId(req);
    if (!actorId) return res.status(400).json({ error: 'User ID required' });

    const existing = await prisma.vote.findUnique({ 
      where: { ideaId_userId: { ideaId: id, userId: actorId } }
    }) as any;
    if (!existing) return res.status(400).json({ error: 'not voted' });

    const wasUpvote = existing.voteType === 'UPVOTE';

    await prisma.$transaction([
      prisma.vote.delete({ where: { id: existing.id } }),
      prisma.idea.update({
        where: { id },
        data: {
          voteCount: wasUpvote ? { decrement: 1 } : { increment: 1 },
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

    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    const upvoteCount = idea.votes.filter((v: any) => v.voteType === 'UPVOTE').length;
    const downvoteCount = idea.votes.filter((v: any) => v.voteType === 'DOWNVOTE').length;
    
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
      upvoteCount,
      downvoteCount,
      viewCount: idea.viewCount,
      commentCount: idea._count?.comments || 0,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt,
      hasVoted: false,
      userVoteType: null,
      votes: idea.votes.map((v: any) => ({
        id: v.id,
        userId: v.userId,
        userName: v.user.name || v.user.email,
        voteType: v.voteType,
        createdAt: v.createdAt
      }))
    });
  } catch (e: any) {
    console.error('DELETE /api/ideas/:id/vote error:', e);
    res.status(500).json({ error: 'Unable to remove vote', message: 'We were unable to remove your vote. Please try again.' });
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

// Backwards-compatibility alias for legacy frontend calling /requests
app.get('/requests', async (req, res) => {
  return app._router.handle({ ...req, url: '/api/requests' } as any, res as any, (err: any) => {
    if (err) {
      console.error('Alias /requests -> /api/requests failed:', err);
      res.status(500).json({ message: 'Failed to fetch requests' });
    }
  });
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

import http from 'http';
let server: http.Server | null = null;

async function connectWithRetry(maxRetries = 5, delayMs = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await ensureDbConnection();
      console.log(`✅ Database connected on attempt ${attempt}`);
      return true;
    } catch (err: any) {
      console.error(`⚠️  DB connection attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries) {
        console.log(`   Retrying in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error(`❌ Failed to connect to database after ${maxRetries} attempts`);
  return false;
}

async function start() {
  try {
    const dbConnected = await connectWithRetry();
    
    // Start server even if DB is down - health endpoint will report DB status
    server = app.listen(PORT, () => {
      if (dbConnected) {
        console.log(`✅ API server listening on http://localhost:${PORT}`);
        console.log(`   Database: Connected`);
      } else {
        console.log(`⚠️  API server listening on http://localhost:${PORT}`);
        console.log(`   Database: NOT CONNECTED - some endpoints will fail`);
        console.log(`   Check DATABASE_URL in .env and ensure DB server is reachable`);
      }
    });
    
    // Background retry if initial connection failed
    if (!dbConnected) {
      setTimeout(async () => {
        console.log('🔄 Retrying database connection in background...');
        await connectWithRetry(999, 10000); // Keep trying every 10s
      }, 5000);
    }
  } catch (err) {
    console.error('❌ Startup error:', err);
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
