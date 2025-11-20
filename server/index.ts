import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { prisma, ensureDbConnection } from './prismaClient';
import { initRedis, closeRedis, cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from './config/redis';
import { initTrendingScoreJob, updateIdeaTrendingScore } from './services/trendingService';
import { findPotentialDuplicates } from './services/duplicateDetectionService';
import { searchIdeas, getSearchSuggestions } from './services/searchService';
import { batchUpdateIdeas, getCommitteeDashboardStats, getPendingIdeasForReview, getCommitteeMemberStats } from './services/committeeService';
import { initWebSocket, emitIdeaCreated, emitIdeaStatusChanged, emitVoteUpdated, emitBatchApproval, emitCommentAdded } from './services/websocketService';
import { initAnalyticsJob, stopAnalyticsJob, getAnalytics, getCategoryAnalytics, getTimeBasedAnalytics } from './services/analyticsService';
import { requestMonitoringMiddleware, trackCacheHit, trackCacheMiss, getMetrics, getHealthStatus, getSlowEndpoints, getErrorProneEndpoints } from './services/monitoringService';
import type { Prisma } from '@prisma/client';
import { requireCommittee as requireCommitteeRole, requireAdmin } from './middleware/rbac';
import { validate, createIdeaSchema, voteSchema, approveRejectIdeaSchema, promoteIdeaSchema, sanitizeInput as sanitize } from './middleware/validation';
import { errorHandler, notFoundHandler, asyncHandler, NotFoundError, BadRequestError } from './middleware/errorHandler';
import statsRouter from './routes/stats';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me';

let trendingJobInterval: NodeJS.Timeout | null = null;

// Rate limiting configurations
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute (very generous for development)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting in development for localhost
        const isDev = process.env.NODE_ENV !== 'production';
        const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip?.includes('localhost');
        return Boolean(isDev && isLocalhost);
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

const voteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 votes per minute
    message: 'Too many votes, please slow down.',
});

const ideaCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 ideas per hour
    message: 'Too many ideas submitted, please try again later.',
});

const batchLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 batch operations per 5 minutes
    message: 'Too many batch operations, please slow down.',
});

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(requestMonitoringMiddleware); // Performance monitoring
app.use(sanitize); // Sanitize all inputs
app.use('/api/', generalLimiter); // Apply general rate limiting to all API routes
// Static files for uploads
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// Utility: attempt to repair invalid Request.status values that break Prisma enum queries
async function fixInvalidRequestStatuses(): Promise<number | null> {
    try {
        // Normalize NULL or empty string statuses to a safe default
        const patched: any = await prisma.$executeRawUnsafe("UPDATE Request SET status = 'DRAFT' WHERE status IS NULL OR status = ''");
        // $executeRaw returns number of affected rows in some drivers or a Result object; coerce to number when possible
        if (typeof patched === 'number') return patched;
        if (patched && typeof patched.rowCount === 'number') return patched.rowCount;
        return 0;
    } catch (err) {
        console.warn('fixInvalidRequestStatuses: failed to patch invalid statuses:', err);
        return null;
    }
}

// Utility: repair invalid Idea.status values from legacy datasets to valid enum values
let ideaStatusPatched = false;
async function fixInvalidIdeaStatuses(): Promise<number | null> {
    try {
        // Map common legacy values to current enum
        // NULL/empty -> DRAFT
        // PENDING/UNDER_REVIEW -> PENDING_REVIEW
        // APPROVE -> APPROVED
        // PROMOTED -> PROMOTED_TO_PROJECT
        const updates: Array<{ sql: string; desc: string }> = [
            { sql: "UPDATE Idea SET status = 'DRAFT' WHERE status IS NULL OR status = ''", desc: 'null/empty -> DRAFT' },
            { sql: "UPDATE Idea SET status = 'PENDING_REVIEW' WHERE status IN ('PENDING','UNDER_REVIEW')", desc: 'legacy pending -> PENDING_REVIEW' },
            { sql: "UPDATE Idea SET status = 'APPROVED' WHERE status = 'APPROVE'", desc: 'APPROVE -> APPROVED' },
            { sql: "UPDATE Idea SET status = 'PROMOTED_TO_PROJECT' WHERE status = 'PROMOTED'", desc: 'PROMOTED -> PROMOTED_TO_PROJECT' },
        ];
        let total = 0;
        for (const u of updates) {
            const result: any = await prisma.$executeRawUnsafe(u.sql);
            if (typeof result === 'number') total += result;
            else if (result && typeof result.rowCount === 'number') total += result.rowCount;
        }

        // Fix missing project codes for promoted ideas
        const promotedIdeas = await prisma.idea.findMany({
            where: {
                status: 'PROMOTED_TO_PROJECT',
                projectCode: null,
            },
            select: { id: true, title: true },
        });

        for (const idea of promotedIdeas) {
            const code = `INNO-${new Date().getFullYear()}-${idea.id.toString().padStart(3, '0')}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
            await prisma.idea.update({
                where: { id: idea.id },
                data: { projectCode: code },
            });
            console.log(`[Startup] Generated project code ${code} for idea #${idea.id}: ${idea.title}`);
            total++;
        }

        ideaStatusPatched = true;
        return total;
    } catch (err) {
        console.warn('fixInvalidIdeaStatuses: failed to patch invalid statuses:', err);
        return null;
    }
}

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

// Separate multer instance for request attachments (allows documents)
const uploadAttachments = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, path.join(__dirname, 'uploads'));
        },
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname);
            const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
            cb(null, `attachment_${Date.now()}_${base}${ext}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for documents
    fileFilter: (_req, file, cb) => {
        console.log('[uploadAttachments] File:', file.originalname, 'Type:', file.mimetype);
        // Allow common document types and images
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
        ];
        // Also allow by file extension as backup
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'];

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            console.log('[uploadAttachments] Rejected file type:', file.mimetype, 'Extension:', ext);
            cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: PDF, Word, Excel, JPG, PNG`));
        }
    },
});

app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const health = getHealthStatus();
        res.json({
            status: health.status,
            database: 'connected',
            checks: health.checks,
            timestamp: new Date(),
        });
    } catch (e: any) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            message: e?.message || 'DB error',
            timestamp: new Date(),
        });
    }
});

// Monitoring and metrics endpoints
app.get('/api/metrics', (_req, res) => {
    try {
        const metrics = getMetrics();
        res.json(metrics);
    } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to get metrics' });
    }
});

app.get('/api/metrics/slow-endpoints', (_req, res) => {
    try {
        const slowEndpoints = getSlowEndpoints(15);
        res.json(slowEndpoints);
    } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to get slow endpoints' });
    }
});

app.get('/api/metrics/error-endpoints', (_req, res) => {
    try {
        const errorEndpoints = getErrorProneEndpoints(15);
        res.json(errorEndpoints);
    } catch (e: any) {
        res.status(500).json({ error: e?.message || 'Failed to get error endpoints' });
    }
});

// Analytics endpoints
app.get('/api/analytics', authMiddleware, async (_req, res) => {
    try {
        const cacheKey = 'analytics:overview';
        const cached = await cacheGet(cacheKey);
        if (cached) {
            trackCacheHit();
            return res.json(cached);
        }

        trackCacheMiss();
        const analytics = await getAnalytics();
        await cacheSet(cacheKey, analytics, 300); // 5 minute TTL
        res.json(analytics);
    } catch (e: any) {
        console.error('GET /api/analytics error:', e);
        res.status(500).json({ error: e?.message || 'Failed to get analytics' });
    }
});

// Innovation Hub Analytics (transformed format for frontend)
app.get('/api/innovation/analytics', authMiddleware, async (_req, res) => {
    try {
        const cacheKey = 'analytics:innovation';
        const cached = await cacheGet(cacheKey);
        if (cached) {
            trackCacheHit();
            return res.json(cached);
        }

        trackCacheMiss();
        const analytics = await getAnalytics();

        // Transform to match frontend AnalyticsData type
        const transformed = {
            kpis: {
                totalIdeas: analytics.totalIdeas || 0,
                underReview: analytics.ideasByStatus?.['PENDING_REVIEW'] || 0,
                approved: analytics.ideasByStatus?.['APPROVED'] || 0,
                promoted: analytics.ideasByStatus?.['PROMOTED_TO_PROJECT'] || 0,
                totalEngagement: analytics.totalVotes + analytics.totalComments + analytics.totalViews,
            },
            submissionsByMonth: analytics.submissionTrends?.slice(0, 12).map((t: any) => t.submissions || 0) || [],
            ideasByCategory: analytics.ideasByCategory || {},
            statusPipeline: {
                submitted: analytics.totalIdeas || 0,
                underReview: analytics.ideasByStatus?.['PENDING_REVIEW'] || 0,
                approved: analytics.ideasByStatus?.['APPROVED'] || 0,
                rejected: analytics.ideasByStatus?.['REJECTED'] || 0,
                promoted: analytics.ideasByStatus?.['PROMOTED_TO_PROJECT'] || 0,
            },
            topContributors:
                analytics.topContributors?.slice(0, 5).map((c: any) => ({
                    name: c.userName || 'Unknown',
                    ideas: c.ideasCount || 0,
                    votes: 0, // Not available in current analytics
                })) || [],
            weeklyEngagement: {
                views: analytics.submissionTrends?.slice(0, 7).map(() => 0) || [0, 0, 0, 0, 0, 0, 0],
                votes: analytics.votingTrends?.slice(0, 7).map((t: any) => t.votes || 0) || [0, 0, 0, 0, 0, 0, 0],
            },
        };

        await cacheSet(cacheKey, transformed, 300); // 5 minute TTL
        res.json(transformed);
    } catch (e: any) {
        console.error('GET /api/innovation/analytics error:', e);
        res.status(500).json({ error: e?.message || 'Failed to get analytics' });
    }
});

app.get('/api/analytics/category/:category', authMiddleware, async (req, res) => {
    try {
        const { category } = req.params as { category: string };
        const cacheKey = `analytics:category:${category}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            trackCacheHit();
            return res.json(cached);
        }

        trackCacheMiss();
        const analytics = await getCategoryAnalytics(category as any);
        await cacheSet(cacheKey, analytics, 300); // 5 minute TTL
        res.json(analytics);
    } catch (e: any) {
        console.error('GET /api/analytics/category/:category error:', e);
        res.status(500).json({ error: e?.message || 'Failed to get category analytics' });
    }
});

app.get('/api/analytics/time-based', authMiddleware, async (_req, res) => {
    try {
        const cacheKey = 'analytics:time-based';
        const cached = await cacheGet(cacheKey);
        if (cached) {
            trackCacheHit();
            return res.json(cached);
        }

        trackCacheMiss();
        const analytics = await getTimeBasedAnalytics();
        await cacheSet(cacheKey, analytics, 120); // 2 minute TTL
        res.json(analytics);
    } catch (e: any) {
        console.error('GET /api/analytics/time-based error:', e);
        res.status(500).json({ error: e?.message || 'Failed to get time-based analytics' });
    }
});

app.get('/api/ping', (_req, res) => {
    res.json({ pong: true });
});
// Auth endpoints
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
        });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        if (!user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });

        const ok = await bcrypt.compare(String(password), user.passwordHash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

        const roles = user.roles.map((r) => r.role.name);

        const token = jwt.sign({ sub: user.id, email: user.email, roles: roles, name: user.name }, JWT_SECRET, { expiresIn: '1d' });

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: roles,
                department: user.department
                    ? {
                          id: user.department.id,
                          name: user.department.name,
                          code: user.department.code,
                      }
                    : null,
            },
        });
    } catch (e: any) {
        console.error('Login error:', e);
        return res.status(500).json({ message: e?.message || 'Login failed' });
    }
});

async function authMiddleware(req: any, res: any, next: any) {
    // Accept either Bearer token OR x-user-id header for flexibility
    const auth = req.headers.authorization || '';
    const userId = req.headers['x-user-id'];

    // Try Bearer token first
    if (auth && auth.startsWith('Bearer ')) {
        const [, token] = auth.split(' ');
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            (req as any).user = payload;
            return next();
        } catch {
            // In development, fall back to x-user-id and hydrate roles from DB
            if (process.env.NODE_ENV !== 'production' && userId) {
                const userIdNum = parseInt(String(userId), 10);
                if (Number.isFinite(userIdNum)) {
                    try {
                        const u = await prisma.user.findUnique({
                            where: { id: userIdNum },
                            include: { roles: { include: { role: true } } },
                        });
                        const roles = Array.isArray(u?.roles) ? (u!.roles.map((r) => r.role?.name).filter(Boolean) as string[]) : [];
                        (req as any).user = { sub: userIdNum, roles, email: u?.email, name: u?.name };
                        return next();
                    } catch {
                        // fallback to minimal user if role hydrate fails
                        (req as any).user = { sub: userIdNum };
                        return next();
                    }
                }
            }
            return res.status(401).json({ message: 'Invalid token' });
        }
    }

    // Fallback to x-user-id header (for development/legacy support)
    if (userId) {
        const userIdNum = parseInt(String(userId), 10);
        if (Number.isFinite(userIdNum)) {
            // In development, hydrate roles so RBAC works as expected
            if (process.env.NODE_ENV !== 'production') {
                try {
                    const u = await prisma.user.findUnique({
                        where: { id: userIdNum },
                        include: { roles: { include: { role: true } } },
                    });
                    const roles = Array.isArray(u?.roles) ? (u!.roles.map((r) => r.role?.name).filter(Boolean) as string[]) : [];
                    (req as any).user = { sub: userIdNum, roles, email: u?.email, name: u?.name };
                } catch {
                    (req as any).user = { sub: userIdNum };
                }
            } else {
                // Create a minimal user object
                (req as any).user = { sub: userIdNum };
            }
            return next();
        }
    }

    return res.status(401).json({ message: 'Unauthorized - No valid authentication provided' });
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
                    role: true,
                },
            },
            department: true,
        },
    });
    if (!user) return res.status(404).json({ message: 'Not found' });
    const roles = user.roles.map((r) => r.role.name);
    return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        roles: roles,
        department: user.department
            ? {
                  id: user.department.id,
                  name: user.department.name,
                  code: user.department.code,
              }
            : null,
    });
});

// =============== Innovation Hub: Ideas (Committee) ===============

// List ideas with optional filters: status, sort
app.get('/api/ideas', authMiddleware, async (req, res) => {
    try {
        // Attempt a one-time repair of legacy enum values to avoid Prisma enum read errors
        if (!ideaStatusPatched) {
            await fixInvalidIdeaStatuses().catch(() => undefined);
        }
        const {
            status,
            sort,
            include,
            mine,
            cursor,
            limit = '20',
            tag,
        } = req.query as {
            status?: string;
            sort?: string;
            include?: string;
            mine?: string;
            cursor?: string;
            limit?: string;
            tag?: string | string[];
        };
        const user = (req as any).user as { roles?: string[]; sub?: number };
        const isCommittee = user.roles && user.roles.includes('INNOVATION_COMMITTEE');
        const userId = user.sub;

        // Generate cache key based on query params and user
        const cacheKey = `ideas:${userId}:${status || 'all'}:${sort || 'recent'}:${include || 'none'}:${mine || 'false'}:${cursor || 'start'}:${limit}`;

        // Try to get from cache first
        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const where: any = {};

        // Filter to current user's ideas if mine=true
        if (mine === 'true' && user.sub) {
            where.submittedBy = user.sub;
        }

        // Filter by tag name(s) if provided (supports comma-separated or multiple query params)
        if (tag) {
            const tags = Array.isArray(tag)
                ? tag.flatMap((t) =>
                      String(t)
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                  )
                : String(tag)
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
            if (tags.length) {
                where.tags = {
                    some: { tag: { name: { in: tags } } },
                } as any;
            }
        }
        // If user is NOT committee and not filtering to their own, show APPROVED and PROMOTED ideas
        else if (!isCommittee) {
            where.status = { in: ['APPROVED', 'PROMOTED_TO_PROJECT'] };
        } else if (status && status !== 'all') {
            // Committee members can filter by status
            const map: Record<string, string> = {
                pending: 'PENDING_REVIEW',
                approved: 'APPROVED',
                rejected: 'REJECTED',
                promoted: 'PROMOTED_TO_PROJECT',
            };
            const s = map[status] || status;
            where.status = s;
        }

        // OPTIMIZED: Use pre-calculated trending score for trending sort
        const orderBy: any = sort === 'trending' ? { trendingScore: 'desc' } : sort === 'popularity' ? { voteCount: 'desc' } : { createdAt: 'desc' };

        const includeAttachments = include === 'attachments';
        const take = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 items per page

        const ideas = await prisma.idea.findMany({
            where,
            orderBy,
            take: take + 1, // Fetch one extra to determine if there are more results
            ...(cursor && {
                cursor: { id: parseInt(cursor, 10) },
                skip: 1, // Skip the cursor itself
            }),
            include: {
                attachments: includeAttachments,
                submitter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                tags: {
                    include: { tag: true },
                },
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });

        // OPTIMIZED: Batch load all user votes in a single query to fix N+1 problem
        const userVotes =
            userId && ideas.length > 0
                ? await prisma.vote.findMany({
                      where: {
                          userId,
                          ideaId: { in: ideas.map((i) => i.id) },
                      },
                      select: { ideaId: true, voteType: true },
                  })
                : [];

        // Create a Map for O(1) vote lookups
        const voteMap = new Map(userVotes.map((v) => [v.ideaId, v.voteType]));

        // Map ideas with votes and comment count - now O(n) instead of O(n²)
        const ideasWithVotes = ideas.map((idea: any) => ({
            ...idea,
            commentCount: idea._count?.comments || 0,
            hasVoted: voteMap.has(idea.id) ? (voteMap.get(idea.id) === 'UPVOTE' ? 'up' : 'down') : null,
            submittedBy: idea.isAnonymous ? 'Anonymous' : idea.submitter?.name || idea.submitter?.email || 'Unknown',
            tags: Array.isArray(idea.tags) ? idea.tags.map((it: any) => it.tag?.name).filter(Boolean) : [],
            tagObjects: Array.isArray(idea.tags) ? idea.tags.map((it: any) => ({ id: it.tagId, name: it.tag?.name })).filter((t: any) => t.name) : [],
        }));

        // Generate ETag from response content
        const responseBody = JSON.stringify(ideasWithVotes);
        const etag = `"${crypto.createHash('md5').update(responseBody).digest('hex')}"`;

        // Check if client's ETag matches (304 Not Modified)
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === etag) {
            return res.status(304).end();
        }

        // Cache the result for 30 seconds
        await cacheSet(cacheKey, ideasWithVotes, 30);

        // Send response with ETag header
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, max-age=30');
        return res.json(ideasWithVotes);
    } catch (e: any) {
        console.error('GET /api/ideas error:', e);
        const message = String(e?.message || '');
        // Retry once after attempting to patch invalid enum values
        if (message.includes("not found in enum 'IdeaStatus'")) {
            const patched = await fixInvalidIdeaStatuses();
            if (patched !== null) {
                try {
                    // Re-run the handler logic by recursively delegating to this route without patch attempt
                    // Simplest: respond with a 307 redirect to the same URL so client retries automatically
                    // But to avoid client loop, perform a direct second query here.
                    const { status, sort, include, mine, cursor, limit = '20' } = req.query as any;
                    const user = (req as any).user as { roles?: string[]; sub?: number };
                    const isCommittee = user.roles && user.roles.includes('INNOVATION_COMMITTEE');
                    const userId = user.sub;
                    const where: any = {};
                    if (mine === 'true' && user.sub) {
                        where.submittedBy = user.sub;
                    } else if (!isCommittee) {
                        where.status = 'APPROVED';
                    } else if (status && status !== 'all') {
                        const map: Record<string, string> = {
                            pending: 'PENDING_REVIEW',
                            approved: 'APPROVED',
                            rejected: 'REJECTED',
                            promoted: 'PROMOTED_TO_PROJECT',
                        };
                        const s = map[status] || status;
                        where.status = s;
                    }
                    const orderBy: any = sort === 'trending' ? { trendingScore: 'desc' } : sort === 'popularity' ? { voteCount: 'desc' } : { createdAt: 'desc' };
                    const includeAttachments = include === 'attachments';
                    const take = Math.min(parseInt(limit, 10) || 20, 100);
                    const ideas = await prisma.idea.findMany({
                        where,
                        orderBy,
                        take: take + 1,
                        ...(cursor && { cursor: { id: parseInt(cursor, 10) }, skip: 1 }),
                        include: {
                            attachments: includeAttachments,
                            submitter: { select: { id: true, name: true, email: true } },
                        },
                    });
                    const userVotes =
                        userId && ideas.length > 0 ? await prisma.vote.findMany({ where: { userId, ideaId: { in: ideas.map((i) => i.id) } }, select: { ideaId: true, voteType: true } }) : [];
                    const voteMap = new Map(userVotes.map((v) => [v.ideaId, v.voteType]));
                    const ideasWithVotes = ideas.map((idea: any) => ({
                        ...idea,
                        commentCount: idea._count?.comments || 0,
                        hasVoted: voteMap.has(idea.id) ? (voteMap.get(idea.id) === 'UPVOTE' ? 'up' : 'down') : null,
                        submittedBy: idea.isAnonymous ? 'Anonymous' : idea.submitter?.name || idea.submitter?.email || 'Unknown',
                    }));
                    const responseBody = JSON.stringify(ideasWithVotes);
                    const etag = `"${crypto.createHash('md5').update(responseBody).digest('hex')}"`;
                    res.setHeader('ETag', etag);
                    res.setHeader('Cache-Control', 'private, max-age=30');
                    return res.json(ideasWithVotes);
                } catch (retryErr: any) {
                    console.error('GET /api/ideas retry after status patch failed:', retryErr);
                }
            }
        }
        return res.status(500).json({ error: 'Unable to load ideas', message: 'Unable to load ideas. Please try again later.' });
    }
});

// Counts for dashboard (pending, approved, rejected, promoted)
app.get('/api/ideas/counts', async (_req, res) => {
    try {
        const [pending, approved, rejected, promoted] = await Promise.all([
            prisma.idea.count({ where: { status: 'PENDING_REVIEW' } }).catch(() => 0),
            prisma.idea.count({ where: { status: 'APPROVED' } }).catch(() => 0),
            prisma.idea.count({ where: { status: 'REJECTED' } }).catch(() => 0),
            // Many schemas used 'PROMOTED_TO_PROJECT' for promoted stage (fallback to legacy 'PROMOTED')
            prisma.idea.count({ where: { OR: [{ status: 'PROMOTED_TO_PROJECT' }, { status: 'PROMOTED' as any }] } }).catch(() => 0),
        ]);
        res.json({ pending, approved, rejected, promoted });
    } catch (err) {
        console.error('GET /api/ideas/counts error:', err);
        res.status(500).json({ error: 'Unable to load idea counts' });
    }
});

// OPTIMIZED: Search ideas with relevance scoring
app.get('/api/ideas/search', authMiddleware, async (req, res) => {
    try {
        const { q, status, category, limit, offset } = req.query as {
            q?: string;
            status?: string;
            category?: string;
            limit?: string;
            offset?: string;
        };

        if (!q || q.trim().length < 2) {
            return res.json({ results: [], total: 0, message: 'Query too short' });
        }

        const user = (req as any).user as { sub?: number };
        const searchResults = await searchIdeas(q, {
            status: status?.split(','),
            category: category?.split(','),
            userId: undefined, // Search across all users
            limit: parseInt(limit || '20', 10),
            offset: parseInt(offset || '0', 10),
        });

        return res.json(searchResults);
    } catch (e: any) {
        console.error('GET /api/ideas/search error:', e);
        return res.status(500).json({ error: 'Search failed', message: 'Unable to search ideas' });
    }
});

// Get search suggestions for autocomplete
app.get('/api/ideas/search/suggestions', authMiddleware, async (req, res) => {
    try {
        const { q } = req.query as { q?: string };

        if (!q || q.trim().length < 2) {
            return res.json({ suggestions: [] });
        }

        const suggestions = await getSearchSuggestions(q, 10);
        return res.json({ suggestions });
    } catch (e: any) {
        console.error('GET /api/ideas/search/suggestions error:', e);
        return res.json({ suggestions: [] });
    }
});

// Get single idea (optionally with attachments)
app.get('/api/ideas/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const { include } = req.query as { include?: string };
        const user = (req as any).user as { sub?: number };
        const includeAttachments = include === 'attachments';
        const userId = user.sub;

        // OPTIMIZED: Fetch idea and user vote in parallel
        const [idea, userVote] = await Promise.all([
            prisma.idea.findUnique({
                where: { id: parseInt(id, 10) },
                include: {
                    attachments: includeAttachments,
                    submitter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    tags: { include: { tag: true } },
                    _count: {
                        select: {
                            comments: true,
                        },
                    },
                },
            }),
            userId
                ? prisma.vote.findFirst({
                      where: { ideaId: parseInt(id, 10), userId },
                      select: { voteType: true },
                  })
                : Promise.resolve(null),
        ]);

        if (!idea) return res.status(404).json({ message: 'Idea not found' });

        const hasVoted = userVote ? (userVote.voteType === 'UPVOTE' ? 'up' : 'down') : null;
        const submittedBy = idea.isAnonymous ? 'Anonymous' : idea.submitter?.name || idea.submitter?.email || 'Unknown';
        const commentCount = idea._count?.comments || 0;

        // Increment view count and update trending score (non-blocking)
        const ideaId = parseInt(id, 10);
        prisma.idea
            .update({
                where: { id: ideaId },
                data: { viewCount: { increment: 1 } },
            })
            .then(() => updateIdeaTrendingScore(ideaId))
            .catch((err) => console.error('Failed to update view count/trending:', err));

        const tags = Array.isArray((idea as any).tags) ? (idea as any).tags.map((it: any) => it.tag?.name).filter(Boolean) : [];
        const tagObjects = Array.isArray((idea as any).tags) ? (idea as any).tags.map((it: any) => ({ id: it.tagId, name: it.tag?.name })).filter((t: any) => t.name) : [];

        return res.json({ ...idea, hasVoted, submittedBy, commentCount, tags, tagObjects });
    } catch (e: any) {
        console.error('GET /api/ideas/:id error:', e);
        return res.status(500).json({ error: 'Unable to load idea', message: 'Unable to load idea details. Please try again later.' });
    }
});

// Get comments for an idea
app.get('/api/ideas/:id/comments', async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const ideaId = parseInt(id, 10);

        const comments = await prisma.ideaComment.findMany({
            where: { ideaId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        const formatted = comments.map((c) => ({
            id: c.id,
            ideaId: c.ideaId,
            userId: c.userId,
            userName: c.user?.name || c.user?.email || 'Unknown',
            text: c.text,
            parentId: c.parentId,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }));

        return res.json(formatted);
    } catch (e: any) {
        console.error('GET /api/ideas/:id/comments error:', e);
        return res.status(500).json({ message: 'Failed to fetch comments' });
    }
});

// Post a comment on an idea
app.post('/api/ideas/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const ideaId = parseInt(id, 10);
        const user = (req as any).user as { sub: number };
        const { text, parentId } = req.body || {};

        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        // Verify idea exists
        const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        // Create comment
        const comment = await prisma.ideaComment.create({
            data: {
                ideaId,
                userId: user.sub,
                text: String(text).trim(),
                parentId: parentId ? parseInt(String(parentId), 10) : null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Emit WebSocket event
        emitCommentAdded(ideaId, {
            id: comment.id,
            ideaId: comment.ideaId,
            userId: comment.userId,
            userName: comment.user?.name || comment.user?.email || 'Unknown',
            text: comment.text,
            parentId: comment.parentId,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
        });

        // Format response
        const formatted = {
            id: comment.id,
            ideaId: comment.ideaId,
            userId: comment.userId,
            userName: comment.user?.name || comment.user?.email || 'Unknown',
            text: comment.text,
            parentId: comment.parentId,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
        };

        return res.status(201).json(formatted);
    } catch (e: any) {
        console.error('POST /api/ideas/:id/comments error:', e);
        return res.status(500).json({ message: 'Failed to create comment' });
    }
});

// Get related ideas based on similarity
app.get('/api/ideas/:id/related', async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const ideaId = parseInt(id, 10);

        // Get the current idea
        const idea = await prisma.idea.findUnique({
            where: { id: ideaId },
            select: { title: true, description: true, category: true },
        });

        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        // Find similar ideas based on category (simple implementation)
        // TODO: Implement more sophisticated similarity matching
        const related = await prisma.idea.findMany({
            where: {
                id: { not: ideaId },
                category: idea.category,
                status: 'APPROVED',
            },
            take: 5,
            orderBy: { trendingScore: 'desc' },
            include: {
                attachments: {
                    take: 1,
                    select: { fileUrl: true },
                },
            },
        });

        const formatted = related.map((r) => ({
            id: r.id,
            title: r.title,
            snippet: r.description.substring(0, 150) + '...',
            score: Math.round((r.trendingScore || 0) * 100),
            firstAttachmentUrl: r.attachments[0]?.fileUrl || null,
        }));

        return res.json({ related: formatted });
    } catch (e: any) {
        console.error('GET /api/ideas/:id/related error:', e);
        return res.status(500).json({ message: 'Failed to fetch related ideas' });
    }
});

// Check for duplicate ideas based on title/description similarity
app.post('/api/ideas/check-duplicates', authMiddleware, async (req, res) => {
    try {
        const { title, description } = req.body || {};
        if (!title || !description) {
            return res.json({ matches: [] });
        }

        // OPTIMIZED: Use fuzzy matching for better duplicate detection
        const matches = await findPotentialDuplicates(String(title), String(description), {
            thresholdTitle: 0.6, // 60% title similarity
            thresholdDescription: 0.5, // 50% description similarity
            limit: 5,
            excludeRejected: true,
        });

        // Format for frontend
        const formattedMatches = matches.map((match) => ({
            id: match.id,
            title: match.title,
            description: match.description.substring(0, 200) + '...', // Truncate
            status: match.status,
            similarity: Math.round(match.overallSimilarity * 100), // Percentage
        }));

        return res.json({ matches: formattedMatches });
    } catch (e: any) {
        console.error('POST /api/ideas/check-duplicates error:', e);
        return res.json({ matches: [] }); // Don't fail submission on duplicate check error
    }
});

// Create a new idea (optional single image upload)
app.post('/api/ideas', authMiddleware, ideaCreationLimiter, upload.single('image'), async (req, res) => {
    try {
        const user = (req as any).user as { sub: number | string };
        const { title, description, category } = (req.body || {}) as Record<string, string>;
        const tagIdsRaw = (req.body?.tagIds ?? '') as string;

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

        // Attach tags if provided (expects comma-separated list of ids)
        const tagIds: number[] = String(tagIdsRaw)
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n));
        if (tagIds.length) {
            // createMany for efficiency; ignore duplicates
            await prisma.ideaTag.createMany({
                data: tagIds.map((tid) => ({ ideaId: idea.id, tagId: tid })),
                skipDuplicates: true,
            });
        }

        if (req.file) {
            const fileUrl = `http://heron:4000/uploads/${req.file.filename}`;
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
        const created = await prisma.idea.findUnique({
            where: { id: idea.id },
            include: { attachments: true, tags: { include: { tag: true } } },
        });

        // Emit WebSocket event
        emitIdeaCreated(created);

        // Invalidate cache
        await cacheDeletePattern('ideas:*');

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

        // Emit WebSocket event
        emitIdeaStatusChanged(updated.id, 'PENDING_REVIEW', 'APPROVED');

        // Invalidate ideas cache
        await cacheDeletePattern('ideas:*');

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

        // Invalidate ideas cache
        await cacheDeletePattern('ideas:*');

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /api/ideas/:id/reject error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to reject idea' });
    }
});

// Promote an idea to project (requires APPROVED) - optimized to single query
app.post('/api/ideas/:id/promote', authMiddleware, requireCommittee, async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const { projectCode } = (req.body || {}) as { projectCode?: string };

        const code = projectCode && String(projectCode).trim().length > 0 ? String(projectCode).trim() : `BSJ-PROJ-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

        // Optimized: Use updateMany with conditional where - no separate findUnique
        const result = await prisma.idea.updateMany({
            where: {
                id: parseInt(id, 10),
                status: 'APPROVED', // Only promote if approved
            },
            data: {
                status: 'PROMOTED_TO_PROJECT',
                promotedAt: new Date(),
                projectCode: code,
            },
        });

        if (result.count === 0) {
            // Check if idea exists or is not approved
            const idea = await prisma.idea.findUnique({ where: { id: parseInt(id, 10) } });
            if (!idea) return res.status(404).json({ message: 'Idea not found' });
            return res.status(400).json({ message: 'Idea must be APPROVED before promotion' });
        }

        // Fetch updated idea to return full data
        const updated = await prisma.idea.findUnique({ where: { id: parseInt(id, 10) } });

        // Invalidate ideas cache
        await cacheDeletePattern('ideas:*');

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /api/ideas/:id/promote error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to promote idea' });
    }
});

// Batch approve ideas (committee efficiency)
app.post('/api/ideas/batch/approve', authMiddleware, requireCommittee, batchLimiter, async (req, res) => {
    try {
        const { ideaIds, notes } = req.body as { ideaIds?: number[]; notes?: string };
        const user = (req as any).user as { sub: number };
        const userId = user?.sub;

        if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
            return res.status(400).json({ message: 'ideaIds array is required' });
        }

        if (ideaIds.length > 100) {
            return res.status(400).json({ message: 'Maximum 100 ideas per batch' });
        }

        const result = await batchUpdateIdeas(ideaIds, 'APPROVE', userId, notes);
        await cacheDeletePattern('ideas:*');

        // Emit WebSocket event
        emitBatchApproval(ideaIds, 'APPROVE', result.updated);

        return res.json({
            message: `Approved ${result.updated} ideas`,
            updated: result.updated,
            failed: result.failed,
        });
    } catch (e: any) {
        console.error('POST /api/ideas/batch/approve error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to batch approve ideas' });
    }
});

// Batch reject ideas (committee efficiency)
app.post('/api/ideas/batch/reject', authMiddleware, requireCommittee, batchLimiter, async (req, res) => {
    try {
        const { ideaIds, notes } = req.body as { ideaIds?: number[]; notes?: string };
        const user = (req as any).user as { sub: number };
        const userId = user?.sub;

        if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
            return res.status(400).json({ message: 'ideaIds array is required' });
        }

        if (ideaIds.length > 100) {
            return res.status(400).json({ message: 'Maximum 100 ideas per batch' });
        }

        const result = await batchUpdateIdeas(ideaIds, 'REJECT', userId, notes);
        await cacheDeletePattern('ideas:*');

        // Emit WebSocket event
        emitBatchApproval(ideaIds, 'REJECT', result.updated);

        return res.json({
            message: `Rejected ${result.updated} ideas`,
            updated: result.updated,
            failed: result.failed,
        });
    } catch (e: any) {
        console.error('POST /api/ideas/batch/reject error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to batch reject ideas' });
    }
});

// Get committee dashboard statistics
app.get('/api/committee/dashboard/stats', authMiddleware, requireCommittee, async (req, res) => {
    try {
        const cacheKey = 'committee:dashboard:stats';
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const stats = await getCommitteeDashboardStats();
        await cacheSet(cacheKey, stats, 60); // 1 minute TTL for dashboard stats

        return res.json(stats);
    } catch (e: any) {
        console.error('GET /api/committee/dashboard/stats error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch committee dashboard stats' });
    }
});

// Get pending ideas for committee review (optimized with eager loading)
app.get('/api/committee/pending', authMiddleware, requireCommittee, async (req, res) => {
    try {
        const { limit, offset, sortBy, category } = req.query as {
            limit?: string;
            offset?: string;
            sortBy?: string;
            category?: string;
        };

        const cacheKey = `committee:pending:${limit}:${offset}:${sortBy}:${category || 'all'}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const result = await getPendingIdeasForReview({
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0,
            sortBy: (sortBy as 'recent' | 'votes' | 'oldest') || 'recent',
            category,
        });

        await cacheSet(cacheKey, result, 30); // 30 second TTL
        return res.json(result);
    } catch (e: any) {
        console.error('GET /api/committee/pending error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch pending ideas' });
    }
});

// Get committee member review stats
app.get('/api/committee/member/:userId/stats', authMiddleware, requireCommittee, async (req, res) => {
    try {
        const { userId } = req.params as { userId: string };
        const cacheKey = `committee:member:${userId}:stats`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const stats = await getCommitteeMemberStats(parseInt(userId));
        await cacheSet(cacheKey, stats, 120); // 2 minute TTL

        return res.json(stats);
    } catch (e: any) {
        console.error('GET /api/committee/member/:userId/stats error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch committee member stats' });
    }
});

// POST /api/ideas/:id/vote - upvote/downvote an idea
app.post('/api/ideas/:id/vote', authMiddleware, voteLimiter, async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const { voteType } = (req.body || {}) as { voteType?: 'UPVOTE' | 'DOWNVOTE' };
        const user = (req as any).user as { sub: number };
        const userId = user?.sub;

        if (!userId) return res.status(401).json({ message: 'User ID required' });

        const idea = await prisma.idea.findUnique({ where: { id: parseInt(id, 10) } });
        if (!idea) return res.status(404).json({ message: 'Idea not found' });

        const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';
        const ideaId = parseInt(id, 10);

        // OPTIMIZED: Use atomic transaction to prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
            // Check existing vote
            const existing = await tx.vote.findFirst({
                where: { ideaId, userId },
            });

            let voteCountDelta = 0;
            let upvoteCountDelta = 0;
            let downvoteCountDelta = 0;

            if (existing) {
                if (existing.voteType === type) {
                    // Same vote - return current state without changes
                    const idea = await tx.idea.findUnique({ where: { id: ideaId } });
                    return { idea, hasVoted: type === 'UPVOTE' ? 'up' : 'down' };
                }

                // Change vote type: remove old vote, add new vote
                await tx.vote.update({
                    where: { id: existing.id },
                    data: { voteType: type },
                });

                if (existing.voteType === 'UPVOTE' && type === 'DOWNVOTE') {
                    // Changing from upvote to downvote
                    voteCountDelta = -2; // -1 for removing upvote, -1 for adding downvote
                    upvoteCountDelta = -1;
                    downvoteCountDelta = 1;
                } else if (existing.voteType === 'DOWNVOTE' && type === 'UPVOTE') {
                    // Changing from downvote to upvote
                    voteCountDelta = 2; // +1 for removing downvote, +1 for adding upvote
                    upvoteCountDelta = 1;
                    downvoteCountDelta = -1;
                }
            } else {
                // Create new vote
                await tx.vote.create({
                    data: { ideaId, userId, voteType: type },
                });

                if (type === 'UPVOTE') {
                    voteCountDelta = 1;
                    upvoteCountDelta = 1;
                } else {
                    voteCountDelta = -1;
                    downvoteCountDelta = 1;
                }
            }

            // Atomic increment/decrement - no race conditions
            const updated = await tx.idea.update({
                where: { id: ideaId },
                data: {
                    voteCount: { increment: voteCountDelta },
                    upvoteCount: { increment: upvoteCountDelta },
                    downvoteCount: { increment: downvoteCountDelta },
                },
            });

            return { idea: updated, hasVoted: type === 'UPVOTE' ? 'up' : 'down' };
        });

        const { idea: updated, hasVoted } = result;

        // Invalidate ideas cache for all users since vote counts changed
        await cacheDeletePattern('ideas:*');

        // Update trending score in background (non-blocking)
        updateIdeaTrendingScore(ideaId).catch((err) => console.error('Failed to update trending score:', err));

        // Emit WebSocket event
        if (updated) {
            emitVoteUpdated(ideaId, updated.voteCount, updated.trendingScore);
        }

        return res.json({ ...updated, hasVoted });
    } catch (e: any) {
        console.error('POST /api/ideas/:id/vote error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to vote' });
    }
});

// DELETE /api/ideas/:id/vote - remove vote
app.delete('/api/ideas/:id/vote', authMiddleware, voteLimiter, async (req, res) => {
    try {
        const { id } = req.params as { id: string };
        const user = (req as any).user as { sub: number };
        const userId = user?.sub;

        if (!userId) return res.status(401).json({ message: 'User ID required' });

        const ideaId = parseInt(id, 10);

        // OPTIMIZED: Use atomic transaction for vote removal
        const idea = await prisma.$transaction(async (tx) => {
            const existing = await tx.vote.findFirst({
                where: { ideaId, userId },
            });

            if (!existing) {
                throw new Error('Vote not found');
            }

            const wasUpvote = existing.voteType === 'UPVOTE';

            // Delete vote
            await tx.vote.delete({ where: { id: existing.id } });

            // Atomic decrement
            return await tx.idea.update({
                where: { id: ideaId },
                data: {
                    voteCount: { increment: wasUpvote ? -1 : 1 },
                    upvoteCount: wasUpvote ? { decrement: 1 } : undefined,
                    downvoteCount: wasUpvote ? undefined : { decrement: 1 },
                },
            });
        });

        // Invalidate ideas cache for all users since vote counts changed
        await cacheDeletePattern('ideas:*');

        // Update trending score in background (non-blocking)
        updateIdeaTrendingScore(ideaId).catch((err) => console.error('Failed to update trending score:', err));

        // After deletion, hasVoted should be null
        return res.json({ ...idea, hasVoted: null });
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
        // Handle invalid enum values in legacy rows by attempting an automatic repair then retrying once
        const message = String(e?.message || '');
        if (message.includes("not found in enum 'RequestStatus'")) {
            const patched = await fixInvalidRequestStatuses();
            if (patched !== null) {
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
                } catch (retryErr: any) {
                    console.error('GET /requests retry after patch failed:', retryErr);
                }
            }
        }
        return res.status(500).json({ message: 'Failed to fetch requests' });
    }
});

// POST /requests - create a new procurement request (with optional file attachments)
app.post(
    '/requests',
    (req, res, next) => {
        uploadAttachments.array('attachments', 10)(req, res, (err) => {
            if (err) {
                console.error('[POST /requests] Multer error:', err);
                return res.status(400).json({
                    message: err.message || 'File upload failed',
                    error: err.message,
                });
            }
            next();
        });
    },
    async (req, res) => {
        try {
            console.log('[POST /requests] Request received');
            console.log('[POST /requests] Headers:', req.headers['x-user-id']);
            console.log('[POST /requests] Body keys:', Object.keys(req.body));
            console.log('[POST /requests] Files:', req.files ? (req.files as any[]).map((f) => f.originalname) : 'none');

            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ message: 'User ID required' });
            }

            const { title, description, departmentId, items = [], totalEstimated, currency, priority, procurementType } = req.body || {};

            console.log('[POST /requests] Parsed fields - title:', title, 'departmentId:', departmentId);

            if (!title || !departmentId) {
                return res.status(400).json({ message: 'Title and department are required' });
            }

            // Parse items if it comes as JSON string (from FormData)
            let parsedItems;
            try {
                parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
                console.log('[POST /requests] Parsed items count:', parsedItems.length);
            } catch (parseErr: any) {
                console.error('[POST /requests] Failed to parse items:', parseErr);
                return res.status(400).json({ message: 'Invalid items format', error: parseErr.message });
            }

            // Generate reference
            const reference = `REQ-${Date.now()}`;

            console.log('[POST /requests] Creating request with reference:', reference);

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
                        create: parsedItems.map((it: any) => ({
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

            console.log('[POST /requests] Request created with ID:', created.id);

            // Handle file attachments
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                console.log('[POST /requests] Processing', req.files.length, 'file attachments');
                for (const file of req.files) {
                    const fileUrl = `http://heron:4000/uploads/${file.filename}`;
                    console.log('[POST /requests] Creating attachment:', file.originalname);
                    await prisma.requestAttachment.create({
                        data: {
                            requestId: created.id,
                            filename: file.originalname,
                            url: fileUrl,
                            mimeType: file.mimetype,
                            uploadedById: parseInt(String(userId), 10),
                        },
                    });
                }
            }

            // Reload with attachments
            const final = await prisma.request.findUnique({
                where: { id: created.id },
                include: {
                    items: true,
                    requester: { select: { id: true, name: true, email: true } },
                    department: { select: { id: true, name: true, code: true } },
                    attachments: true,
                },
            });

            return res.status(201).json(final);
        } catch (e: any) {
            console.error('POST /requests error:', e);
            return res.status(500).json({ message: e?.message || 'Failed to create request' });
        }
    }
);

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
                attachments: true,
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
        const message = String(e?.message || '');
        if (message.includes("not found in enum 'RequestStatus'")) {
            const patched = await fixInvalidRequestStatuses();
            if (patched !== null) {
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
                            attachments: true,
                            statusHistory: true,
                            actions: true,
                        },
                    });
                    if (!request) return res.status(404).json({ message: 'Request not found' });
                    return res.json(request);
                } catch (retryErr: any) {
                    console.error('GET /requests/:id retry after patch failed:', retryErr);
                }
            }
        }
        return res.status(500).json({ message: 'Failed to fetch request' });
    }
});

// PATCH /requests/:id - update an existing request
app.patch('/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body || {};

        // Remove deprecated fields that no longer exist in schema
        const { budgetOfficerApproved, budgetManagerApproved, ...cleanUpdates } = updates;

        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: cleanUpdates,
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

        // Remove deprecated fields that no longer exist in schema
        const { budgetOfficerApproved, budgetManagerApproved, ...cleanUpdates } = updates;

        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: cleanUpdates,
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

// GET /requests/:id/pdf - generate PDF for a request
app.get('/requests/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const request = await prisma.request.findUnique({
            where: { id: parseInt(id, 10) },
            include: {
                items: true,
                requester: true,
                department: true,
                currentAssignee: true,
            },
        });

        if (!request) {
            return res.status(404).json({ error: 'Not Found', message: 'Route GET /requests/9/pdf does not exist', statusCode: 404 });
        }

        // Load HTML template
        const templatePath = path.join(process.cwd(), 'server', 'templates', 'request-pdf.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        // Helper to format date
        const formatDate = (date: Date | null | undefined) => {
            if (!date) return '—';
            return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };

        // Helper to format currency
        const formatCurrency = (value: any) => {
            if (value == null) return '—';
            return parseFloat(String(value)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Generate items rows
        const itemsRows = request.items
            .map(
                (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.description || '—'}</td>
          <td style="text-align: center;">${item.quantity || '—'}</td>
          <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align: right;">${formatCurrency(parseFloat(String(item.quantity || 0)) * parseFloat(String(item.unitPrice || 0)))}</td>
        </tr>`
            )
            .join('');

        // Replace placeholders
        html = html
            .replace('{{reference}}', request.reference || '—')
            .replace('{{submittedAt}}', formatDate(request.submittedAt))
            .replace('{{requesterName}}', request.requester?.name || '—')
            .replace('{{requesterEmail}}', request.requester?.email || '—')
            .replace('{{departmentName}}', request.department?.name || '—')
            .replace('{{priority}}', request.priority || '—')
            .replace('{{currency}}', request.currency || 'JMD')
            .replace(/{{totalEstimated}}/g, formatCurrency(request.totalEstimated))
            .replace('{{description}}', request.description || '—')
            .replace('{{itemsRows}}', itemsRows)
            .replace('{{managerName}}', request.managerName || '—')
            .replace('{{managerApprovalDate}}', formatDate(request.actionDate))
            .replace('{{headName}}', request.headName || '—')
            .replace('{{hodApprovalDate}}', formatDate(request.actionDate))
            .replace('{{budgetOfficerName}}', request.budgetOfficerName || '—')
            .replace('{{budgetManagerName}}', request.budgetManagerName || '—')
            .replace('{{financeApprovalDate}}', formatDate(request.actionDate))
            .replace('{{commitmentNumber}}', request.commitmentNumber || '—')
            .replace('{{accountingCode}}', request.accountingCode || '—')
            .replace('{{procurementApprovalDate}}', formatDate(request.actionDate))
            .replace('{{status}}', request.status || '—')
            .replace('{{assigneeName}}', request.currentAssignee?.name || '—')
            .replace('{{submittedDate}}', formatDate(request.submittedAt))
            .replace('{{procurementCaseNumber}}', request.procurementCaseNumber || '—')
            .replace('{{receivedBy}}', request.receivedBy || '—')
            .replace('{{dateReceived}}', formatDate(request.dateReceived))
            .replace('{{actionDate}}', formatDate(request.actionDate))
            .replace('{{procurementComments}}', request.procurementComments || '—')
            .replace('{{now}}', new Date().toLocaleString('en-US'));

        // Try chrome-based render first; if it fails (server missing deps), fallback to PDFKit
        let pdf: Buffer | null = null;
        try {
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            });
            await browser.close();
        } catch (chromeErr) {
            console.error('Puppeteer render failed, falling back to PDFKit:', chromeErr);
        }

        if (!pdf) {
            // Minimal, reliable fallback using PDFKit (no system deps)
            const { default: PDFDocument } = await import('pdfkit');
            const doc = new PDFDocument({ size: 'A4', margin: 28 });
            const chunks: Buffer[] = [];
            const done = new Promise<Buffer>((resolve) => {
                doc.on('data', (d: Buffer) => chunks.push(d));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
            });

            doc.fontSize(14).text('BUREAU OF STANDARDS JAMAICA', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(12).text('PROCUREMENT REQUISITION FORM', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10);
            const ref = request.reference || String(id);
            doc.text(`Reference: ${ref}`);
            doc.text(`Submitted: ${request.submittedAt ? new Date(request.submittedAt).toLocaleString() : '—'}`);
            doc.moveDown();
            doc.text(`Requested by: ${request.requester?.name || '—'} (${request.requester?.email || '—'})`);
            doc.text(`Department: ${request.department?.name || '—'}`);
            doc.text(`Priority: ${request.priority || '—'} | Currency: ${request.currency || 'JMD'}`);
            doc.text(`Estimated Total: ${request.totalEstimated ?? '—'}`);
            doc.moveDown();
            doc.text('Justification:', { underline: true });
            doc.text(request.description || '—');
            doc.moveDown();
            doc.text('Items:', { underline: true });
            request.items.forEach((it: any, idx: number) => {
                const qty = it.quantity ?? '—';
                const up = it.unitPrice ?? '—';
                const sub = (Number(it.quantity || 0) * Number(it.unitPrice || 0)).toFixed(2);
                doc.text(`${idx + 1}. ${it.description || '—'} | Qty: ${qty} | Unit: ${up} | Subtotal: ${sub}`);
            });
            doc.end();
            pdf = await done;
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="request-${request.reference || id}.pdf"`);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Length', String(pdf.length));
        res.status(200).end(pdf);
    } catch (e: any) {
        console.error('GET /requests/:id/pdf error:', e);
        return res.status(500).json({ error: 'PDF Generation Failed', message: e?.message || 'Failed to generate PDF' });
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
                            name: 'DEPT_MANAGER',
                        },
                    },
                },
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
                        roles: { some: { role: { name: 'HEAD_OF_DIVISION' } } },
                    },
                });
                nextStatus = 'HOD_REVIEW';
                nextAssigneeId = hod?.id || null;
            } else if (request.status === 'HOD_REVIEW') {
                // HOD approved -> send to Finance Officer
                const financeOfficer = await prisma.user.findFirst({
                    where: { roles: { some: { role: { name: 'FINANCE' } } } },
                });
                nextStatus = 'FINANCE_REVIEW';
                nextAssigneeId = financeOfficer?.id || null;
            } else if (request.status === 'FINANCE_REVIEW') {
                // Finance Officer approved -> MUST go to Budget Manager (required step)
                const budgetManager = await prisma.user.findFirst({
                    where: { roles: { some: { role: { name: 'BUDGET_MANAGER' } } } },
                });
                nextStatus = 'BUDGET_MANAGER_REVIEW';
                nextAssigneeId = budgetManager?.id || null;
            } else if (request.status === 'BUDGET_MANAGER_REVIEW') {
                // Budget Manager approved -> send to Procurement for final processing
                const procurement = await prisma.user.findFirst({
                    where: { roles: { some: { role: { name: 'PROCUREMENT' } } } },
                });
                nextStatus = 'PROCUREMENT_REVIEW';
                nextAssigneeId = procurement?.id || null;
            } else if (request.status === 'PROCUREMENT_REVIEW') {
                // Procurement approved -> final approval (ready to send to vendor)
                nextStatus = 'FINANCE_APPROVED';
                nextAssigneeId = null;
            }
        } else if (action === 'SEND_TO_VENDOR') {
            if (request.status !== 'FINANCE_APPROVED') {
                return res.status(400).json({ message: 'Can only send to vendor after finance approval' });
            }
            nextStatus = 'SENT_TO_VENDOR';
            nextAssigneeId = null;
        } else if (action === 'REJECT') {
            // Rejected -> send back to requester as DRAFT
            nextStatus = 'DRAFT';
            nextAssigneeId = request.requesterId;
        }

        // Update request with new status (with safe fallback if enum is missing in DB)
        let updated;
        try {
            updated = await prisma.request.update({
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
        } catch (e: any) {
            const msg = String(e?.message || '');
            const enumProblem = msg.includes('BUDGET_MANAGER_REVIEW') || msg.toLowerCase().includes('invalid enum');
            if (enumProblem && request.status === 'FINANCE_REVIEW') {
                // Fallback: if DB enum lacks BUDGET_MANAGER_REVIEW, treat as FINANCE_APPROVED
                const procurement = await prisma.user.findFirst({
                    where: { roles: { some: { role: { name: 'PROCUREMENT' } } } },
                });
                const fallbackStatus = 'FINANCE_APPROVED' as const;
                updated = await prisma.request.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        status: fallbackStatus,
                        currentAssigneeId: procurement?.id || null,
                        statusHistory: {
                            create: {
                                status: fallbackStatus,
                                changedById: parseInt(String(userId), 10),
                                comment: 'Approved at FINANCE_REVIEW (fallback applied)',
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
                console.warn('Fallback applied: DB enum missing BUDGET_MANAGER_REVIEW; advanced to FINANCE_APPROVED');
            } else {
                throw e;
            }
        }

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /requests/:id/action error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to process action' });
    }
});

// GET /api/tags - list all tags
app.get('/api/tags', async (_req, res) => {
    try {
        const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
        res.json(tags.map((t) => ({ id: t.id, name: t.name })));
    } catch (e: any) {
        console.error('GET /api/tags error:', e);
        res.status(500).json({ message: 'Failed to fetch tags' });
    }
});

// POST /api/tags - create new tag (idempotent by name)
app.post('/api/tags', async (req, res) => {
    try {
        const { name } = (req.body || {}) as { name?: string };
        const trimmed = (name || '').trim();
        if (!trimmed) {
            return res.status(400).json({ message: 'Tag name is required' });
        }

        // Try to find existing by exact name; if not exists, create
        let tag = await prisma.tag.findUnique({ where: { name: trimmed } });
        if (!tag) {
            tag = await prisma.tag.create({ data: { name: trimmed } });
        }
        res.status(201).json({ id: tag.id, name: tag.name });
    } catch (e: any) {
        console.error('POST /api/tags error:', e);
        res.status(500).json({ message: 'Failed to create tag' });
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
        const message = String(e?.message || '');
        if (message.includes("not found in enum 'RequestStatus'")) {
            const patched = await fixInvalidRequestStatuses();
            if (patched !== null) {
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
                            createdAt: true,
                            updatedAt: true,
                            requester: { select: { id: true, name: true, email: true } },
                            department: { select: { id: true, name: true, code: true } },
                        },
                    });
                    return res.json(requests);
                } catch (retryErr: any) {
                    console.error('GET /api/requests retry after patch failed:', retryErr);
                }
            }
        }
        if (e?.code === 'P2022') {
            try {
                const rows = await prisma.$queryRawUnsafe('SELECT id, reference, title, requesterId, departmentId, status, createdAt, updatedAt FROM Request ORDER BY createdAt DESC');
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
                roles: { include: { role: true } },
            },
            orderBy: { email: 'asc' },
        });

        const formatted = users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            department: u.department?.name || null,
            roles: u.roles.map((r) => r.role.name),
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
        const { assigneeId, comment, newStatus } = req.body || {};
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ message: 'User ID required' });

        // Verify admin
        const admin = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const isAdmin = admin?.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });

        const request = await prisma.request.findUnique({
            where: { id: parseInt(id, 10) },
            include: { currentAssignee: true, department: true },
        });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // Validate optional newStatus against known enum values
        const VALID_STATUSES = [
            'DRAFT',
            'SUBMITTED',
            'DEPARTMENT_REVIEW',
            'DEPARTMENT_RETURNED',
            'DEPARTMENT_APPROVED',
            'HOD_REVIEW',
            'PROCUREMENT_REVIEW',
            'FINANCE_REVIEW',
            'FINANCE_RETURNED',
            'FINANCE_APPROVED',
            'SENT_TO_VENDOR',
            'CLOSED',
            'REJECTED',
        ];
        let targetStatus: string = request.status;
        if (newStatus) {
            const upper = String(newStatus).toUpperCase();
            if (!VALID_STATUSES.includes(upper)) {
                return res.status(400).json({ message: `Invalid status '${newStatus}'` });
            }
            targetStatus = upper;
        } else if (!newStatus && assigneeId) {
            // Optional auto inference: advance if assignment implies next stage (light heuristic)
            // Map role -> implied status if current stage precedes it
            const assignee = await prisma.user.findUnique({
                where: { id: parseInt(String(assigneeId), 10) },
                include: { roles: { include: { role: true } }, department: true },
            });
            const roleNames = assignee?.roles.map((r) => r.role.name) || [];
            const has = (r: string) => roleNames.includes(r);
            // Progression chain heuristics
            if (request.status === 'DRAFT' && has('DEPT_MANAGER')) targetStatus = 'DEPARTMENT_REVIEW';
            else if (request.status === 'DEPARTMENT_REVIEW' && has('HEAD_OF_DIVISION')) targetStatus = 'HOD_REVIEW';
            else if (request.status === 'HOD_REVIEW' && has('PROCUREMENT')) targetStatus = 'PROCUREMENT_REVIEW';
            else if (request.status === 'PROCUREMENT_REVIEW' && has('FINANCE')) targetStatus = 'FINANCE_REVIEW';
            else if (request.status === 'FINANCE_REVIEW' && !assigneeId) targetStatus = 'FINANCE_APPROVED';
        }

        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: {
                currentAssigneeId: assigneeId ? parseInt(String(assigneeId), 10) : null,
                status: targetStatus as any,
                statusHistory: {
                    create: {
                        status: targetStatus as any,
                        changedById: parseInt(String(userId), 10),
                        comment: comment || (newStatus ? `Status set to ${targetStatus} and reassigned by admin` : 'Request manually reassigned by admin'),
                    },
                },
                actions: {
                    create: {
                        action: 'ASSIGN',
                        performedById: parseInt(String(userId), 10),
                        comment: comment || 'Admin reassignment',
                        metadata: { previousAssigneeId: request.currentAssigneeId, newAssigneeId: assigneeId ? parseInt(String(assigneeId), 10) : null },
                    },
                },
            },
            include: {
                items: true,
                requester: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true, code: true } },
                currentAssignee: { select: { id: true, name: true, email: true } },
                statusHistory: true,
                actions: true,
            },
        });

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /admin/requests/:id/reassign error:', e);
        return res.status(500).json({ message: 'Failed to reassign request' });
    }
});

// POST /admin/maintenance/fix-invalid-request-statuses - Admin maintenance to repair invalid enum values
app.post('/admin/maintenance/fix-invalid-request-statuses', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }
        const admin = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const isAdmin = admin?.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const patched = await fixInvalidRequestStatuses();
        if (patched === null) return res.status(500).json({ message: 'Failed to perform maintenance' });
        return res.json({ patched });
    } catch (e: any) {
        console.error('POST /admin/maintenance/fix-invalid-request-statuses error:', e);
        res.status(500).json({ message: 'Failed to run maintenance task' });
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

// Stats API routes
app.use('/api/stats', statsRouter);

// No longer need this - using httpServer created at top
// let server: http.Server | null = null;

// ============================================
// ERROR HANDLING - Must be last
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
    try {
        await ensureDbConnection();
        await initRedis(); // Initialize Redis cache (non-blocking)
        trendingJobInterval = initTrendingScoreJob(); // Start trending score background job
        initAnalyticsJob(); // Start analytics aggregation job
        initWebSocket(httpServer); // Initialize WebSocket server

        httpServer.listen(PORT, () => {
            console.log(`API server listening on http://localhost:${PORT}`);
            console.log(`WebSocket server ready on ws://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (err) {
        console.error('Startup error:', err);
        // Fail fast so tsx watch can restart cleanly
        process.exit(1);
    }
}

function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Clear trending job
    if (trendingJobInterval) {
        clearInterval(trendingJobInterval);
        trendingJobInterval = null;
    }

    // Stop analytics job
    stopAnalyticsJob();

    const closeServer = () =>
        new Promise<void>((resolve) => {
            if (httpServer) {
                httpServer.close(() => resolve());
            } else {
                resolve();
            }
        });

    Promise.all([closeServer(), prisma.$disconnect().catch(() => undefined), closeRedis().catch(() => undefined)]).then(() => {
        console.log('Cleanup complete. Exiting.');
        process.exit(0);
    });
}

['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((sig) => {
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
