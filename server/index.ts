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
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import rateLimit from 'express-rate-limit';
import { prisma, ensureDbConnection } from './prismaClient';
import { initRedis, closeRedis, cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from './config/redis';
import { initializeGlobalRoleResolver } from './services/roleResolver';
import { getGroupMappings } from './config/ldapGroupMapping';
import { initTrendingScoreJob, updateIdeaTrendingScore } from './services/trendingService';
import { findPotentialDuplicates } from './services/duplicateDetectionService';
import { searchIdeas, getSearchSuggestions } from './services/searchService';
import { batchUpdateIdeas, getCommitteeDashboardStats, getPendingIdeasForReview, getCommitteeMemberStats } from './services/committeeService';
import { initWebSocket, emitIdeaCreated, emitIdeaStatusChanged, emitVoteUpdated, emitBatchApproval, emitCommentAdded, broadcastSystemStats } from './services/websocketService';
import { initAnalyticsJob, stopAnalyticsJob, getAnalytics, getCategoryAnalytics, getTimeBasedAnalytics } from './services/analyticsService';
import { requestMonitoringMiddleware, trackCacheHit, trackCacheMiss, getMetrics, getHealthStatus, getSlowEndpoints, getErrorProneEndpoints } from './services/monitoringService';
import { checkProcurementThresholds } from './services/thresholdService';
import { checkSplintering } from './services/splinteringService';
import { createThresholdNotifications } from './services/notificationService';
import { getLoadBalancingSettings, updateLoadBalancingSettings, autoAssignRequest, autoAssignFinanceOfficer, shouldAutoAssign } from './services/loadBalancingService';
import type { Prisma } from '@prisma/client';
import { requireCommittee as requireCommitteeRole, requireEvaluationCommittee, requireAdmin, requireExecutive, requireRole } from './middleware/rbac';
import { validate, createIdeaSchema, voteSchema, approveRejectIdeaSchema, promoteIdeaSchema, sanitizeInput as sanitize } from './middleware/validation';
import { errorHandler, notFoundHandler, asyncHandler, NotFoundError, BadRequestError } from './middleware/errorHandler';
import statsRouter from './routes/stats';
import combineRouter from './routes/combine';
import { authRoutes } from './routes/auth';
import adminRouter from './routes/admin';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const APP_ENV = process.env.APP_ENV || 'production';
// In production, bind to 0.0.0.0 unless overridden via API_HOST
// Bind address for the HTTP server. In local development we bind to 0.0.0.0
// so that other hostnames (e.g. Docker host aliases like `heron`) can reach the server.
const API_HOST = process.env.API_HOST || (APP_ENV === 'local' ? '0.0.0.0' : '0.0.0.0');
// Public host for logs (what users type in the browser)
const PUBLIC_HOST = process.env.API_PUBLIC_HOST || (APP_ENV === 'local' ? 'localhost' : 'heron');
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret-change-me';

let trendingJobInterval: NodeJS.Timeout | null = null;
let systemStatsInterval: NodeJS.Timeout | null = null;
const SERVER_START_TIME = Date.now();

// Initialize global RoleResolver early so middleware can use it
try {
    const rolesPermissionsPath = path.resolve(__dirname, './config/roles-permissions.json');

    // Convert array group mappings to simple key->role mapping expected by RoleResolver
    const groupArray = getGroupMappings();
    const ldapGroupMappings: Record<string, string> = {};
    for (const gm of groupArray) {
        if (gm.adGroupName && Array.isArray(gm.roles) && gm.roles.length > 0) {
            // Pick first role in mapping as the primary mapping
            ldapGroupMappings[gm.adGroupName] = gm.roles[0];
        }
    }

    const rbacConfig = {
        rolesPermissionsPath,
        ldapGroupMappings,
        ldapAttributeMappings: {},
        cacheTTL: 60 * 60 * 1000,
        defaultRole: 'REQUESTER',
        enableDatabaseOverrides: true,
    } as any;

    initializeGlobalRoleResolver(rbacConfig);
} catch (err) {
    // Do not crash server on RBAC init failure; log and continue
    // Middleware falls back to DB roles when resolver is unavailable
    // (see server/middleware/auth.ts for fallback behavior)
    // eslint-disable-next-line no-console
    console.warn('[RBAC] Failed to initialize global role resolver:', err);
}

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
    max: 50, // 50 login attempts per 15 minutes
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
// Body parsing middleware - MUST come before routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev'));
app.use(requestMonitoringMiddleware); // Performance monitoring
app.use(sanitize); // Sanitize all inputs
app.use('/api/', generalLimiter); // Apply general rate limiting to all API routes
// Static files for uploads
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// Utility: attempt to repair invalid Request.status values that break Prisma enum queries
// Covers NULL/empty and common legacy statuses not present in current enum
async function fixInvalidRequestStatuses(): Promise<number | null> {
    try {
        let total = 0;

        // 1) NULL or empty -> DRAFT
        const r1: any = await prisma.$executeRawUnsafe("UPDATE Request SET status = 'DRAFT' WHERE status IS NULL OR status = ''");
        total += typeof r1 === 'number' ? r1 : r1?.rowCount ?? 0;

        // 2) Legacy names -> current enum
        const updates: Array<{ sql: string; desc: string }> = [
            { sql: "UPDATE Request SET status = 'SUBMITTED' WHERE status IN ('PENDING','UNDER_REVIEW')", desc: 'PENDING/UNDER_REVIEW -> SUBMITTED' },
            { sql: "UPDATE Request SET status = 'DEPARTMENT_REVIEW' WHERE status IN ('DEPT_REVIEW','DEPARTMENT_APPROVAL','DEPARTMENT_REVIEWING')", desc: 'Dept legacy -> DEPARTMENT_REVIEW' },
            { sql: "UPDATE Request SET status = 'BUDGET_MANAGER_REVIEW' WHERE status IN ('BUDGET_REVIEW','BUDGET_OFFICER_REVIEW')", desc: 'Budget legacy -> BUDGET_MANAGER_REVIEW' },
            { sql: "UPDATE Request SET status = 'EXECUTIVE_REVIEW' WHERE status IN ('EXECUTIVE_APPROVED','EXECUTIVE_APPROVAL')", desc: 'Executive legacy -> EXECUTIVE_REVIEW' },
            { sql: "UPDATE Request SET status = 'FINANCE_APPROVED' WHERE status = 'APPROVED'", desc: 'APPROVED (generic) -> FINANCE_APPROVED' },
            { sql: "UPDATE Request SET status = 'PROCUREMENT_REVIEW' WHERE status IN ('PROCUREMENT','PROCUREMENT_APPROVED','PROCUREMENT_APPROVAL')", desc: 'Procurement legacy -> PROCUREMENT_REVIEW' },
        ];
        for (const u of updates) {
            const r: any = await prisma.$executeRawUnsafe(u.sql);
            total += typeof r === 'number' ? r : r?.rowCount ?? 0;
        }

        // 3) Anything still not in the enum -> DRAFT as a safe fallback
        const allowed = [
            'DRAFT',
            'SUBMITTED',
            'DEPARTMENT_REVIEW',
            'DEPARTMENT_RETURNED',
            'DEPARTMENT_APPROVED',
            'EXECUTIVE_REVIEW',
            'HOD_REVIEW',
            'PROCUREMENT_REVIEW',
            'FINANCE_REVIEW',
            'FINANCE_RETURNED',
            'BUDGET_MANAGER_REVIEW',
            'FINANCE_APPROVED',
            'SENT_TO_VENDOR',
            'CLOSED',
            'REJECTED',
        ];
        const rCatchAll: any = await prisma.$executeRawUnsafe(`UPDATE Request SET status = 'DRAFT' WHERE status IS NOT NULL AND status NOT IN (${allowed.map((s) => `'${s}'`).join(',')})`);
        total += typeof rCatchAll === 'number' ? rCatchAll : rCatchAll?.rowCount ?? 0;

        return total;
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
            // Use the same uploads directory served by express.static (UPLOAD_DIR)
            // UPLOAD_DIR is created earlier in the file and points to process.cwd()/uploads
            const dest = path.resolve(process.cwd(), 'uploads');
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            cb(null, dest);
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

// Auth endpoints are now in /routes/auth.ts and mounted at /api/auth

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

// =============== Notifications & Messages ===============

// GET /api/notifications - Fetch user notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const user = (req as any).user as { sub?: number };
        const userId = user.sub;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Fetch notifications for the user, ordered by most recent first
        let notifications;
        try {
            notifications = await prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 50, // Limit to last 50 notifications
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
        } catch (err: any) {
            // Handle cases where DB contains enum values not present in the Prisma schema
            const msg = String(err?.message || '');
            if (msg.toLowerCase().includes('not found in enum') || msg.toLowerCase().includes('invalid enum')) {
                console.warn('Prisma enum mismatch when fetching notifications, falling back to raw query:', msg);
                try {
                    // Use a raw SQL query to avoid Prisma enum coercion errors. Results will be raw rows.
                    const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`, userId);
                    notifications = rows || [];
                } catch (rawErr) {
                    console.error('Raw fallback for notifications failed:', rawErr);
                    throw rawErr;
                }
            } else {
                throw err;
            }
        }

        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('GET /api/notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// PATCH /api/notifications/:id/read - Mark notification as read
app.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        const user = (req as any).user as { sub?: number };
        const userId = user.sub;
        const notificationId = parseInt(req.params.id, 10);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (isNaN(notificationId)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }

        // Verify notification belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (notification.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this notification' });
        }

        // Mark as read
        const updated = await prisma.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
        });

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('PATCH /api/notifications/:id/read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// DELETE /api/notifications/:id - Delete notification
app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
        const user = (req as any).user as { sub?: number };
        const userId = user.sub;
        const notificationId = parseInt(req.params.id, 10);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (isNaN(notificationId)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }

        // Verify notification belongs to user
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (notification.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this notification' });
        }

        // Delete notification
        await prisma.notification.delete({
            where: { id: notificationId },
        });

        res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        console.error('DELETE /api/notifications/:id error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// GET /api/messages - Fetch user messages
app.get('/api/messages', authMiddleware, async (req, res) => {
    try {
        const user = (req as any).user as { sub?: number };
        const userId = user.sub;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Fetch messages where user is the recipient
        const messages = await prisma.message.findMany({
            where: { toUserId: userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: messages,
        });
    } catch (error) {
        console.error('GET /api/messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// PATCH /api/messages/:id/read - Mark message as read
app.patch('/api/messages/:id/read', authMiddleware, async (req, res) => {
    try {
        const user = (req as any).user as { sub?: number };
        const userId = user.sub;
        const messageId = parseInt(req.params.id, 10);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (isNaN(messageId)) {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }

        // Verify message is for this user
        const message = await prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        if (message.toUserId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this message' });
        }

        // Mark as read
        const updated = await prisma.message.update({
            where: { id: messageId },
            data: { readAt: new Date() },
        });

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('PATCH /api/messages/:id/read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// DELETE /api/messages/:id - Delete message
app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
    try {
        const user = (req as any).user as { sub?: number };
        const userId = user.sub;
        const messageId = parseInt(req.params.id, 10);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (isNaN(messageId)) {
            return res.status(400).json({ success: false, message: 'Invalid message ID' });
        }

        // Verify message is for this user
        const message = await prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        if (message.toUserId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
        }

        // Delete message
        await prisma.message.delete({
            where: { id: messageId },
        });

        res.json({
            success: true,
            message: 'Message deleted',
        });
    } catch (error) {
        console.error('DELETE /api/messages/:id error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

// =============== Innovation Hub: Ideas (Committee) ===============// List ideas with optional filters: status, sort
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
            include: {
                submitter: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Create notification for idea submitter
        if (updated.submittedBy) {
            await prisma.notification
                .create({
                    data: {
                        userId: updated.submittedBy,
                        type: 'IDEA_APPROVED',
                        message: `Your innovation idea "${updated.title}" has been approved by the committee!`,
                        data: { ideaId: updated.id, reviewNotes: notes },
                    },
                })
                .catch((err: any) => console.error('Failed to create approval notification:', err));

            // Create message for idea submitter
            await prisma.message
                .create({
                    data: {
                        fromUserId: user.sub,
                        toUserId: updated.submittedBy,
                        subject: `Innovation Idea Approved: ${updated.title}`,
                        body: `Great news! Your innovation idea "${updated.title}" has been reviewed and approved by the Innovation Committee.${
                            notes ? `\n\nReviewer Notes: ${notes}` : ''
                        }\n\nYou can now track its progress in the Innovation Hub dashboard.`,
                    },
                })
                .catch((err: any) => console.error('Failed to create approval message:', err));
        }

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
            include: {
                submitter: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Create notification for idea submitter
        if (updated.submittedBy) {
            await prisma.notification
                .create({
                    data: {
                        userId: updated.submittedBy,
                        type: 'STAGE_CHANGED',
                        message: `Your innovation idea "${updated.title}" has been reviewed`,
                        data: { ideaId: updated.id, status: 'REJECTED', reviewNotes: notes },
                    },
                })
                .catch((err: any) => console.error('Failed to create rejection notification:', err));

            // Create message for idea submitter with feedback
            await prisma.message
                .create({
                    data: {
                        fromUserId: user.sub,
                        toUserId: updated.submittedBy,
                        subject: `Innovation Idea Review: ${updated.title}`,
                        body: `Thank you for submitting your innovation idea "${
                            updated.title
                        }". After careful review by the Innovation Committee, we are unable to proceed with this idea at this time.${
                            notes ? `\n\nReviewer Feedback: ${notes}` : ''
                        }\n\nWe encourage you to continue innovating and submitting new ideas!`,
                    },
                })
                .catch((err: any) => console.error('Failed to create rejection message:', err));
        }

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

        // Get the idea first to notify submitter
        const idea = await prisma.idea.findUnique({
            where: { id: parseInt(id, 10) },
            include: {
                submitter: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' });
        }

        if (idea.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Idea must be approved before promotion' });
        }

        // Update to promoted status
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
            return res.status(400).json({ message: 'Idea must be APPROVED before promotion or not found' });
        }

        // Create notification for idea submitter
        if (idea.submittedBy) {
            const user = (req as any).user as { sub: number };
            await prisma.notification
                .create({
                    data: {
                        userId: idea.submittedBy,
                        type: 'STAGE_CHANGED',
                        message: `Your innovation idea "${idea.title}" has been promoted to a project!`,
                        data: { ideaId: idea.id, projectCode: code },
                    },
                })
                .catch((err: any) => console.error('Failed to create promotion notification:', err));

            // Create message for idea submitter
            await prisma.message
                .create({
                    data: {
                        fromUserId: user.sub,
                        toUserId: idea.submittedBy,
                        subject: `Innovation Idea Promoted: ${idea.title}`,
                        body: `Congratulations! Your innovation idea "${idea.title}" has been promoted to an official project!\\n\\nProject Code: ${code}\\n\\nThis is a significant achievement and demonstrates the value of your innovative thinking. The project team will be in touch with next steps.`,
                    },
                })
                .catch((err: any) => console.error('Failed to create promotion message:', err));
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
                totalEstimated: true,
                currency: true,
                procurementType: true,
                createdAt: true,
                updatedAt: true,
                isCombined: true,
                combinedRequestId: true,
                lotNumber: true,
                requester: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true, code: true } },
                currentAssignee: { select: { id: true, name: true, email: true } },
                headerDeptCode: true,
                headerMonth: true,
                headerYear: true,
                headerSequence: true,
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
                            totalEstimated: true,
                            currency: true,
                            procurementType: true,
                            createdAt: true,
                            updatedAt: true,
                            isCombined: true,
                            combinedRequestId: true,
                            lotNumber: true,
                            requester: { select: { id: true, name: true, email: true } },
                            department: { select: { id: true, name: true, code: true } },
                            currentAssignee: { select: { id: true, name: true, email: true } },
                            headerDeptCode: true,
                            headerMonth: true,
                            headerYear: true,
                            headerSequence: true,
                        },
                    });
                    return res.json(requests);
                } catch (retryE: any) {
                    const retryMessage = String(retryE?.message || '');
                    return res.status(500).json({
                        error: 'Failed to retrieve requests after attempted repair',
                        details: retryMessage,
                    });
                }
            } else {
                return res.status(500).json({
                    error: 'Request status repair required but failed',
                    details: message,
                });
            }
        }
        return res.status(500).json({ error: message });
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

            const { title, description, departmentId, items = [], totalEstimated, currency, priority, procurementType, headerDeptCode, headerMonth, headerYear, headerSequence } = req.body || {};

            console.log('[POST /requests] Parsed fields - title:', title, 'departmentId:', departmentId);
            console.log('[POST /requests] Header fields - deptCode:', headerDeptCode, 'month:', headerMonth, 'year:', headerYear, 'seq:', headerSequence);

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
                    headerDeptCode: headerDeptCode || null,
                    headerMonth: headerMonth || null,
                    headerYear: headerYear ? parseInt(String(headerYear), 10) : null,
                    headerSequence: headerSequence ? parseInt(String(headerSequence), 10) : null,
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

            // Check if request exceeds thresholds and notify procurement officers
            try {
                const totalValue = totalEstimated || 0;
                const procurementTypes = Array.isArray(procurementType) ? procurementType : procurementType ? [procurementType] : [];
                const requestCurrency = currency || 'JMD';

                console.log(`[POST /requests] Checking threshold - Value: ${requestCurrency} ${totalValue}, Types: ${JSON.stringify(procurementTypes)}`);

                const thresholdResult = checkProcurementThresholds(totalValue, procurementTypes, requestCurrency);

                console.log(`[POST /requests] Threshold check result:`, {
                    requiresExecutiveApproval: thresholdResult.requiresExecutiveApproval,
                    thresholdAmount: thresholdResult.thresholdAmount,
                    category: thresholdResult.category,
                    reason: thresholdResult.reason,
                });

                if (thresholdResult.requiresExecutiveApproval) {
                    console.log(`[POST /requests] Request ${created.reference} exceeds threshold, notifying procurement officers`);

                    // Send notifications to procurement officers
                    await createThresholdNotifications({
                        requestId: created.id,
                        requestReference: created.reference,
                        requestTitle: title,
                        requesterName: final?.requester?.name || 'Unknown',
                        departmentName: final?.department?.name || 'Unknown',
                        totalValue,
                        currency: requestCurrency,
                        thresholdAmount: thresholdResult.thresholdAmount,
                        category: thresholdResult.category,
                    });

                    console.log(`[POST /requests] Threshold notifications sent successfully for ${created.reference}`);
                } else {
                    console.log(`[POST /requests] Request ${created.reference} does not exceed threshold (${requestCurrency} ${totalValue} < ${requestCurrency} ${thresholdResult.thresholdAmount})`);
                }
            } catch (notificationError) {
                // Don't fail the request creation if notifications fail
                console.error('[POST /requests] Failed to send threshold notifications:', notificationError);
            }

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
                headerDeptCode: true,
                headerMonth: true,
                headerYear: true,
                headerSequence: true,
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

        // DEBUG: log incoming numeric fields before coercion to help diagnose why strings persist
        try {
            console.info(`[DEBUG] PUT /requests/${id} incoming types before coercion:`, {
                headerSequence: cleanUpdates.headerSequence,
                headerYear: cleanUpdates.headerYear,
                lotNumber: cleanUpdates.lotNumber,
                headerSequenceType: typeof cleanUpdates.headerSequence,
                headerYearType: typeof cleanUpdates.headerYear,
            });
        } catch (logErr) {
            // ignore logging errors
        }

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        try {
            console.info(`[DEBUG] PUT /requests/${id} types after coercion:`, {
                headerSequence: cleanUpdates.headerSequence,
                headerYear: cleanUpdates.headerYear,
                lotNumber: cleanUpdates.lotNumber,
                headerSequenceType: typeof cleanUpdates.headerSequence,
                headerYearType: typeof cleanUpdates.headerYear,
            });
        } catch (logErr) {}

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        // Coerce numeric fields sent as strings (e.g. headerSequence '005') to integers
        try {
            if ('headerSequence' in cleanUpdates) {
                const v = cleanUpdates.headerSequence;
                cleanUpdates.headerSequence = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerSequence !== null && Number.isNaN(cleanUpdates.headerSequence)) {
                    return res.status(400).json({ message: 'Invalid headerSequence; expected integer or null' });
                }
            }
            if ('headerYear' in cleanUpdates) {
                const v = cleanUpdates.headerYear;
                cleanUpdates.headerYear = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.headerYear !== null && Number.isNaN(cleanUpdates.headerYear)) {
                    return res.status(400).json({ message: 'Invalid headerYear; expected integer or null' });
                }
            }
            if ('lotNumber' in cleanUpdates) {
                const v = cleanUpdates.lotNumber;
                cleanUpdates.lotNumber = v === '' || v === null ? null : parseInt(String(v), 10);
                if (cleanUpdates.lotNumber !== null && Number.isNaN(cleanUpdates.lotNumber)) {
                    return res.status(400).json({ message: 'Invalid lotNumber; expected integer or null' });
                }
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid numeric field in update' });
        }

        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: cleanUpdates,
            include: {
                items: true,
                requester: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true, code: true } },
            },
        });

        // Create a notification for the new assignee (if any)
        try {
            const assigneeId = updated.currentAssigneeId || null;
            if (assigneeId) {
                await prisma.notification.create({
                    data: {
                        userId: Number(assigneeId),
                        type: 'STAGE_CHANGED',
                        message: `Request ${updated.reference || updated.id} has been submitted and assigned to you for ${updated.status}`,
                        data: { requestId: updated.id, status: updated.status },
                    },
                });
            }
        } catch (notifErr) {
            console.warn('Failed to create notification on submit:', notifErr);
        }

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
        const actorUserIdRaw = req.headers['x-user-id'];
        const actingUserId = actorUserIdRaw ? parseInt(String(actorUserIdRaw), 10) : null;

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

        // Notify the assignee after explicit assignment
        try {
            const assigneeId = updated.currentAssigneeId || null;
            if (assigneeId) {
                await prisma.notification.create({
                    data: {
                        userId: Number(assigneeId),
                        type: 'STAGE_CHANGED',
                        message: `Request ${updated.reference || updated.id} has been assigned to you for ${updated.status}`,
                        data: { requestId: updated.id, status: updated.status, assignedBy: actingUserId },
                    },
                });
            }
        } catch (notifErr) {
            console.warn('Failed to create notification on assign:', notifErr);
        }

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
            .replace('{{managerApprovalDate}}', formatDate(request.actionDate ? new Date(request.actionDate) : null))
            .replace('{{headName}}', request.headName || '—')
            .replace('{{hodApprovalDate}}', formatDate(request.actionDate ? new Date(request.actionDate) : null))
            .replace('{{budgetOfficerName}}', request.budgetOfficerName || '—')
            .replace('{{budgetManagerName}}', request.budgetManagerName || '—')
            .replace('{{financeApprovalDate}}', formatDate(request.actionDate ? new Date(request.actionDate) : null))
            .replace('{{commitmentNumber}}', request.commitmentNumber || '—')
            .replace('{{accountingCode}}', request.accountingCode || '—')
            .replace('{{procurementApprovalDate}}', formatDate(request.actionDate ? new Date(request.actionDate) : null))
            .replace('{{status}}', request.status || '—')
            .replace('{{assigneeName}}', request.currentAssignee?.name || '—')
            .replace('{{submittedDate}}', formatDate(request.submittedAt))
            .replace('{{procurementCaseNumber}}', request.procurementCaseNumber || '—')
            .replace('{{receivedBy}}', request.receivedBy || '—')
            .replace('{{dateReceived}}', formatDate(request.dateReceived ? new Date(request.dateReceived) : null))
            .replace('{{actionDate}}', formatDate(request.actionDate ? new Date(request.actionDate) : null))
            .replace('{{procurementComments}}', request.procurementComments || '—')
            .replace('{{now}}', new Date().toLocaleString('en-US'));

        // Header code placeholders
        const seq = request.headerSequence !== null && request.headerSequence !== undefined ? String(request.headerSequence).padStart(3, '0') : '—';
        html = html
            .replace('{{headerDeptCode}}', request.headerDeptCode || '—')
            .replace('{{headerMonth}}', request.headerMonth || '—')
            .replace('{{headerYear}}', request.headerYear ? String(request.headerYear) : '—')
            .replace('{{headerSequence}}', seq)
            .replace('{{headerCode}}', `${request.headerDeptCode || '—'}/${request.headerMonth || '—'}/${request.headerYear ? String(request.headerYear) : '—'}/${seq}`);

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
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            });
            pdf = Buffer.from(pdfBuffer);
            await browser.close();
        } catch (chromeErr) {
            console.error('Puppeteer render failed, falling back to PDFKit:', chromeErr);
        }

        if (!pdf) {
            // Minimal, reliable fallback using PDFKit (no system deps)
            const PDFDocument = (await import('pdfkit')).default;
            const doc = new (PDFDocument as any)({ size: 'A4', margin: 28 });
            const chunks: Buffer[] = [];
            const done = new Promise<Buffer>((resolve) => {
                doc.on('data', (d: Buffer) => chunks.push(d));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
            });

            doc.fontSize(14);
            doc.text('BUREAU OF STANDARDS JAMAICA', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(12);
            doc.text('PROCUREMENT REQUISITION FORM', { align: 'center' });
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
        console.log(`[Submit] Incoming submit for request ${id}`);
        const request = await prisma.request.findUnique({
            where: { id: parseInt(id, 10) },
            include: { department: true },
        });

        if (!request) {
            console.warn(`[Submit] Request ${id} not found`);
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'DRAFT') {
            console.warn(`[Submit] Request ${id} not in DRAFT (status=${request.status})`);
            return res.status(400).json({ message: 'Only draft requests can be submitted' });
        }

        // Splintering check: detect possible split requests to avoid thresholds
        try {
            // Check if splintering detection is enabled in load balancing settings
            const lbSettings = await prisma.loadBalancingSettings.findFirst();
            const splinteringEnabled = lbSettings?.splinteringEnabled ?? false;

            if (splinteringEnabled) {
                const windowDays = Number(process.env.SPLINTER_WINDOW_DAYS || 30);
                // TEMPORARY: Disable by using impossibly high threshold (matches splinteringService default)
                const threshold = Number(process.env.SPLINTER_THRESHOLD_JMD || 999999999999);
                const spl = await checkSplintering(prisma, {
                    requesterId: request.requesterId,
                    departmentId: request.departmentId,
                    total: Number(request.totalEstimated || 0),
                    windowDays,
                    threshold,
                });
                console.log(`[Submit] Splintering result for ${id}:`, {
                    flagged: spl.flagged,
                    combined: spl.combined,
                    sumPrior: spl.sumPrior,
                    threshold: spl.threshold,
                    windowDays: spl.windowDays,
                    matches: Array.isArray(spl.matches) ? spl.matches.length : 0,
                });

                // If flagged and caller did not include an override, return 409 with details so the client can prompt the user
                const allowOverride = Boolean(req.body && req.body.overrideSplinter === true);
                if (spl.flagged && !allowOverride) {
                    console.warn(`[Submit] Blocking submit for ${id} due to splintering without override`);
                }
                if (spl.flagged && !allowOverride) {
                    return res.status(409).json({ message: 'Potential splintering detected', splinter: true, details: spl });
                }

                // If flagged and override provided, verify user has manager privileges
                if (spl.flagged && allowOverride) {
                    const actingUserId = req.headers['x-user-id'];
                    console.log(`[Submit] Override attempt by x-user-id=${actingUserId}`);
                    if (!actingUserId) {
                        return res.status(400).json({ message: 'User ID required to override splintering' });
                    }

                    const actingUser = await prisma.user.findUnique({
                        where: { id: parseInt(String(actingUserId), 10) },
                        include: { roles: { include: { role: true } } },
                    });

                    if (!actingUser) {
                        return res.status(404).json({ message: 'Acting user not found' });
                    }

                    // Check if user has manager role (PROCUREMENT_MANAGER, DEPT_MANAGER, or MANAGER)
                    const hasManagerRole = actingUser.roles.some(
                        (ur) => ur.role.name === 'PROCUREMENT_MANAGER' || ur.role.name === 'DEPT_MANAGER' || ur.role.name === 'MANAGER' || ur.role.name === 'EXECUTIVE'
                    );

                    if (!hasManagerRole) {
                        return res.status(403).json({ message: 'Only managers can override splintering warnings' });
                    }

                    // Create detailed audit notification for override
                    try {
                        await prisma.notification.create({
                            data: {
                                user: { connect: { id: actingUser.id } },
                                type: 'THRESHOLD_EXCEEDED',
                                message: `⚠️ Splintering override: ${actingUser.name} (${actingUser.email}) bypassed splintering warning for request ${request.reference || request.id}`,
                                data: {
                                    requestId: request.id,
                                    requestReference: request.reference,
                                    overriddenBy: {
                                        id: actingUser.id,
                                        name: actingUser.name,
                                        email: actingUser.email,
                                        roles: actingUser.roles.map((ur) => ur.role.name),
                                    },
                                    splinter: spl,
                                    timestamp: new Date().toISOString(),
                                    action: 'SPLINTERING_OVERRIDE',
                                },
                            },
                        });

                        // Also log to status history for permanent audit trail
                        await prisma.request.update({
                            where: { id: request.id },
                            data: {
                                statusHistory: {
                                    create: {
                                        status: 'DRAFT', // Still draft at this point
                                        changedById: actingUser.id,
                                        comment: `Manager override: Splintering warning bypassed. Combined value: ${spl.combined.toFixed(2)} JMD (threshold: ${spl.threshold} JMD, window: ${
                                            spl.windowDays
                                        } days)`,
                                    },
                                },
                            },
                        });

                        console.log(`[Audit] Splintering override by ${actingUser.name} (ID ${actingUser.id}) for request ${request.id}`);
                    } catch (auditErr) {
                        console.error('Failed to create splintering override audit log:', auditErr);
                        // Don't fail the submission if audit logging fails, but log the error
                    }
                }
            } else {
                console.log(`[Submit] Splintering check disabled for request ${id}`);
            }
        } catch (splErr) {
            console.warn('Splintering check failed:', splErr);
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
        console.log(`[Submit] Request ${id} updated to ${updated.status}, assignee=${updated.currentAssigneeId || 'none'}`);

        // Notify the department manager (new assignee) that a request was submitted
        try {
            const assigneeId = updated.currentAssignee?.id || updated.currentAssigneeId || null;
            if (assigneeId) {
                await prisma.notification.create({
                    data: {
                        userId: Number(assigneeId),
                        type: 'STAGE_CHANGED',
                        message: `Request ${updated.reference || updated.id} has been submitted and assigned to you for ${updated.status}`,
                        data: { requestId: updated.id, status: updated.status, assignedBy: request.requesterId },
                    },
                });
            }
        } catch (notifErr) {
            console.warn('Failed to create notification on submit:', notifErr);
        }

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /requests/:id/submit error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to submit request' });
    }
});

// POST /requests/:id/attachments - upload attachments for an existing request
app.post('/requests/:id/attachments', uploadAttachments.array('attachments'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'];

        if (!userId) return res.status(401).json({ message: 'User ID required' });

        const files = (req.files || []) as Express.Multer.File[];
        if (!files.length) return res.status(400).json({ message: 'No files uploaded' });

        const created: any[] = [];
        for (const file of files) {
            const url = `http://${PUBLIC_HOST}:${PORT}/uploads/${file.filename}`;
            const att = await prisma.requestAttachment.create({
                data: {
                    requestId: parseInt(id, 10),
                    filename: file.originalname,
                    url,
                    mimeType: file.mimetype || null,
                    uploadedById: parseInt(String(userId), 10),
                },
            });
            created.push(att);
        }

        res.status(201).json({ success: true, data: created });
    } catch (e: any) {
        console.error('POST /requests/:id/attachments error:', e);
        res.status(500).json({ message: e?.message || 'Failed to upload attachments' });
    }
});

// DELETE /requests/:id/attachments/:attachmentId - delete an attachment
app.delete('/requests/:id/attachments/:attachmentId', async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ message: 'User ID required' });

        const att = await prisma.requestAttachment.findUnique({ where: { id: parseInt(attachmentId, 10) } });
        if (!att) return res.status(404).json({ message: 'Attachment not found' });
        if (att.requestId !== parseInt(id, 10)) return res.status(400).json({ message: 'Attachment does not belong to this request' });

        // Attempt to unlink file from disk (best-effort)
        try {
            const filename = path.basename(att.url || '');
            const filepath = path.resolve(process.cwd(), 'uploads', filename);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        } catch (fsErr) {
            console.warn('Failed to remove attachment file from disk:', fsErr);
        }

        await prisma.requestAttachment.delete({ where: { id: parseInt(attachmentId, 10) } });
        res.json({ success: true });
    } catch (e: any) {
        console.error('DELETE /requests/:id/attachments/:attachmentId error:', e);
        res.status(500).json({ message: e?.message || 'Failed to delete attachment' });
    }
});

// POST /requests/:id/action - approve/reject requests (manager, HOD, procurement, finance)
app.post('/requests/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, comment } = req.body; // 'APPROVE' or 'REJECT' with optional comment
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

        // Verify user is the current assignee OR has the appropriate role for this workflow stage
        const actingUserId = parseInt(String(userId), 10);
        let isAuthorized = request.currentAssigneeId === actingUserId;

        if (!isAuthorized) {
            try {
                const actingUser = await prisma.user.findUnique({
                    where: { id: actingUserId },
                    include: { roles: { include: { role: true } } },
                });
                const roleNames = (actingUser?.roles || []).map((r: any) => String(r.role?.name || '').toUpperCase());

                // Check if user has the required role for the current workflow stage
                // This allows users with appropriate roles to approve even if not explicitly assigned
                let hasRequiredRole = false;

                if (request.status === 'DEPARTMENT_REVIEW') {
                    hasRequiredRole = roleNames.includes('DEPT_MANAGER');
                } else if (request.status === 'HOD_REVIEW') {
                    hasRequiredRole = roleNames.includes('HEAD_OF_DIVISION') || roleNames.includes('HOD');
                } else if (request.status === 'FINANCE_REVIEW') {
                    hasRequiredRole = roleNames.includes('FINANCE') || roleNames.includes('FINANCE_OFFICER');
                } else if (request.status === 'BUDGET_MANAGER_REVIEW') {
                    hasRequiredRole = roleNames.includes('BUDGET_MANAGER');
                } else if (request.status === 'PROCUREMENT_REVIEW') {
                    hasRequiredRole = roleNames.includes('PROCUREMENT') || roleNames.includes('PROCUREMENT_MANAGER') || roleNames.includes('PROCUREMENT_OFFICER');
                }

                // Allow approval if user has the required role for this stage
                if (hasRequiredRole) {
                    isAuthorized = true;
                    console.log(`Authorization by role: user ${actingUserId} (${roleNames.join(', ')}) acting on request ${id} at stage ${request.status}`);
                }

                // Also maintain backward compatibility: allow procurement managers to override at PROCUREMENT_REVIEW stage
                const isProcurementManager = roleNames.includes('PROCUREMENT_MANAGER') || roleNames.includes('MANAGER') || roleNames.includes('PROCUREMENT');
                if (!isAuthorized && isProcurementManager && request.status === 'PROCUREMENT_REVIEW') {
                    isAuthorized = true;
                    console.log(`Authorization override: user ${actingUserId} (procurement manager) acting on request ${id}`);
                }
            } catch (roleErr) {
                console.warn('Failed to evaluate acting user roles for authorization:', roleErr);
            }
        }

        if (!isAuthorized) {
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
                // HOD approved -> send to Finance Officer.
                // Prefer explicit assignment to a finance officer so the workflow always advances
                // even if load-balancing is disabled. If load-balancing is enabled it may
                // reassign afterwards according to strategy.
                nextStatus = 'FINANCE_REVIEW';
                try {
                    const financeOfficer = await prisma.user.findFirst({
                        where: { roles: { some: { role: { name: 'FINANCE' } } } },
                        orderBy: { id: 'asc' },
                    });
                    nextAssigneeId = financeOfficer?.id || null;
                    if (nextAssigneeId) console.log(`[Workflow] Assigned finance officer ${nextAssigneeId} for request ${id}`);
                } catch (assignErr) {
                    console.warn('[Workflow] Failed to find explicit finance officer, will rely on auto-assignment:', assignErr);
                    nextAssigneeId = null;
                }
            } else if (request.status === 'FINANCE_REVIEW') {
                // Finance Officer approved -> MUST go to Budget Manager (required step)
                const budgetManager = await prisma.user.findFirst({
                    where: { roles: { some: { role: { name: 'BUDGET_MANAGER' } } } },
                });
                nextStatus = 'BUDGET_MANAGER_REVIEW';
                nextAssigneeId = budgetManager?.id || null;
            } else if (request.status === 'BUDGET_MANAGER_REVIEW') {
                // Budget Manager approved -> send to Procurement for final processing
                nextStatus = 'PROCUREMENT_REVIEW';
                // Don't assign here - let auto-assignment handle it
                nextAssigneeId = null;
            } else if (request.status === 'PROCUREMENT_REVIEW') {
                // Procurement approved -> check if Executive Director approval needed
                const totalValue = request.totalEstimated || 0;
                const procurementTypes = (() => {
                    try {
                        return request.procurementType ? (Array.isArray(request.procurementType) ? request.procurementType : JSON.parse(request.procurementType as any)) : [];
                    } catch {
                        return [];
                    }
                })();
                const requestCurrency = request.currency || 'JMD';

                const thresholdResult = checkProcurementThresholds(Number(totalValue || 0), procurementTypes, requestCurrency);

                if (thresholdResult.requiresExecutiveApproval) {
                    // High-value request -> send to Executive Director for evaluation
                    nextStatus = 'EXECUTIVE_REVIEW';
                    const executiveDirector = await prisma.user.findFirst({
                        where: {
                            roles: { some: { role: { name: { in: ['EXECUTIVE_DIRECTOR', 'EXECUTIVE'] } } } },
                        },
                    });
                    nextAssigneeId = executiveDirector?.id || null;
                } else {
                    // Normal flow -> final approval (ready to send to vendor)
                    nextStatus = 'FINANCE_APPROVED';
                    // Assign back to procurement manager so they can print/process
                    const procurementManager = await prisma.user.findFirst({
                        where: {
                            roles: { some: { role: { name: 'PROCUREMENT_MANAGER' } } },
                        },
                    });
                    nextAssigneeId = procurementManager?.id || null;
                }
            } else if (request.status === 'EXECUTIVE_REVIEW') {
                // Executive Director approved -> final approval (ready to send to vendor)
                nextStatus = 'FINANCE_APPROVED';
                // Assign back to procurement manager so they can print/process
                const procurementManager = await prisma.user.findFirst({
                    where: {
                        roles: { some: { role: { name: 'PROCUREMENT_MANAGER' } } },
                    },
                });
                nextAssigneeId = procurementManager?.id || null;
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
            // Build the status history comment
            let historyComment = '';
            if (action === 'APPROVE') {
                historyComment = comment ? `Approved at ${request.status} stage: ${comment}` : `Approved at ${request.status} stage`;
            } else if (action === 'REJECT') {
                historyComment = comment ? `Returned from ${request.status} stage: ${comment}` : `Returned from ${request.status} stage`;
            } else if (action === 'SEND_TO_VENDOR') {
                historyComment = comment ? `Sent to vendor: ${comment}` : `Sent to vendor`;
            }

            updated = await prisma.request.update({
                where: { id: parseInt(id, 10) },
                data: {
                    status: nextStatus,
                    currentAssigneeId: nextAssigneeId,
                    statusHistory: {
                        create: {
                            status: nextStatus,
                            changedById: parseInt(String(userId), 10),
                            comment: historyComment,
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

            // Notify the next assignee (procurement manager/officer/executive) if present (normal path)
            try {
                const assigneeId = updated.currentAssignee?.id || updated.currentAssigneeId || null;
                if (assigneeId) {
                    await prisma.notification.create({
                        data: {
                            userId: Number(assigneeId),
                            type: 'STAGE_CHANGED',
                            message: `Request ${updated.reference || updated.id} has advanced to ${updated.status} and is assigned to you`,
                            data: { requestId: updated.id, status: updated.status },
                        },
                    });
                }
            } catch (notifErr) {
                console.warn('Failed to create notification on approve action:', notifErr);
            }

            // If routed to Executive Director for evaluation, create a direct evaluation link notification
            try {
                if (nextStatus === 'EXECUTIVE_REVIEW' && updated.currentAssigneeId) {
                    // Find or create evaluation for this request context (lightweight pointer)
                    await prisma.notification.create({
                        data: {
                            userId: Number(updated.currentAssigneeId),
                            type: 'STAGE_CHANGED',
                            message: `High-value request ${updated.reference || updated.id} requires your evaluation`,
                            data: {
                                requestId: updated.id,
                                action: 'OPEN_EVALUATION',
                                // Frontend route for creating a new evaluation
                                url: `/procurement/evaluation/new?requestId=${updated.id}`,
                            },
                        },
                    });
                }
            } catch (notifErr) {
                console.warn('Failed to create executive evaluation notification:', notifErr);
            }
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

        // Check if auto-assignment should be triggered
        const settings = await getLoadBalancingSettings(prisma);
        if (shouldAutoAssign(nextStatus, settings)) {
            console.log(`[Workflow] Triggering auto-assignment for request ${updated.id} at status ${nextStatus}`);
            const assignedOfficerId = await autoAssignRequest(prisma, updated.id);

            if (assignedOfficerId) {
                // Refresh the updated request to include the new assignee
                updated = (await prisma.request.findUnique({
                    where: { id: parseInt(id, 10) },
                    include: {
                        items: true,
                        requester: { select: { id: true, name: true, email: true } },
                        department: { select: { id: true, name: true, code: true } },
                        currentAssignee: { select: { id: true, name: true, email: true } },
                    },
                })) as any;

                // Notify the auto-assigned officer
                try {
                    await prisma.notification.create({
                        data: {
                            userId: assignedOfficerId,
                            type: 'STAGE_CHANGED',
                            message: `Request ${updated.reference || updated.id} has been auto-assigned to you for ${updated.status}`,
                            data: { requestId: updated.id, status: updated.status, autoAssigned: true },
                        },
                    });
                } catch (notifErr) {
                    console.warn('Failed to create auto-assignment notification:', notifErr);
                }
            }
        } else if (nextStatus === 'FINANCE_REVIEW' && settings?.enabled) {
            // Auto-assign finance officer when entering FINANCE_REVIEW
            console.log(`[Workflow] Triggering finance officer auto-assignment for request ${updated.id}`);
            const assignedFinanceOfficerId = await autoAssignFinanceOfficer(prisma, updated.id);

            if (assignedFinanceOfficerId) {
                // Refresh the updated request to include the new assignee
                updated = (await prisma.request.findUnique({
                    where: { id: parseInt(id, 10) },
                    include: {
                        items: true,
                        requester: { select: { id: true, name: true, email: true } },
                        department: { select: { id: true, name: true, code: true } },
                        currentAssignee: { select: { id: true, name: true, email: true } },
                    },
                })) as any;

                // Notify the auto-assigned finance officer
                try {
                    await prisma.notification.create({
                        data: {
                            userId: assignedFinanceOfficerId,
                            type: 'STAGE_CHANGED',
                            message: `Request ${updated.reference || updated.id} has been assigned to you for finance review`,
                            data: { requestId: updated.id, status: updated.status, autoAssigned: true },
                        },
                    });
                } catch (notifErr) {
                    console.warn('Failed to create finance officer assignment notification:', notifErr);
                }
            }
        } else if (!updated.currentAssigneeId && nextStatus !== 'DRAFT') {
            // If no auto-assignment and no assignee, notify the next assignee if one was set manually
            try {
                const assigneeId = updated.currentAssignee?.id || updated.currentAssigneeId || null;
                if (assigneeId) {
                    await prisma.notification.create({
                        data: {
                            userId: Number(assigneeId),
                            type: 'STAGE_CHANGED',
                            message: `Request ${updated.reference || updated.id} has advanced to ${updated.status} and is assigned to you`,
                            data: { requestId: updated.id, status: updated.status },
                        },
                    });
                }
            } catch (notifErr) {
                console.warn('Failed to create notification on approve action:', notifErr);
            }
        }

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /requests/:id/action error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to process action' });
    }
});

// GET /api/users/procurement-officers - List all procurement officers with workload
app.get('/api/users/procurement-officers', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Verify the user is a procurement manager
        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const roleNames = user.roles.map((ur) => ur.role.name.toUpperCase());
        const isAdmin = roleNames.includes('ADMIN');
        const isProcurementManager = roleNames.some((r) => r === 'PROCUREMENT_MANAGER' || (r.includes('PROCUREMENT') && r.includes('MANAGER')));
        const isProcDeptManager = roleNames.includes('DEPT_MANAGER') && user.department?.code === 'PROC';
        if (!isAdmin && !isProcurementManager && !isProcDeptManager) {
            return res.status(403).json({ message: 'Only Admins or Procurement Managers can view procurement officers' });
        }

        // Get all procurement officers and managers
        const officers = await prisma.user.findMany({
            where: {
                OR: [
                    { roles: { some: { role: { name: 'PROCUREMENT' } } } },
                    { roles: { some: { role: { name: 'PROCUREMENT_MANAGER' } } } },
                    { AND: [{ roles: { some: { role: { name: 'DEPT_MANAGER' } } } }, { department: { code: 'PROC' } }] },
                ],
            },
            include: {
                roles: { include: { role: true } },
                department: { select: { id: true, name: true, code: true } },
            },
        });

        // Count active assignments for each officer (requests currently assigned to them)
        const officersWithWorkload = await Promise.all(
            officers.map(async (officer) => {
                const assignedCount = await prisma.request.count({
                    where: {
                        currentAssigneeId: officer.id,
                        status: { in: ['PROCUREMENT_REVIEW', 'FINANCE_APPROVED'] },
                    },
                });

                return {
                    id: officer.id,
                    name: officer.name,
                    email: officer.email,
                    departmentId: officer.departmentId,
                    department: officer.department,
                    assignedCount,
                };
            })
        );

        return res.json(officersWithWorkload);
    } catch (e: any) {
        console.error('GET /users/procurement-officers error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch procurement officers' });
    }
});

// Admin override endpoint: explicitly approve a splintering-blocked submission
app.post('/admin/requests/:id/override-splinter', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminUserId = req.headers['x-user-id'];
        if (!adminUserId) return res.status(401).json({ message: 'User ID required' });

        const reqRecord = await prisma.request.findUnique({ where: { id: parseInt(id, 10) }, include: { department: true } });
        if (!reqRecord) return res.status(404).json({ message: 'Request not found' });

        if (reqRecord.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT requests can be overridden' });

        // Promote to department review and assign to department manager
        const deptManager = await prisma.user.findFirst({
            where: {
                departmentId: reqRecord.departmentId,
                roles: { some: { role: { name: 'DEPT_MANAGER' } } },
            },
        });

        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: {
                status: 'DEPARTMENT_REVIEW',
                currentAssigneeId: deptManager?.id || null,
                statusHistory: {
                    create: {
                        status: 'DEPARTMENT_REVIEW',
                        changedById: adminUserId ? parseInt(String(adminUserId), 10) : null,
                        comment: 'Admin override: splintering decision approved by admin',
                    },
                },
            },
            include: { items: true, requester: true, department: true, currentAssignee: true },
        });

        // Create audit notification for procurement/audit team
        try {
            await prisma.notification.create({
                data: {
                    user: { connect: { id: parseInt(String(adminUserId), 10) } },
                    type: 'THRESHOLD_EXCEEDED',
                    message: `Admin override applied to request ${updated.reference || updated.id} by user ${adminUserId}`,
                    data: { requestId: updated.id, overriddenBy: parseInt(String(adminUserId), 10) },
                },
            });
        } catch (notifErr) {
            console.warn('Failed to create admin override notification:', notifErr);
        }

        return res.json({ success: true, data: updated });
    } catch (e: any) {
        console.error('POST /admin/requests/:id/override-splinter error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to apply admin override' });
    }
});

// POST /requests/:id/assign - Assign request to specific procurement officer
app.post('/requests/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { assigneeId } = req.body;
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        if (!assigneeId) {
            return res.status(400).json({ message: 'assigneeId is required' });
        }

        // Verify the user is a procurement manager or self-assigning
        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const roleNames = user.roles.map((ur) => ur.role.name.toUpperCase());
        const isProcurementManager = roleNames.some((r) => r === 'PROCUREMENT_MANAGER' || (r.includes('PROCUREMENT') && r.includes('MANAGER')));
        const isProcDeptManager = roleNames.includes('DEPT_MANAGER') && user.department?.code === 'PROC';
        const isProcurementOfficer = roleNames.includes('PROCUREMENT') || roleNames.includes('PROCUREMENT_OFFICER');
        const isSelfAssigning = parseInt(String(userId), 10) === parseInt(String(assigneeId), 10);

        // Allow if user is procurement manager (incl. PROC dept manager) OR if user is self-assigning as procurement officer
        if (!(isProcurementManager || isProcDeptManager) && !(isProcurementOfficer && isSelfAssigning)) {
            return res.status(403).json({ message: 'Not authorized to assign requests' });
        }

        const request = await prisma.request.findUnique({
            where: { id: parseInt(id, 10) },
            include: { department: true },
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Verify request is at PROCUREMENT_REVIEW stage
        if (request.status !== 'PROCUREMENT_REVIEW') {
            return res.status(400).json({ message: 'Request must be at PROCUREMENT_REVIEW stage to be assigned' });
        }

        // Verify assignee has PROCUREMENT or PROCUREMENT_MANAGER role
        const assignee = await prisma.user.findUnique({
            where: { id: parseInt(String(assigneeId), 10) },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        if (!assignee) {
            return res.status(404).json({ message: 'Assignee not found' });
        }

        const assigneeRoleNames = assignee.roles.map((ur) => ur.role.name.toUpperCase());
        const hasValidRole =
            assigneeRoleNames.includes('PROCUREMENT') ||
            assigneeRoleNames.includes('PROCUREMENT_OFFICER') ||
            assigneeRoleNames.includes('PROCUREMENT_MANAGER') ||
            (assigneeRoleNames.includes('DEPT_MANAGER') && assignee.department?.code === 'PROC');
        if (!hasValidRole) {
            return res.status(400).json({ message: 'Assignee must have PROCUREMENT or PROCUREMENT_MANAGER role' });
        }

        // Update the request assignment
        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: {
                currentAssigneeId: parseInt(String(assigneeId), 10),
                statusHistory: {
                    create: {
                        status: 'PROCUREMENT_REVIEW',
                        changedById: parseInt(String(userId), 10),
                        comment: isSelfAssigning ? 'Self-assigned for procurement processing' : `Assigned to ${assignee.name} by Procurement Manager`,
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
        console.error('POST /requests/:id/assign error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to assign request' });
    }
});

// GET /procurement/load-balancing-settings - Get load balancing configuration
app.get('/procurement/load-balancing-settings', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Verify the user is a procurement manager
        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isAdmin = user.roles.some((ur) => ur.role.name === 'ADMIN');
        const isProcurementManager = user.roles.some((ur) => ur.role.name === 'PROCUREMENT_MANAGER');
        const isDeptManager = user.roles.some((ur) => ur.role.name === 'DEPT_MANAGER');
        if (!isAdmin && !isProcurementManager && !isDeptManager) {
            return res.status(403).json({ message: 'Only Admins, Procurement Managers or Department Managers can view settings' });
        }

        // Fetch settings from database using service
        const settings = await getLoadBalancingSettings(prisma);

        // Return default if no settings exist yet
        if (!settings) {
            return res.json({
                enabled: false,
                strategy: 'LEAST_LOADED',
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
                splinteringEnabled: false,
            });
        }

        return res.json(settings);
    } catch (e: any) {
        console.error('GET /procurement/load-balancing-settings error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch settings' });
    }
});

// Backward-compat alias: underscore variant
app.get('/procurement/load_balancing-settings', async (req, res) => {
    // Delegate to the canonical handler
    (app as any)._router.handle({ ...req, url: '/procurement/load-balancing-settings' }, res, () => {});
});

// POST /procurement/load-balancing-settings - Update load balancing configuration
app.post('/procurement/load-balancing-settings', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        // Verify the user is a procurement manager
        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const roleNames = user.roles.map((ur) => ur.role.name.toUpperCase());
        const isAdmin = roleNames.includes('ADMIN');
        const isProcurementManager = roleNames.some((r) => r === 'PROCUREMENT_MANAGER' || (r.includes('PROCUREMENT') && r.includes('MANAGER')));
        // Allow a department manager of the Procurement & Supply Chain department to update if they manage that department
        const isProcDeptManager = roleNames.includes('DEPT_MANAGER') && user.department?.code === 'PROC';
        if (!isAdmin && !isProcurementManager && !isProcDeptManager) {
            return res.status(403).json({ message: 'Only Admins or Procurement Managers can update settings', roles: roleNames });
        }

        const { enabled, strategy, autoAssignOnApproval, splinteringEnabled } = req.body as {
            enabled?: boolean;
            strategy?: string;
            autoAssignOnApproval?: boolean;
            splinteringEnabled?: boolean;
        };

        // Validate strategy
        const validStrategies = ['LEAST_LOADED', 'ROUND_ROBIN', 'RANDOM'];
        if (strategy && !validStrategies.includes(strategy)) {
            return res.status(400).json({ message: 'Invalid strategy. Must be LEAST_LOADED, ROUND_ROBIN, or RANDOM' });
        }

        // Update settings in database using service
        const settings = await updateLoadBalancingSettings(
            prisma,
            {
                enabled: enabled !== undefined ? enabled : undefined,
                strategy: strategy as 'LEAST_LOADED' | 'ROUND_ROBIN' | 'RANDOM' | undefined,
                autoAssignOnApproval: autoAssignOnApproval !== undefined ? autoAssignOnApproval : undefined,
                splinteringEnabled: splinteringEnabled !== undefined ? splinteringEnabled : undefined,
            },
            parseInt(String(userId), 10)
        );

        console.log('[LoadBalancing] Settings updated by user', userId, 'roles=', roleNames, 'dept=', user.department?.code, ':', settings);

        return res.json(settings);
    } catch (e: any) {
        console.error('POST /procurement/load-balancing-settings error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to update settings' });
    }
});

// --- ADMIN: Load Balancing Settings (allow admins to toggle splintering) ---
app.get('/api/admin/load-balancing-settings', requireAdmin, async (req, res) => {
    try {
        const settings = await getLoadBalancingSettings(prisma);
        if (!settings) {
            return res.json({ enabled: false, strategy: 'LEAST_LOADED', autoAssignOnApproval: true, roundRobinCounter: 0, splinteringEnabled: false });
        }
        return res.json(settings);
    } catch (e: any) {
        console.error('GET /api/admin/load-balancing-settings error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch settings' });
    }
});

app.post('/api/admin/load-balancing-settings', requireAdmin, async (req, res) => {
    try {
        const adminId = req.headers['x-user-id'];
        if (!adminId) return res.status(401).json({ message: 'User ID required' });

        const { splinteringEnabled } = req.body as { splinteringEnabled?: boolean };

        const settings = await updateLoadBalancingSettings(
            prisma,
            {
                splinteringEnabled: splinteringEnabled !== undefined ? splinteringEnabled : undefined,
            },
            parseInt(String(adminId), 10)
        );

        console.log('[Admin] Load balancing settings updated by admin', adminId, settings);
        return res.json(settings);
    } catch (e: any) {
        console.error('POST /api/admin/load-balancing-settings error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to update settings' });
    }
});

// Backward-compat alias: underscore variant
app.post('/procurement/load_balancing-settings', async (req, res) => {
    // Delegate to the canonical handler
    (app as any)._router.handle({ ...req, url: '/procurement/load-balancing-settings' }, res, () => {});
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
                isCombined: true,
                combinedRequestId: true,
                lotNumber: true,
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
                            isCombined: true,
                            combinedRequestId: true,
                            lotNumber: true,
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
                const rows = await prisma.$queryRawUnsafe(
                    'SELECT id, reference, title, requesterId, departmentId, status, createdAt, updatedAt, isCombined, combinedRequestId, lotNumber FROM Request ORDER BY createdAt DESC'
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

// GET /api/admin/roles - Get all available roles
app.get('/api/admin/roles', async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, description: true },
        });

        res.json(roles);
    } catch (e: any) {
        console.error('GET /api/admin/roles error:', e);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
});

// GET /api/departments - Get all departments
app.get('/api/departments', async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, code: true },
        });

        res.json(departments);
    } catch (e: any) {
        console.error('GET /api/departments error:', e);
        res.status(500).json({ message: 'Failed to fetch departments' });
    }
});

// POST /api/departments - Create a new department (compat endpoint for frontend)
// Protected: accepts either Bearer token or x-user-id (authMiddleware) and requires ADMIN role
app.post('/api/departments', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, code, managerId } = req.body;
        if (!name || !code) return res.status(400).json({ message: 'Department name and code are required' });

        // Check for existing code
        const existing = await prisma.department.findUnique({ where: { code } });
        if (existing) return res.status(400).json({ message: 'Department code already exists' });

        // Verify manager exists if provided
        if (managerId) {
            const manager = await prisma.user.findUnique({ where: { id: Number(managerId) } });
            if (!manager) return res.status(404).json({ message: 'Manager user not found' });
        }

        const created = await prisma.department.create({
            data: { name, code, managerId: managerId || null },
            select: { id: true, name: true, code: true },
        });

        res.status(201).json({ message: 'Department created', department: created });
    } catch (e: any) {
        console.error('POST /api/departments error:', e);
        res.status(500).json({ message: 'Failed to create department' });
    }
});

// PUT /api/departments/:id - Update a department (compat endpoint)
app.put('/api/departments/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, managerId } = req.body;
        if (!name || !code) return res.status(400).json({ message: 'Department name and code are required' });

        // Ensure department exists
        const deptId = parseInt(String(id), 10);
        const existing = await prisma.department.findUnique({ where: { id: deptId } });
        if (!existing) return res.status(404).json({ message: 'Department not found' });

        // If code changed, check uniqueness
        if (code !== existing.code) {
            const codeTaken = await prisma.department.findUnique({ where: { code } });
            if (codeTaken) return res.status(400).json({ message: 'Department code already exists' });
        }

        if (managerId) {
            const manager = await prisma.user.findUnique({ where: { id: Number(managerId) } });
            if (!manager) return res.status(404).json({ message: 'Manager user not found' });
        }

        const updated = await prisma.department.update({
            where: { id: deptId },
            data: { name, code, managerId: managerId || null },
            select: { id: true, name: true, code: true },
        });

        res.json({ message: 'Department updated', department: updated });
    } catch (e: any) {
        console.error('PUT /api/departments/:id error:', e);
        res.status(500).json({ message: 'Failed to update department' });
    }
});

// DELETE /api/departments/:id - Delete a department (compat endpoint)
app.delete('/api/departments/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deptId = parseInt(String(id), 10);

        // Optionally: check for dependent records (users/requests) before deleting
        await prisma.department.delete({ where: { id: deptId } });

        res.json({ message: 'Department deleted' });
    } catch (e: any) {
        console.error('DELETE /api/departments/:id error:', e);
        res.status(500).json({ message: 'Failed to delete department' });
    }
});

// POST /api/admin/departments - Create a new department (admin only)
app.post('/api/admin/departments', async (req, res) => {
    try {
        const adminId = req.headers['x-user-id'];
        if (!adminId) return res.status(401).json({ message: 'User ID required' });

        // Verify admin
        const admin = await prisma.user.findUnique({
            where: { id: parseInt(String(adminId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const isAdmin = admin?.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });

        const { name, code, managerId } = req.body;

        if (!name || !code) {
            return res.status(400).json({ message: 'Department name and code are required' });
        }

        // Check if code already exists
        const existingDept = await prisma.department.findUnique({
            where: { code },
        });
        if (existingDept) {
            return res.status(400).json({ message: 'Department code already exists' });
        }

        // Verify manager exists if provided
        if (managerId) {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
            });
            if (!manager) {
                return res.status(404).json({ message: 'Manager user not found' });
            }
        }

        const newDept = await prisma.department.create({
            data: {
                name,
                code,
                managerId: managerId || null,
            },
            select: { id: true, name: true, code: true },
        });

        console.log(`[Admin] Created department: ${name} (${code})`);

        res.status(201).json({
            message: 'Department created successfully',
            department: newDept,
        });
    } catch (e: any) {
        console.error('POST /api/admin/departments error:', e);
        res.status(500).json({ message: 'Failed to create department' });
    }
});

// POST /api/admin/users/:userId/department - Update user's department (admin only)
app.post('/api/admin/users/:userId/department', async (req, res) => {
    try {
        const adminId = req.headers['x-user-id'];
        if (!adminId) return res.status(401).json({ message: 'User ID required' });

        // Verify admin
        const admin = await prisma.user.findUnique({
            where: { id: parseInt(String(adminId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const isAdmin = admin?.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });

        const { userId } = req.params;
        const { departmentId } = req.body;

        const parsedUserId = parseInt(userId, 10);

        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // If departmentId is provided, verify department exists
        if (departmentId) {
            const dept = await prisma.department.findUnique({ where: { id: departmentId } });
            if (!dept) return res.status(404).json({ message: 'Department not found' });
        }

        // Update user's department
        const updated = await prisma.user.update({
            where: { id: parsedUserId },
            data: { departmentId: departmentId || null },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        console.log(`[Admin] Updated department for user ${parsedUserId} to department ${departmentId || 'none'}`);

        // If this user has DEPT_MANAGER role, set the new department.managerId to this user.
        // Also, if the user was manager of a previous department, clear that previous department.managerId.
        try {
            const userRoles = (updated.roles || []).map((r) => r.role?.name).filter(Boolean) as string[];
            const isDeptManager = userRoles.map((r) => String(r).toUpperCase()).includes('DEPT_MANAGER');

            // Clear this user's managerId from any other department that referenced them but is not the current one
            await prisma.department.updateMany({ where: { managerId: parsedUserId, id: { not: updated.departmentId } }, data: { managerId: null } });

            if (isDeptManager && updated.departmentId) {
                await prisma.department.update({ where: { id: updated.departmentId }, data: { managerId: parsedUserId } });
                console.log(`[Admin] Assigned user ${parsedUserId} as manager for department ${updated.departmentId}`);
            }
        } catch (err) {
            console.warn('Failed to sync department.managerId after department update:', err);
        }

        // Check if this user is currently logged in (same as admin making the change)
        const isCurrentUser = parseInt(String(adminId), 10) === parsedUserId;

        return res.json({
            message: 'User department updated successfully',
            userId: parsedUserId,
            departmentId: updated.departmentId,
            isCurrentUser,
            updatedUser: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                roles: (updated.roles || []).map((r) => ({ role: r.role })),
                department: updated.department
                    ? {
                          id: updated.department.id,
                          name: updated.department.name,
                          code: updated.department.code,
                      }
                    : null,
            },
        });
    } catch (e: any) {
        console.error('POST /api/admin/users/:userId/department error:', e);
        res.status(500).json({ message: 'Failed to update user department' });
    }
});

// GET /api/admin/users - Get all users with their roles and departments
app.get('/api/admin/users', async (req, res) => {
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
            // Return roles in the shape expected by the admin UI: array of objects with `role` property
            roles: (u.roles || []).map((r) => ({ role: r.role })),
        }));

        res.json(formatted);
    } catch (e: any) {
        console.error('GET /admin/users error:', e);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// POST /api/admin/users/:userId/roles - Update user roles (admin only)
app.post('/api/admin/users/:userId/roles', async (req, res) => {
    try {
        const adminId = req.headers['x-user-id'];
        if (!adminId) return res.status(401).json({ message: 'User ID required' });

        // Verify admin
        const admin = await prisma.user.findUnique({
            where: { id: parseInt(String(adminId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const isAdmin = admin?.roles.some((r) => r.role.name === 'ADMIN');
        if (!isAdmin) return res.status(403).json({ message: 'Admin access required' });

        const { userId } = req.params;
        const { roles } = req.body;

        if (!roles || !Array.isArray(roles)) {
            return res.status(400).json({ message: 'roles must be an array' });
        }

        const parsedUserId = parseInt(userId, 10);

        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get all role IDs for the provided role names
        const roleRecords = await prisma.role.findMany({
            where: { name: { in: roles } },
        });

        if (roleRecords.length !== roles.length) {
            return res.status(400).json({ message: 'One or more invalid role names' });
        }

        // Remove all existing roles for this user
        await prisma.userRole.deleteMany({
            where: { userId: parsedUserId },
        });

        // Assign new roles
        const userRoles = await Promise.all(
            roleRecords.map((role) =>
                prisma.userRole.create({
                    data: {
                        userId: parsedUserId,
                        roleId: role.id,
                    },
                })
            )
        );

        console.log(`[Admin] Updated roles for user ${parsedUserId}: ${roles.join(', ')}`);

        // Fetch the updated user with full details for session update
        const updatedUser = await prisma.user.findUnique({
            where: { id: parsedUserId },
            include: {
                roles: { include: { role: true } },
                department: true,
            },
        });

        // If the user now has DEPT_MANAGER role, ensure the department's managerId points to this user
        try {
            const hasDeptManagerRole = roles.map((r: string) => String(r).toUpperCase()).includes('DEPT_MANAGER');
            if (hasDeptManagerRole && updatedUser?.department?.id) {
                await prisma.department.update({ where: { id: updatedUser.department.id }, data: { managerId: parsedUserId } });
                console.log(`[Admin] Set department ${updatedUser.department.id} managerId -> ${parsedUserId}`);
            } else if (!hasDeptManagerRole) {
                // If user no longer has DEPT_MANAGER role, clear any department.managerId that references them
                await prisma.department.updateMany({ where: { managerId: parsedUserId }, data: { managerId: null } });
                console.log(`[Admin] Cleared managerId references for user ${parsedUserId}`);
            }
        } catch (err) {
            console.warn('Failed to sync department.managerId after role update:', err);
        }

        // Check if this user is currently logged in (same as admin making the change)
        const isCurrentUser = parseInt(String(adminId), 10) === parsedUserId;

        return res.json({
            message: 'User roles updated successfully',
            userId: parsedUserId,
            roles: roles,
            isCurrentUser,
            updatedUser: updatedUser
                ? {
                      id: updatedUser.id,
                      email: updatedUser.email,
                      name: updatedUser.name,
                      roles: (updatedUser.roles || []).map((r) => ({ role: r.role })),
                      department: updatedUser.department
                          ? {
                                id: updatedUser.department.id,
                                name: updatedUser.department.name,
                                code: updatedUser.department.code,
                            }
                          : null,
                  }
                : null,
        });
    } catch (e: any) {
        console.error('POST /admin/users/:userId/roles error:', e);
        res.status(500).json({ message: 'Failed to update user roles' });
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

// POST /requests/:id/assign-finance-officer - Budget Manager can reassign finance officers to requests
app.post('/requests/:id/assign-finance-officer', async (req, res) => {
    try {
        const { id } = req.params;
        const { financeOfficerId } = req.body || {};
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ message: 'User ID required' });

        // Verify user is Budget Manager
        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const isBudgetManager = user?.roles.some((r) => r.role.name === 'BUDGET_MANAGER');
        if (!isBudgetManager) return res.status(403).json({ message: 'Budget Manager access required' });

        const request = await prisma.request.findUnique({
            where: { id: parseInt(id, 10) },
            include: { currentAssignee: true, department: true },
        });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        // Only allow reassignment when request is in FINANCE_REVIEW
        if (request.status !== 'FINANCE_REVIEW') {
            return res.status(400).json({ message: 'Finance officer can only be reassigned when request is in FINANCE_REVIEW status' });
        }

        // Validate financeOfficerId exists and has FINANCE role
        const financeOfficer = await prisma.user.findUnique({
            where: { id: parseInt(String(financeOfficerId), 10) },
            include: { roles: { include: { role: true } } },
        });
        if (!financeOfficer) return res.status(404).json({ message: 'Finance officer not found' });
        if (!financeOfficer.roles.some((r) => r.role.name === 'FINANCE')) {
            return res.status(400).json({ message: 'Selected user does not have FINANCE role' });
        }

        const previousAssigneeId = request.currentAssigneeId;

        const updated = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: {
                currentAssigneeId: parseInt(String(financeOfficerId), 10),
                statusHistory: {
                    create: {
                        status: request.status as any,
                        changedById: parseInt(String(userId), 10),
                        comment: `Finance officer reassigned by Budget Manager from ${previousAssigneeId ? 'user ' + previousAssigneeId : 'unassigned'} to ${financeOfficer.name}`,
                    },
                },
                actions: {
                    create: {
                        action: 'ASSIGN',
                        performedById: parseInt(String(userId), 10),
                        comment: `Finance officer reassigned to ${financeOfficer.name}`,
                        metadata: { previousAssigneeId, newAssigneeId: parseInt(String(financeOfficerId), 10) },
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

        // Notify the newly assigned finance officer
        try {
            await prisma.notification.create({
                data: {
                    userId: parseInt(String(financeOfficerId), 10),
                    type: 'STAGE_CHANGED',
                    message: `Request ${updated.reference || updated.id} has been reassigned to you for finance review by the Budget Manager`,
                    data: { requestId: updated.id, status: updated.status, reassignedBy: user?.name },
                },
            });
        } catch (notifErr) {
            console.warn('Failed to create reassignment notification:', notifErr);
        }

        return res.json(updated);
    } catch (e: any) {
        console.error('POST /requests/:id/assign-finance-officer error:', e);
        return res.status(500).json({ message: 'Failed to assign finance officer' });
    }
});

// GET /finance-officers - Get list of available finance officers (for Budget Manager assignment UI)
app.get('/finance-officers', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ message: 'User ID required' });

        // Allow Budget Manager or Procurement Manager to view finance officers
        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: { roles: { include: { role: true } } },
        });
        const allowedRoles = user?.roles.map((r) => r.role.name) || [];
        const isAuthorized = allowedRoles.some((r) => r === 'BUDGET_MANAGER' || r === 'ADMIN' || r === 'PROCUREMENT_MANAGER');
        if (!isAuthorized) return res.status(403).json({ message: 'Access required' });

        // Get all finance officers with their current workload
        const financeOfficers = await prisma.user.findMany({
            where: {
                roles: { some: { role: { name: 'FINANCE' } } },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        // Get workload for each officer (active assignments at FINANCE_REVIEW stage)
        const officersWithWorkload = await Promise.all(
            financeOfficers.map(async (officer) => {
                const assignedCount = await prisma.request.count({
                    where: {
                        currentAssigneeId: officer.id,
                        status: { in: ['FINANCE_REVIEW'] },
                    },
                });

                return {
                    id: officer.id,
                    name: officer.name,
                    email: officer.email,
                    assignedCount,
                };
            })
        );

        return res.json(officersWithWorkload);
    } catch (e: any) {
        console.error('GET /finance-officers error:', e);
        return res.status(500).json({ message: 'Failed to fetch finance officers' });
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

// GET /api/auth/test-ldap - Diagnostic endpoint to test LDAP connection
app.get('/api/auth/test-ldap', async (req, res) => {
    try {
        const { ldapService } = await import('./services/ldapService.js');
        const { config } = await import('./config/environment.js');

        if (!ldapService.isEnabled()) {
            return res.json({
                success: false,
                message: 'LDAP is not configured',
                configured: false,
            });
        }

        console.log('[LDAP Test] Testing connection');

        const testResult = await ldapService.testConnection();

        if (testResult) {
            return res.json({
                success: true,
                message: 'LDAP connection successful',
                configured: true,
                ldapUrl: config.LDAP?.url,
                searchDN: config.LDAP?.searchDN,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'LDAP connection failed',
                configured: true,
                ldapUrl: config.LDAP?.url,
            });
        }
    } catch (e: any) {
        console.error('[LDAP Test] Connection failed:', e.message);
        return res.status(500).json({
            success: false,
            message: 'LDAP test failed',
            error: e.message,
        });
    }
});

// GET /api/auth/me - Get current user profile (including LDAP-synced data)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const userObj = (req as any).user;
        const userId = userObj?.sub || userObj?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(String(userId), 10) },
            include: {
                department: { select: { id: true, name: true, code: true } },
                roles: { include: { role: { select: { id: true, name: true } } } },
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compute permissions and dept manager claims
        const { computePermissionsForUser, computeDeptManagerForUser } = await import('./utils/permissionUtils.js');
        const permissions = computePermissionsForUser(user as any);
        const deptManagerFor = computeDeptManagerForUser(user as any);

        // Return user data (includes LDAP-synced fields like name, department, etc.)
        return res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            jobTitle: user.jobTitle || null,
            phone: user.phone || null,
            address: user.address || null,
            city: user.city || null,
            country: user.country || null,
            employeeId: user.employeeId || null,
            supervisor: user.supervisor || null,
            department: user.department,
            roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
            permissions,
            deptManagerFor,
            ldapDN: user.ldapDN || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (e: any) {
        console.error('GET /api/auth/me error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to fetch user profile' });
    }
});

// PUT /api/auth/profile - Update user profile data
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
    try {
        const userObj = (req as any).user;
        const userId = userObj?.sub || userObj?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { name, jobTitle, phone, address, city, country, employeeId, supervisor } = req.body;

        const updated = await prisma.user.update({
            where: { id: parseInt(String(userId), 10) },
            data: {
                ...(name !== undefined && { name }),
                ...(jobTitle !== undefined && { jobTitle }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(country !== undefined && { country }),
                ...(employeeId !== undefined && { employeeId }),
                ...(supervisor !== undefined && { supervisor }),
            },
            include: {
                department: { select: { id: true, name: true, code: true } },
                roles: { include: { role: { select: { id: true, name: true } } } },
            },
        });

        // Return updated user data
        return res.json({
            id: updated.id,
            email: updated.email,
            name: updated.name,
            jobTitle: updated.jobTitle || null,
            phone: updated.phone || null,
            address: updated.address || null,
            city: updated.city || null,
            country: updated.country || null,
            employeeId: updated.employeeId || null,
            supervisor: updated.supervisor || null,
            department: updated.department,
            roles: updated.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
            ldapDN: updated.ldapDN || null,
        });
    } catch (e: any) {
        console.error('PUT /api/auth/profile error:', e);
        return res.status(500).json({ message: e?.message || 'Failed to update profile' });
    }
});

// ============================================
// EVALUATION ENDPOINTS
// ============================================

// Temporary runtime guard function: checks delegate presence at call time (not just startup)
function hasEvaluationDelegate(): boolean {
    // Use runtime inspection; PrismaClient type will include evaluation after successful generate
    // Avoid direct method invocation when undefined.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evalDelegate: any = (prisma as any).evaluation;
    return Boolean(evalDelegate && typeof evalDelegate.findMany === 'function');
}

// Expose lightweight version/debug info
const GIT_COMMIT = process.env.GIT_COMMIT || 'untracked';
app.get('/api/_version', (req, res) => {
    res.json({
        commit: GIT_COMMIT,
        hasEvaluationDelegate: hasEvaluationDelegate(),
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

// GET /api/evaluations - List all evaluations with filters
app.get(
    '/api/evaluations',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { status, search, dueBefore, dueAfter } = req.query;
        const userObj: any = (req as any).user;
        const userId = parseInt(userObj?.sub || userObj?.id);
        const roles: string[] = userObj?.roles || [];
        const isProcurement = roles.some((r: string) => r.toUpperCase().includes('PROCUREMENT'));
        const isCommittee = roles.some((r: string) => r.toUpperCase().includes('EVALUATION_COMMITTEE'));
        if (hasEvaluationDelegate()) {
            const where: Prisma.EvaluationWhereInput = {};
            if (status && status !== 'ALL') where.status = status as any;
            if (search) {
                where.OR = [
                    { evalNumber: { contains: search as string } },
                    { rfqNumber: { contains: search as string } },
                    { rfqTitle: { contains: search as string } },
                    { description: { contains: search as string } },
                ];
            }
            if (dueBefore) {
                if (where.dueDate && typeof where.dueDate === 'object' && !Array.isArray(where.dueDate)) {
                    where.dueDate = { ...(where.dueDate as object), lte: new Date(dueBefore as string) };
                } else {
                    where.dueDate = { lte: new Date(dueBefore as string) };
                }
            }
            if (dueAfter) {
                if (where.dueDate && typeof where.dueDate === 'object' && !Array.isArray(where.dueDate)) {
                    where.dueDate = { ...(where.dueDate as object), gte: new Date(dueAfter as string) };
                } else {
                    where.dueDate = { gte: new Date(dueAfter as string) };
                }
            }
            let evaluations = await (prisma as any).evaluation.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    validator: { select: { id: true, name: true, email: true } },
                    sectionAVerifier: { select: { id: true, name: true, email: true } },
                    sectionBVerifier: { select: { id: true, name: true, email: true } },
                    sectionCVerifier: { select: { id: true, name: true, email: true } },
                    sectionDVerifier: { select: { id: true, name: true, email: true } },
                    sectionEVerifier: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Filter evaluations based on access: show only if user is creator, procurement, committee, or assigned
            if (!isProcurement && !isCommittee) {
                const myAssignments = await (prisma as any).evaluationAssignment.findMany({
                    where: { userId },
                    select: { evaluationId: true },
                });
                const assignedIds = new Set(myAssignments.map((a: any) => a.evaluationId));
                evaluations = evaluations.filter((e: any) => e.createdBy === userId || assignedIds.has(e.id));
            }

            return res.json({ success: true, data: evaluations });
        }
        // Raw SQL fallback
        const rows = await prisma.$queryRawUnsafe<any>(
            `SELECT e.*, 
             uc.id AS creatorId, uc.name AS creatorName, uc.email AS creatorEmail, 
             uv.id AS validatorId, uv.name AS validatorName, uv.email AS validatorEmail,
             ua.id AS sectionAVerifierId, ua.name AS sectionAVerifierName, ua.email AS sectionAVerifierEmail,
             ub.id AS sectionBVerifierId, ub.name AS sectionBVerifierName, ub.email AS sectionBVerifierEmail,
             uc_v.id AS sectionCVerifierId, uc_v.name AS sectionCVerifierName, uc_v.email AS sectionCVerifierEmail,
             ud.id AS sectionDVerifierId, ud.name AS sectionDVerifierName, ud.email AS sectionDVerifierEmail,
             ue.id AS sectionEVerifierId, ue.name AS sectionEVerifierName, ue.email AS sectionEVerifierEmail
             FROM Evaluation e 
             LEFT JOIN User uc ON e.createdBy = uc.id 
             LEFT JOIN User uv ON e.validatedBy = uv.id
             LEFT JOIN User ua ON e.sectionAVerifiedBy = ua.id
             LEFT JOIN User ub ON e.sectionBVerifiedBy = ub.id
             LEFT JOIN User uc_v ON e.sectionCVerifiedBy = uc_v.id
             LEFT JOIN User ud ON e.sectionDVerifiedBy = ud.id
             LEFT JOIN User ue ON e.sectionEVerifiedBy = ue.id
             ORDER BY e.createdAt DESC`
        );
        const mapped = rows.map((r: any) => ({
            id: r.id,
            evalNumber: r.evalNumber,
            rfqNumber: r.rfqNumber,
            rfqTitle: r.rfqTitle,
            description: r.description,
            status: r.status,
            sectionA: r.sectionA ?? null,
            sectionB: r.sectionB ?? null,
            sectionC: r.sectionC ?? null,
            sectionD: r.sectionD ?? null,
            sectionE: r.sectionE ?? null,
            sectionAStatus: r.sectionAStatus || 'NOT_STARTED',
            sectionAVerifiedBy: r.sectionAVerifiedBy,
            sectionAVerifier: r.sectionAVerifierId ? { id: r.sectionAVerifierId, name: r.sectionAVerifierName, email: r.sectionAVerifierEmail } : null,
            sectionAVerifiedAt: r.sectionAVerifiedAt ?? null,
            sectionANotes: r.sectionANotes ?? null,
            sectionBStatus: r.sectionBStatus || 'NOT_STARTED',
            sectionBVerifiedBy: r.sectionBVerifiedBy,
            sectionBVerifier: r.sectionBVerifierId ? { id: r.sectionBVerifierId, name: r.sectionBVerifierName, email: r.sectionBVerifierEmail } : null,
            sectionBVerifiedAt: r.sectionBVerifiedAt ?? null,
            sectionBNotes: r.sectionBNotes ?? null,
            sectionCStatus: r.sectionCStatus || 'NOT_STARTED',
            sectionCVerifiedBy: r.sectionCVerifiedBy,
            sectionCVerifier: r.sectionCVerifierId ? { id: r.sectionCVerifierId, name: r.sectionCVerifierName, email: r.sectionCVerifierEmail } : null,
            sectionCVerifiedAt: r.sectionCVerifiedAt ?? null,
            sectionCNotes: r.sectionCNotes ?? null,
            sectionDStatus: r.sectionDStatus || 'NOT_STARTED',
            sectionDVerifiedBy: r.sectionDVerifiedBy,
            sectionDVerifier: r.sectionDVerifierId ? { id: r.sectionDVerifierId, name: r.sectionDVerifierName, email: r.sectionDVerifierEmail } : null,
            sectionDVerifiedAt: r.sectionDVerifiedAt ?? null,
            sectionDNotes: r.sectionDNotes ?? null,
            sectionEStatus: r.sectionEStatus || 'NOT_STARTED',
            sectionEVerifiedBy: r.sectionEVerifiedBy,
            sectionEVerifier: r.sectionEVerifierId ? { id: r.sectionEVerifierId, name: r.sectionEVerifierName, email: r.sectionEVerifierEmail } : null,
            sectionEVerifiedAt: r.sectionEVerifiedAt ?? null,
            sectionENotes: r.sectionENotes ?? null,
            createdBy: r.createdBy,
            creator: { id: r.creatorId, name: r.creatorName, email: r.creatorEmail },
            evaluator: r.evaluator,
            dueDate: r.dueDate ? r.dueDate : null,
            validatedBy: r.validatedBy,
            validator: r.validatorId ? { id: r.validatorId, name: r.validatorName, email: r.validatorEmail } : null,
            validatedAt: r.validatedAt ?? null,
            validationNotes: r.validationNotes ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            _fallback: true,
        }));
        res.json({ success: true, data: mapped, meta: { fallback: true } });
    })
);

// GET /api/evaluations/:id - Get single evaluation by ID
app.get(
    '/api/evaluations/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userObj: any = (req as any).user;
        const userId = parseInt(userObj?.sub || userObj?.id);
        const roles: string[] = userObj?.roles || [];
        const isProcurement = roles.some((r: string) => r.toUpperCase().includes('PROCUREMENT'));
        const isCommittee = roles.some((r: string) => r.toUpperCase().includes('EVALUATION_COMMITTEE'));

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.findUnique({
                where: { id: parseInt(id) },
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    validator: { select: { id: true, name: true, email: true } },
                    sectionAVerifier: { select: { id: true, name: true, email: true } },
                    sectionBVerifier: { select: { id: true, name: true, email: true } },
                    sectionCVerifier: { select: { id: true, name: true, email: true } },
                    sectionDVerifier: { select: { id: true, name: true, email: true } },
                    sectionEVerifier: { select: { id: true, name: true, email: true } },
                },
            });
            if (!evaluation) throw new NotFoundError('Evaluation not found');

            // Check if user has access: creator, procurement role, committee role, or assigned evaluator
            const isCreator = evaluation.createdBy === userId;
            let isAssigned = false;
            try {
                const assignment = await (prisma as any).evaluationAssignment.findFirst({
                    where: { evaluationId: parseInt(id), userId },
                });
                isAssigned = !!assignment;
            } catch (e) {
                // Fallback to raw SQL if Prisma enum validation fails
                const assignmentRows = await prisma.$queryRawUnsafe<any>(`SELECT 1 FROM EvaluationAssignment WHERE evaluationId=${parseInt(id)} AND userId=${userId} LIMIT 1`);
                isAssigned = assignmentRows.length > 0;
            }

            if (!isCreator && !isProcurement && !isCommittee && !isAssigned) {
                throw new Error('You do not have permission to view this evaluation');
            }
            return res.json({ success: true, data: evaluation });
        }
        const rows = await prisma.$queryRawUnsafe<any>(
            `SELECT e.*, 
             uc.id AS creatorId, uc.name AS creatorName, uc.email AS creatorEmail, 
             uv.id AS validatorId, uv.name AS validatorName, uv.email AS validatorEmail,
             ua.id AS sectionAVerifierId, ua.name AS sectionAVerifierName, ua.email AS sectionAVerifierEmail,
             ub.id AS sectionBVerifierId, ub.name AS sectionBVerifierName, ub.email AS sectionBVerifierEmail,
             uc_v.id AS sectionCVerifierId, uc_v.name AS sectionCVerifierName, uc_v.email AS sectionCVerifierEmail,
             ud.id AS sectionDVerifierId, ud.name AS sectionDVerifierName, ud.email AS sectionDVerifierEmail,
             ue.id AS sectionEVerifierId, ue.name AS sectionEVerifierName, ue.email AS sectionEVerifierEmail
             FROM Evaluation e 
             LEFT JOIN User uc ON e.createdBy = uc.id 
             LEFT JOIN User uv ON e.validatedBy = uv.id
             LEFT JOIN User ua ON e.sectionAVerifiedBy = ua.id
             LEFT JOIN User ub ON e.sectionBVerifiedBy = ub.id
             LEFT JOIN User uc_v ON e.sectionCVerifiedBy = uc_v.id
             LEFT JOIN User ud ON e.sectionDVerifiedBy = ud.id
             LEFT JOIN User ue ON e.sectionEVerifiedBy = ue.id
             WHERE e.id = ${parseInt(id)} LIMIT 1`
        );
        const r = rows[0];
        if (!r) throw new NotFoundError('Evaluation not found');
        const mapped = {
            id: r.id,
            evalNumber: r.evalNumber,
            rfqNumber: r.rfqNumber,
            rfqTitle: r.rfqTitle,
            description: r.description,
            status: r.status,

            sectionA: r.sectionA ?? null,
            sectionAStatus: r.sectionAStatus || 'NOT_STARTED',
            sectionAVerifiedBy: r.sectionAVerifiedBy,
            sectionAVerifier: r.sectionAVerifierId ? { id: r.sectionAVerifierId, name: r.sectionAVerifierName, email: r.sectionAVerifierEmail } : null,
            sectionAVerifiedAt: r.sectionAVerifiedAt ?? null,
            sectionANotes: r.sectionANotes ?? null,

            sectionB: r.sectionB ?? null,
            sectionBStatus: r.sectionBStatus || 'NOT_STARTED',
            sectionBVerifiedBy: r.sectionBVerifiedBy,
            sectionBVerifier: r.sectionBVerifierId ? { id: r.sectionBVerifierId, name: r.sectionBVerifierName, email: r.sectionBVerifierEmail } : null,
            sectionBVerifiedAt: r.sectionBVerifiedAt ?? null,
            sectionBNotes: r.sectionBNotes ?? null,

            sectionC: r.sectionC ?? null,
            sectionCStatus: r.sectionCStatus || 'NOT_STARTED',
            sectionCVerifiedBy: r.sectionCVerifiedBy,
            sectionCVerifier: r.sectionCVerifierId ? { id: r.sectionCVerifierId, name: r.sectionCVerifierName, email: r.sectionCVerifierEmail } : null,
            sectionCVerifiedAt: r.sectionCVerifiedAt ?? null,
            sectionCNotes: r.sectionCNotes ?? null,

            sectionD: r.sectionD ?? null,
            sectionDStatus: r.sectionDStatus || 'NOT_STARTED',
            sectionDVerifiedBy: r.sectionDVerifiedBy,
            sectionDVerifier: r.sectionDVerifierId ? { id: r.sectionDVerifierId, name: r.sectionDVerifierName, email: r.sectionDVerifierEmail } : null,
            sectionDVerifiedAt: r.sectionDVerifiedAt ?? null,
            sectionDNotes: r.sectionDNotes ?? null,

            sectionE: r.sectionE ?? null,
            sectionEStatus: r.sectionEStatus || 'NOT_STARTED',
            sectionEVerifiedBy: r.sectionEVerifiedBy,
            sectionEVerifier: r.sectionEVerifierId ? { id: r.sectionEVerifierId, name: r.sectionEVerifierName, email: r.sectionEVerifierEmail } : null,
            sectionEVerifiedAt: r.sectionEVerifiedAt ?? null,
            sectionENotes: r.sectionENotes ?? null,

            createdBy: r.createdBy,
            creator: { id: r.creatorId, name: r.creatorName, email: r.creatorEmail },
            evaluator: r.evaluator,
            dueDate: r.dueDate ? r.dueDate : null,
            validatedBy: r.validatedBy,
            validator: r.validatorId ? { id: r.validatorId, name: r.validatorName, email: r.validatorEmail } : null,
            validatedAt: r.validatedAt ?? null,
            validationNotes: r.validationNotes ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            _fallback: true,
        };
        res.json({ success: true, data: mapped, meta: { fallback: true } });
    })
);

// POST /api/evaluations - Create new evaluation
app.post(
    '/api/evaluations',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const user = (req as any).user;
        const {
            evalNumber,
            rfqNumber,
            rfqTitle,
            description,
            sectionA,
            sectionB,
            sectionC,
            sectionD,
            sectionE,
            dueDate,
            evaluator,
            submitToCommittee: submitToCommitteeRaw,
            combinedRequestId,
        } = req.body;
        const submitToCommittee = Boolean(submitToCommitteeRaw);

        // JWT payload uses 'sub' for user ID, fallback to 'id' for compatibility
        const userId = user?.sub || user?.id;

        console.log('Creating evaluation with data:', {
            evalNumber,
            rfqNumber,
            rfqTitle,
            description,
            dueDate,
            evaluator,
            combinedRequestId,
            sectionA: JSON.stringify(sectionA),
            userId,
        });

        // Check if user is authenticated
        if (!user || !userId) {
            throw new BadRequestError('User not authenticated. Please log in again.');
        }

        if (!evalNumber || !rfqNumber || !rfqTitle) {
            throw new BadRequestError('Missing required fields: evalNumber, rfqNumber, rfqTitle');
        }

        // Check if evalNumber already exists
        if (hasEvaluationDelegate()) {
            // Check duplicate using delegate
            const existing = await (prisma as any).evaluation.findUnique({ where: { evalNumber } });
            if (existing) throw new BadRequestError('Evaluation number already exists');

            try {
                const evaluation = await (prisma as any).evaluation.create({
                    data: {
                        evalNumber,
                        rfqNumber,
                        rfqTitle,
                        description: description || null,
                        combinedRequestId: combinedRequestId ? parseInt(combinedRequestId) : null,
                        sectionA: sectionA || null,
                        sectionAStatus: sectionA && submitToCommittee ? 'SUBMITTED' : 'NOT_STARTED',
                        sectionB: sectionB || null,
                        sectionBStatus: sectionB && submitToCommittee ? 'SUBMITTED' : 'NOT_STARTED',
                        sectionC: sectionC || null,
                        sectionCStatus: sectionC && submitToCommittee ? 'SUBMITTED' : 'NOT_STARTED',
                        sectionD: sectionD || null,
                        sectionDStatus: sectionD && submitToCommittee ? 'SUBMITTED' : 'NOT_STARTED',
                        sectionE: sectionE || null,
                        sectionEStatus: sectionE && submitToCommittee ? 'SUBMITTED' : 'NOT_STARTED',
                        evaluator: evaluator || null,
                        dueDate: dueDate ? new Date(dueDate) : null,
                        createdBy: userId,
                        status: submitToCommittee ? 'COMMITTEE_REVIEW' : 'PENDING',
                    },
                    include: { creator: { select: { id: true, name: true, email: true } } },
                });
                console.log('✅ Evaluation created successfully:', evaluation.id);
                return res.status(201).json({ success: true, data: evaluation });
            } catch (error) {
                console.error('❌ Prisma create error:', error);
                if (error instanceof Error) {
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                }
                throw error;
            }
        }
        // Fallback duplicate check via raw SQL
        const dupRows = await prisma.$queryRawUnsafe<any>(`SELECT id FROM Evaluation WHERE evalNumber='${evalNumber.replace(/'/g, "''")}' LIMIT 1`);
        if (dupRows[0]) throw new BadRequestError('Evaluation number already exists');

        const evalStatus = submitToCommittee ? 'COMMITTEE_REVIEW' : 'PENDING';

        await prisma.$executeRawUnsafe(
            `INSERT INTO Evaluation (evalNumber, rfqNumber, rfqTitle, description, sectionA, sectionAStatus, sectionB, sectionBStatus, sectionC, sectionCStatus, sectionD, sectionDStatus, sectionE, sectionEStatus, createdBy, evaluator, dueDate, status, createdAt, updatedAt) VALUES (
                            '${evalNumber}', '${rfqNumber}', '${rfqTitle}', 
                            ${description ? `'${description.replace(/'/g, "''")}'` : 'NULL'}, 
                            ${sectionA ? `'${JSON.stringify(sectionA).replace(/'/g, "''")}'` : 'NULL'}, 
                            ${sectionA && submitToCommittee ? "'SUBMITTED'" : "'NOT_STARTED'"},
                            ${sectionB ? `'${JSON.stringify(sectionB).replace(/'/g, "''")}'` : 'NULL'}, 
                            ${sectionB && submitToCommittee ? "'SUBMITTED'" : "'NOT_STARTED'"},
                            ${sectionC ? `'${JSON.stringify(sectionC).replace(/'/g, "''")}'` : 'NULL'}, 
                            ${sectionC && submitToCommittee ? "'SUBMITTED'" : "'NOT_STARTED'"},
                            ${sectionD ? `'${JSON.stringify(sectionD).replace(/'/g, "''")}'` : 'NULL'}, 
                            ${sectionD && submitToCommittee ? "'SUBMITTED'" : "'NOT_STARTED'"},
                            ${sectionE ? `'${JSON.stringify(sectionE).replace(/'/g, "''")}'` : 'NULL'}, 
                            ${sectionE && submitToCommittee ? "'SUBMITTED'" : "'NOT_STARTED'"},
                            ${userId}, 
                            ${evaluator ? `'${evaluator.replace(/'/g, "''")}'` : 'NULL'}, 
                            ${dueDate ? `'${new Date(dueDate).toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'}, '${evalStatus}', NOW(), NOW())`
        );
        const createdRow = await prisma.$queryRawUnsafe<any>(
            `SELECT e.*, uc.id AS creatorId, uc.name AS creatorName, uc.email AS creatorEmail FROM Evaluation e LEFT JOIN User uc ON e.createdBy = uc.id WHERE e.evalNumber='${evalNumber}' LIMIT 1`
        );
        const r = createdRow[0];
        const mapped = {
            id: r.id,
            evalNumber: r.evalNumber,
            rfqNumber: r.rfqNumber,
            rfqTitle: r.rfqTitle,
            description: r.description,
            status: r.status,
            sectionA: r.sectionA ?? null,
            createdBy: r.createdBy,
            creator: { id: r.creatorId, name: r.creatorName, email: r.creatorEmail },
            evaluator: r.evaluator,
            dueDate: r.dueDate ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            _fallback: true,
        };
        res.status(201).json({ success: true, data: mapped, meta: { fallback: true } });
    })
);

// POST /api/evaluations/:id/assign - Assign evaluation sections to users (auto-includes requesters)
app.post(
    '/api/evaluations/:id/assign',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { userIds, sections } = (req.body || {}) as { userIds?: number[]; sections?: string[] };
        const authUser: any = (req as any).user;
        const roles: string[] = authUser?.roles || [];
        const isProcurement = roles.some((r: string) => r.toUpperCase().includes('PROCUREMENT'));

        if (!isProcurement) {
            return res.status(403).json({ success: false, message: 'Only procurement users can assign evaluators' });
        }

        if (!hasEvaluationDelegate()) {
            return res.status(501).json({ success: false, message: 'Assignments require Prisma model; please run migrations' });
        }

        const evalId = parseInt(id);
        if (!Number.isFinite(evalId)) throw new BadRequestError('Invalid evaluation ID');

        const evalRecord = await (prisma as any).evaluation.findUnique({
            where: { id: evalId },
            include: {
                combinedRequest: { include: { lots: { select: { requesterId: true } } } },
            },
        });
        if (!evalRecord) throw new NotFoundError('Evaluation not found');

        // Determine requester(s) from combined lots; auto-include as assignees
        const requesterIds: number[] = Array.isArray(evalRecord?.combinedRequest?.lots) ? Array.from(new Set(evalRecord.combinedRequest.lots.map((l: any) => l.requesterId).filter(Boolean))) : [];

        const uniqueUserIds = Array.from(new Set([...(userIds || []), ...requesterIds])).filter((n) => Number.isFinite(n));
        if (uniqueUserIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid recipients to assign' });
        }

        const sectionList = (Array.isArray(sections) && sections.length ? sections : ['B', 'C']).map((s) => String(s).toUpperCase());

        // Upsert assignments
        const created: any[] = [];
        for (const uid of uniqueUserIds) {
            const assignment = await (prisma as any).evaluationAssignment.upsert({
                where: { evaluationId_userId: { evaluationId: evalId, userId: uid } },
                update: { sections: sectionList },
                create: { evaluationId: evalId, userId: uid, sections: sectionList, status: 'PENDING' },
            });
            created.push(assignment);

            // Notify assignee
            try {
                await (prisma as any).notification.create({
                    data: {
                        userId: uid,
                        type: 'EVALUATION_VERIFIED',
                        message: `You have been assigned to contribute to Evaluation ${evalRecord.evalNumber}.`,
                        data: { evaluationId: evalId, evalNumber: evalRecord.evalNumber, rfqTitle: evalRecord.rfqTitle, sections: sectionList },
                    },
                });
            } catch (e) {
                console.error('Failed to create assignment notification:', e);
            }
        }

        return res.json({ success: true, data: created, message: 'Assignments saved' });
    })
);

// GET /api/evaluations/assignments/me - List assignments for current user
app.get(
    '/api/evaluations/assignments/me',
    authMiddleware,
    asyncHandler(async (req, res) => {
        if (!hasEvaluationDelegate()) {
            return res.status(501).json({ success: false, message: 'Assignments require Prisma model; please run migrations' });
        }

        const userObj: any = (req as any).user;
        const userId = parseInt(userObj?.sub || userObj?.id);
        if (!Number.isFinite(userId)) throw new BadRequestError('Invalid user');

        try {
            const assignments = await (prisma as any).evaluationAssignment.findMany({
                where: { userId },
                include: {
                    evaluation: {
                        include: {
                            creator: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return res.json({ success: true, data: assignments });
        } catch (e) {
            // Fallback to raw SQL if Prisma enum validation fails due to drift
            const rows = await prisma.$queryRawUnsafe<any>(
                `SELECT ea.*, 
                        e.evalNumber, e.rfqTitle, e.createdBy AS evalCreatedBy,
                        uc.id AS creatorId, uc.name AS creatorName, uc.email AS creatorEmail
                 FROM EvaluationAssignment ea
                 JOIN Evaluation e ON ea.evaluationId = e.id
                 LEFT JOIN User uc ON e.createdBy = uc.id
                 WHERE ea.userId = ${userId}
                 ORDER BY ea.createdAt DESC`
            );
            const mapped = rows.map((r: any) => ({
                id: r.id,
                evaluationId: r.evaluationId,
                userId: r.userId,
                sections: r.sections,
                status: r.status,
                submittedAt: r.submittedAt ?? null,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                evaluation: {
                    id: r.evaluationId,
                    evalNumber: r.evalNumber,
                    rfqTitle: r.rfqTitle,
                    creator: { id: r.creatorId, name: r.creatorName, email: r.creatorEmail },
                },
            }));
            return res.json({ success: true, data: mapped, meta: { fallback: true } });
        }
    })
);

// POST /api/evaluations/:id/assignments/complete - Evaluator marks their assignment as complete
app.post(
    '/api/evaluations/:id/assignments/complete',
    authMiddleware,
    asyncHandler(async (req, res) => {
        if (!hasEvaluationDelegate()) {
            return res.status(501).json({ success: false, message: 'Assignments require Prisma model' });
        }

        const { id } = req.params;
        const userObj: any = (req as any).user;
        const userId = parseInt(userObj?.sub || userObj?.id);
        const evaluationId = parseInt(id);

        // Find the assignment
        const assignment = await (prisma as any).evaluationAssignment.findFirst({
            where: { evaluationId, userId },
            include: { evaluation: { include: { creator: true } } },
        });

        if (!assignment) {
            throw new NotFoundError('You are not assigned to this evaluation');
        }

        // Update assignment status to SUBMITTED (fallback to raw SQL if enum mismatch exists)
        try {
            await (prisma as any).evaluationAssignment.update({
                where: { id: assignment.id },
                data: {
                    status: 'SUBMITTED',
                    submittedAt: new Date(),
                },
            });
        } catch (e) {
            // If Prisma enum validation fails due to DB drift, use raw SQL
            try {
                await prisma.$executeRawUnsafe(`UPDATE EvaluationAssignment SET status='SUBMITTED', submittedAt=NOW(), updatedAt=NOW() WHERE id=${assignment.id}`);
            } catch (inner) {
                throw e; // bubble original error
            }
        }

        // Notify procurement officer (creator)
        try {
            await (prisma as any).notification.create({
                data: {
                    userId: assignment.evaluation.createdBy,
                    type: 'EVALUATION_VERIFIED',
                    message: `${userObj.name || userObj.email} has completed their evaluation assignment for ${assignment.evaluation.evalNumber}`,
                    data: { evaluationId, evalNumber: assignment.evaluation.evalNumber },
                },
            });
        } catch (e) {
            console.error('Failed to create completion notification:', e);
        }

        res.json({ success: true, message: 'Assignment marked as complete and procurement notified' });
    })
);

// PATCH /api/evaluations/:id - Update evaluation
app.patch(
    '/api/evaluations/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status, sectionA, sectionB, sectionC, sectionD, sectionE, validationNotes } = req.body;

        if (!hasEvaluationDelegate()) {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT id FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
            if (!checkRow[0]) throw new NotFoundError('Evaluation not found');
        } else {
            const existing = await (prisma as any).evaluation.findUnique({ where: { id: parseInt(id) } });
            if (!existing) throw new NotFoundError('Evaluation not found');
        }

        const updateData: Prisma.EvaluationUpdateInput = {};

        if (status) updateData.status = status;
        if (sectionA) updateData.sectionA = sectionA;
        if (sectionB) updateData.sectionB = sectionB;
        if (sectionC) updateData.sectionC = sectionC;
        if (sectionD) updateData.sectionD = sectionD;
        if (sectionE) updateData.sectionE = sectionE;
        if (validationNotes) updateData.validationNotes = validationNotes;

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: { creator: { select: { id: true, name: true, email: true } }, validator: { select: { id: true, name: true, email: true } } },
            });
            return res.json({ success: true, data: evaluation });
        }
        // Raw update: construct dynamic SET clause
        const sets: string[] = [];
        const jsonFields: Array<[string, any]> = [
            ['sectionA', sectionA],
            ['sectionB', sectionB],
            ['sectionC', sectionC],
            ['sectionD', sectionD],
            ['sectionE', sectionE],
        ];
        if (status) sets.push(`status='${String(status).replace(/'/g, "''")}'`);
        for (const [key, val] of jsonFields) {
            if (val !== undefined) sets.push(`${key}=${val === null ? 'NULL' : `'${JSON.stringify(val).replace(/'/g, "''")}'`}`);
        }
        if (validationNotes) sets.push(`validationNotes='${String(validationNotes).replace(/'/g, "''")}'`);
        sets.push('updatedAt=NOW()');
        if (sets.length) await prisma.$executeRawUnsafe(`UPDATE Evaluation SET ${sets.join(', ')} WHERE id=${parseInt(id)}`);
        const row = await prisma.$queryRawUnsafe<any>(
            `SELECT e.*, uc.id AS creatorId, uc.name AS creatorName, uc.email AS creatorEmail, uv.id AS validatorId, uv.name AS validatorName, uv.email AS validatorEmail FROM Evaluation e LEFT JOIN User uc ON e.createdBy = uc.id LEFT JOIN User uv ON e.validatedBy = uv.id WHERE e.id = ${parseInt(
                id
            )} LIMIT 1`
        );
        const r = row[0];
        const mapped = {
            id: r.id,
            evalNumber: r.evalNumber,
            rfqNumber: r.rfqNumber,
            rfqTitle: r.rfqTitle,
            description: r.description,
            status: r.status,
            sectionA: r.sectionA ?? null,
            sectionB: r.sectionB ?? null,
            sectionC: r.sectionC ?? null,
            sectionD: r.sectionD ?? null,
            sectionE: r.sectionE ?? null,
            createdBy: r.createdBy,
            creator: { id: r.creatorId, name: r.creatorName, email: r.creatorEmail },
            evaluator: r.evaluator,
            dueDate: r.dueDate ?? null,
            validatedBy: r.validatedBy,
            validator: r.validatorId ? { id: r.validatorId, name: r.validatorName, email: r.validatorEmail } : null,
            validatedAt: r.validatedAt ?? null,
            validationNotes: r.validationNotes ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            _fallback: true,
        };
        res.json({ success: true, data: mapped, meta: { fallback: true } });
    })
);

// PATCH /api/evaluations/:id/committee - Update committee section data
app.patch(
    '/api/evaluations/:id/committee',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { section, data } = req.body;

        if (!section || !data) {
            throw new BadRequestError('Missing required fields: section, data');
        }

        let existing: any = null;
        if (hasEvaluationDelegate()) {
            existing = await (prisma as any).evaluation.findUnique({ where: { id: parseInt(id) } });
        } else {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT id, status FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
            existing = checkRow[0];
        }
        if (!existing) throw new NotFoundError('Evaluation not found');

        const updateData: Prisma.EvaluationUpdateInput = {};
        const sectionKey = `section${section.toUpperCase()}` as keyof Prisma.EvaluationUpdateInput;
        updateData[sectionKey] = data;

        // Workflow: Pending -> In Progress on first edits
        if (existing.status === 'PENDING') {
            updateData.status = 'IN_PROGRESS';
        }

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: { creator: { select: { id: true, name: true, email: true } } },
            });
            return res.json({ success: true, data: evaluation });
        }
        const sets: string[] = [];
        const sectionField = `section${section.toUpperCase()}`;
        sets.push(`${sectionField}='${JSON.stringify(data).replace(/'/g, "''")}'`);
        if (existing.status === 'PENDING') sets.push(`status='IN_PROGRESS'`);
        sets.push('updatedAt=NOW()');
        await prisma.$executeRawUnsafe(`UPDATE Evaluation SET ${sets.join(', ')} WHERE id=${parseInt(id)}`);
        const row = await prisma.$queryRawUnsafe<any>(
            `SELECT e.*, uc.id AS creatorId, uc.name AS creatorName, uc.email AS creatorEmail FROM Evaluation e LEFT JOIN User uc ON e.createdBy = uc.id WHERE e.id = ${parseInt(id)} LIMIT 1`
        );
        const r = row[0];
        const mapped = {
            id: r.id,
            evalNumber: r.evalNumber,
            rfqNumber: r.rfqNumber,
            rfqTitle: r.rfqTitle,
            description: r.description,
            status: r.status,
            sectionA: r.sectionA ?? null,
            sectionB: r.sectionB ?? null,
            sectionC: r.sectionC ?? null,
            sectionD: r.sectionD ?? null,
            sectionE: r.sectionE ?? null,
            createdBy: r.createdBy,
            creator: { id: r.creatorId, name: r.creatorName, email: r.creatorEmail },
            evaluator: r.evaluator,
            dueDate: r.dueDate ?? null,
            validatedBy: r.validatedBy,
            validatedAt: r.validatedAt ?? null,
            validationNotes: r.validationNotes ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            _fallback: true,
        };
        res.json({ success: true, data: mapped, meta: { fallback: true } });
    })
);

// PATCH /api/evaluations/:id/sections/:section - Update a section (for returned sections)
app.patch(
    '/api/evaluations/:id/sections/:section',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id, section } = req.params;
        const sectionData = req.body;
        const sectionUpper = section.toUpperCase();
        const userObj: any = (req as any).user;
        const userId = userObj?.sub || userObj?.id;

        // Validate ID is numeric
        const evaluationId = parseInt(id);
        if (isNaN(evaluationId) || evaluationId <= 0) {
            throw new BadRequestError('Invalid evaluation ID');
        }

        if (!['A', 'B', 'C', 'D', 'E'].includes(sectionUpper)) {
            throw new BadRequestError('Invalid section. Must be A, B, C, D, or E');
        }

        // Validate section data is provided
        if (!sectionData || typeof sectionData !== 'object') {
            throw new BadRequestError('Section data is required');
        }

        let existing: any = null;
        if (hasEvaluationDelegate()) {
            existing = await (prisma as any).evaluation.findUnique({ where: { id: evaluationId } });
        } else {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT * FROM Evaluation WHERE id = ${evaluationId} LIMIT 1`);
            existing = checkRow[0];
        }
        if (!existing) throw new NotFoundError('Evaluation not found');

        // Authorization: Creator, procurement, or assigned user for this section
        let authorized = existing.createdBy === userId;
        if (!authorized) {
            const rolesArr = userObj?.roles || [];
            const isProc = rolesArr.some((r: string) => r.toUpperCase().includes('PROCUREMENT_OFFICER') || r.toUpperCase().includes('PROCUREMENT_MANAGER') || r.toUpperCase().includes('PROCUREMENT'));
            if (isProc) authorized = true;
        }
        if (!authorized && hasEvaluationDelegate()) {
            const assn = await (prisma as any).evaluationAssignment.findUnique({
                where: { evaluationId_userId: { evaluationId, userId } },
            });
            if (assn) {
                try {
                    const secs = Array.isArray(assn.sections)
                        ? (assn.sections as any[])
                        : (() => {
                              try {
                                  return JSON.parse((assn as any).sections || '[]');
                              } catch {
                                  return [];
                              }
                          })();
                    authorized = secs.map((s: string) => String(s).toUpperCase()).includes(sectionUpper);
                } catch {
                    authorized = false;
                }
            }
        }
        if (!authorized) {
            throw new BadRequestError('Unauthorized to update this evaluation');
        }

        const updateData: any = {};
        updateData[`section${sectionUpper}`] = sectionData;
        // Clear return notes when updating
        updateData[`section${sectionUpper}Notes`] = null;
        updateData[`section${sectionUpper}VerifiedAt`] = null;
        updateData[`section${sectionUpper}VerifiedBy`] = null;
        // Set status to IN_PROGRESS so it can be resubmitted
        updateData[`section${sectionUpper}Status`] = 'IN_PROGRESS';

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    [`section${sectionUpper}Verifier`]: { select: { id: true, name: true, email: true } },
                },
            });
            return res.json({ success: true, data: evaluation, message: `Section ${sectionUpper} updated` });
        }

        const jsonData = JSON.stringify(sectionData).replace(/'/g, "''");
        await prisma.$executeRawUnsafe(
            `UPDATE Evaluation SET section${sectionUpper}='${jsonData}', section${sectionUpper}Status='IN_PROGRESS', section${sectionUpper}Notes=NULL, section${sectionUpper}VerifiedAt=NULL, section${sectionUpper}VerifiedBy=NULL, updatedAt=NOW() WHERE id=${parseInt(
                id
            )}`
        );
        res.json({ success: true, message: `Section ${sectionUpper} updated`, meta: { fallback: true } });
    })
);

// POST /api/evaluations/:id/sections/:section/submit - Submit section for committee review
app.post(
    '/api/evaluations/:id/sections/:section/submit',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id, section } = req.params;
        const sectionUpper = section.toUpperCase();
        const userObj: any = (req as any).user;
        const userId = parseInt(userObj?.sub || userObj?.id);
        const roles: string[] = userObj?.roles || [];
        const isProcurement = roles.some((r: string) => r.toUpperCase().includes('PROCUREMENT'));

        // Validate ID is numeric
        const evaluationId = parseInt(id);
        if (isNaN(evaluationId) || evaluationId <= 0) {
            throw new BadRequestError('Invalid evaluation ID');
        }

        if (!['A', 'B', 'C', 'D', 'E'].includes(sectionUpper)) {
            throw new BadRequestError('Invalid section. Must be A, B, C, D, or E');
        }

        let existing: any = null;
        if (hasEvaluationDelegate()) {
            existing = await (prisma as any).evaluation.findUnique({ where: { id: evaluationId } });
        } else {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT * FROM Evaluation WHERE id = ${evaluationId} LIMIT 1`);
            existing = checkRow[0];
        }
        if (!existing) throw new NotFoundError('Evaluation not found');

        // Check access: procurement can submit Section A; assigned evaluators can submit their assigned sections
        const isCreator = existing.createdBy === userId;
        if (!isProcurement && !isCreator) {
            // Check if user is assigned and section is in their assignment
            const assignment = await (prisma as any).evaluationAssignment.findFirst({
                where: { evaluationId, userId },
            });
            if (!assignment) {
                throw new Error('You are not assigned to this evaluation');
            }
            const assignedSections = Array.isArray(assignment.sections)
                ? assignment.sections
                : (() => {
                      try {
                          return JSON.parse((assignment as any).sections || '[]');
                      } catch {
                          return [];
                      }
                  })();
            if (!assignedSections.includes(sectionUpper)) {
                throw new Error(`You are not assigned to Section ${sectionUpper}`);
            }
        }

        // Check if section data exists
        const sectionDataKey = `section${sectionUpper}`;
        if (!existing[sectionDataKey]) {
            throw new BadRequestError(`Section ${sectionUpper} has no data to submit`);
        }

        const updateData: any = {};
        const statusField = `section${sectionUpper}Status`;
        updateData[statusField] = 'SUBMITTED';

        // Update evaluation status to COMMITTEE_REVIEW when any section is submitted
        if (existing.status !== 'COMMITTEE_REVIEW' && existing.status !== 'COMPLETED') {
            updateData.status = 'COMMITTEE_REVIEW';
        }

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    [`section${sectionUpper}Verifier`]: { select: { id: true, name: true, email: true } },
                },
            });
            return res.json({ success: true, data: evaluation, message: `Section ${sectionUpper} submitted for review` });
        }

        const sets: string[] = [`${statusField}='SUBMITTED'`, 'updatedAt=NOW()'];
        if (existing.status !== 'COMMITTEE_REVIEW' && existing.status !== 'COMPLETED') {
            sets.push(`status='COMMITTEE_REVIEW'`);
        }
        await prisma.$executeRawUnsafe(`UPDATE Evaluation SET ${sets.join(', ')} WHERE id=${parseInt(id)}`);
        res.json({ success: true, message: `Section ${sectionUpper} submitted for review`, meta: { fallback: true } });
    })
);

// POST /api/evaluations/:id/sections/:section/verify - Committee verifies section (approve)
app.post(
    '/api/evaluations/:id/sections/:section/verify',
    authMiddleware,
    requireEvaluationCommittee,
    asyncHandler(async (req, res) => {
        const { id, section } = req.params;
        const { notes } = req.body;
        const userObj: any = (req as any).user;
        const userId = userObj?.sub || userObj?.id;
        const sectionUpper = section.toUpperCase();

        if (!['A', 'B', 'C', 'D', 'E'].includes(sectionUpper)) {
            throw new BadRequestError('Invalid section. Must be A, B, C, D, or E');
        }

        let existing: any = null;
        if (hasEvaluationDelegate()) {
            existing = await (prisma as any).evaluation.findUnique({ where: { id: parseInt(id) } });
        } else {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT * FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
            existing = checkRow[0];
        }
        if (!existing) throw new NotFoundError('Evaluation not found');

        const statusField = `section${sectionUpper}Status`;
        if (existing[statusField] !== 'SUBMITTED') {
            throw new BadRequestError(`Section ${sectionUpper} must be submitted before verification`);
        }

        const updateData: any = {};
        updateData[statusField] = 'VERIFIED';
        updateData[`section${sectionUpper}VerifiedBy`] = userId;
        updateData[`section${sectionUpper}VerifiedAt`] = new Date();
        if (notes) updateData[`section${sectionUpper}Notes`] = notes;

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    [`section${sectionUpper}Verifier`]: { select: { id: true, name: true, email: true } },
                },
            });

            // Check if all sections are now verified
            const allSections = ['A', 'B', 'C', 'D', 'E'];
            const allVerified = allSections.every((s) => {
                const sectionStatus = evaluation[`section${s}Status`];
                return sectionStatus === 'VERIFIED';
            });

            // If all sections verified, update evaluation status and notify creator
            if (allVerified && evaluation.status !== 'COMPLETED') {
                const completedEvaluation = await (prisma as any).evaluation.update({
                    where: { id: parseInt(id) },
                    data: { status: 'COMPLETED' },
                    include: {
                        creator: { select: { id: true, name: true, email: true } },
                        sectionAVerifier: { select: { id: true, name: true, email: true } },
                        sectionBVerifier: { select: { id: true, name: true, email: true } },
                        sectionCVerifier: { select: { id: true, name: true, email: true } },
                        sectionDVerifier: { select: { id: true, name: true, email: true } },
                        sectionEVerifier: { select: { id: true, name: true, email: true } },
                    },
                });

                // Send notification to creator
                try {
                    await prisma.notification.create({
                        data: {
                            userId: completedEvaluation.createdBy,
                            type: 'EVALUATION_VERIFIED',
                            message: `Evaluation ${completedEvaluation.evalNumber} has been fully verified by the committee and is now completed.`,
                            data: {
                                evaluationId: completedEvaluation.id,
                                evalNumber: completedEvaluation.evalNumber,
                                rfqTitle: completedEvaluation.rfqTitle,
                            },
                        },
                    });
                } catch (notifErr) {
                    console.error('Failed to create notification:', notifErr);
                }

                return res.json({ success: true, data: completedEvaluation, message: `Section ${sectionUpper} verified. All sections complete!` });
            }

            return res.json({ success: true, data: evaluation, message: `Section ${sectionUpper} verified` });
        }

        const sets: string[] = [`${statusField}='VERIFIED'`, `section${sectionUpper}VerifiedBy=${userId}`, `section${sectionUpper}VerifiedAt=NOW()`, 'updatedAt=NOW()'];
        if (notes) sets.push(`section${sectionUpper}Notes='${notes.replace(/'/g, "''")}'`);
        await prisma.$executeRawUnsafe(`UPDATE Evaluation SET ${sets.join(', ')} WHERE id=${parseInt(id)}`);
        res.json({ success: true, message: `Section ${sectionUpper} verified`, meta: { fallback: true } });
    })
);

// POST /api/evaluations/:id/sections/:section/return - Committee or Procurement returns section for changes
app.post(
    '/api/evaluations/:id/sections/:section/return',
    authMiddleware,
    requireRole('EVALUATION_COMMITTEE', 'PROCUREMENT', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER'),
    asyncHandler(async (req, res) => {
        const { id, section } = req.params;
        const { notes } = req.body;
        const userObj: any = (req as any).user;
        const userId = userObj?.sub || userObj?.id;
        const sectionUpper = section.toUpperCase();

        if (!['A', 'B', 'C', 'D', 'E'].includes(sectionUpper)) {
            throw new BadRequestError('Invalid section. Must be A, B, C, D, or E');
        }

        if (!notes || notes.trim() === '') {
            throw new BadRequestError('Notes are required when returning a section');
        }

        let existing: any = null;
        if (hasEvaluationDelegate()) {
            existing = await (prisma as any).evaluation.findUnique({ where: { id: parseInt(id) } });
        } else {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT * FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
            existing = checkRow[0];
        }
        if (!existing) throw new NotFoundError('Evaluation not found');

        // Check user roles for procurement privilege
        const userRoles = userObj?.roles || [];
        const isProcurement = userRoles.some((role: string) => ['PROCUREMENT', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER'].includes(role.toUpperCase()));

        const statusField = `section${sectionUpper}Status`;

        // Procurement can return sections at any status (for structural edits)
        // Committee can only return SUBMITTED sections
        if (!isProcurement && existing[statusField] !== 'SUBMITTED') {
            throw new BadRequestError(`Section ${sectionUpper} must be submitted before returning`);
        }

        const updateData: any = {};
        updateData[statusField] = 'RETURNED';
        updateData[`section${sectionUpper}VerifiedBy`] = userId;
        updateData[`section${sectionUpper}VerifiedAt`] = new Date();
        updateData[`section${sectionUpper}Notes`] = notes;
        // Change evaluation status back to IN_PROGRESS so Procurement can edit and resubmit
        updateData.status = 'IN_PROGRESS';

        if (hasEvaluationDelegate()) {
            const evaluation = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    [`section${sectionUpper}Verifier`]: { select: { id: true, name: true, email: true } },
                },
            });

            // Send notification to creator that section was returned
            try {
                await prisma.notification.create({
                    data: {
                        userId: evaluation.createdBy,
                        type: 'EVALUATION_RETURNED',
                        message: `Section ${sectionUpper} of Evaluation ${evaluation.evalNumber} has been returned for changes. Please review the committee's notes.`,
                        data: {
                            evaluationId: evaluation.id,
                            evalNumber: evaluation.evalNumber,
                            rfqTitle: evaluation.rfqTitle,
                            section: sectionUpper,
                            notes: notes,
                        },
                    },
                });
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
            }

            return res.json({ success: true, data: evaluation, message: `Section ${sectionUpper} returned for changes` });
        }

        const sets: string[] = [
            `${statusField}='RETURNED'`,
            `section${sectionUpper}VerifiedBy=${userId}`,
            `section${sectionUpper}VerifiedAt=NOW()`,
            `section${sectionUpper}Notes='${notes.replace(/'/g, "''")}'`,
            `status='IN_PROGRESS'`,
            'updatedAt=NOW()',
        ];
        await prisma.$executeRawUnsafe(`UPDATE Evaluation SET ${sets.join(', ')} WHERE id=${parseInt(id)}`);
        res.json({ success: true, message: `Section ${sectionUpper} returned for changes`, meta: { fallback: true } });
    })
);

// POST /api/evaluations/:id/validate - Executive Director validates a completed evaluation
app.post(
    '/api/evaluations/:id/validate',
    authMiddleware,
    requireExecutive,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { notes } = req.body as { notes?: string };
        const userObj: any = (req as any).user;
        const userId = parseInt(userObj?.sub || userObj?.id);

        if (isNaN(parseInt(id))) throw new BadRequestError('Invalid evaluation ID');

        let existing: any = null;
        if (hasEvaluationDelegate()) {
            existing = await (prisma as any).evaluation.findUnique({ where: { id: parseInt(id) } });
        } else {
            const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT * FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
            existing = checkRow[0];
        }
        if (!existing) throw new NotFoundError('Evaluation not found');

        if (existing.status !== 'COMPLETED' && existing.status !== 'VALIDATED') {
            throw new BadRequestError('Only completed evaluations can be validated');
        }

        // If already validated, just return the current record
        if (existing.status === 'VALIDATED') {
            return res.json({ success: true, data: existing, message: 'Evaluation already validated' });
        }

        if (hasEvaluationDelegate()) {
            const updated = await (prisma as any).evaluation.update({
                where: { id: parseInt(id) },
                data: { status: 'VALIDATED', validatedBy: userId, validatedAt: new Date(), validationNotes: notes || null },
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    validator: { select: { id: true, name: true, email: true } },
                },
            });

            // Optional: notify creator about validation
            try {
                await prisma.notification.create({
                    data: {
                        userId: updated.createdBy,
                        type: 'EVALUATION_VERIFIED',
                        message: `Evaluation ${updated.evalNumber} has been validated by the Executive Director.`,
                        data: { evaluationId: updated.id, evalNumber: updated.evalNumber, rfqTitle: updated.rfqTitle },
                    },
                });
            } catch (e) {
                console.error('Failed to create validation notification:', e);
            }

            return res.json({ success: true, data: updated, message: 'Evaluation validated' });
        }

        // Fallback: raw SQL path
        const safeNotes = notes ? notes.replace(/'/g, "''") : null;
        await prisma.$executeRawUnsafe(
            `UPDATE Evaluation SET status='VALIDATED', validatedBy=${userId}, validatedAt=NOW(), validationNotes=${safeNotes ? `'${safeNotes}'` : 'NULL'}, updatedAt=NOW() WHERE id=${parseInt(id)}`
        );
        const row = await prisma.$queryRawUnsafe<any>(`SELECT * FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
        const updated = row[0];
        res.json({ success: true, data: updated, message: 'Evaluation validated' });
    })
);

// DELETE /api/evaluations/:id - Delete evaluation
app.delete(
    '/api/evaluations/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (hasEvaluationDelegate()) {
            const existing = await (prisma as any).evaluation.findUnique({ where: { id: parseInt(id) } });
            if (!existing) throw new NotFoundError('Evaluation not found');
            await (prisma as any).evaluation.delete({ where: { id: parseInt(id) } });
            return res.json({ success: true, message: 'Evaluation deleted successfully' });
        }
        const checkRow = await prisma.$queryRawUnsafe<any>(`SELECT id FROM Evaluation WHERE id = ${parseInt(id)} LIMIT 1`);
        if (!checkRow[0]) throw new NotFoundError('Evaluation not found');
        await prisma.$executeRawUnsafe(`DELETE FROM Evaluation WHERE id = ${parseInt(id)}`);
        res.json({ success: true, message: 'Evaluation deleted successfully', meta: { fallback: true } });
    })
);

// Stats API routes
app.use('/api/stats', statsRouter);

// Combine requests API routes
app.use('/api/requests/combine', combineRouter);

// Auth API routes
app.use('/api/auth', authRoutes);

// Admin API routes
app.use('/api/admin', adminRouter);

// DEBUG: List all registered routes (temporary; remove in production)
app.get('/api/_routes', (req, res) => {
    const routes: Array<{ path: string; methods: string[] }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any)._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
            const { path, methods } = middleware.route;
            routes.push({ path, methods: Object.keys(methods).filter((m) => methods[m]) });
        } else if (middleware.name === 'router' && middleware.handle?.stack) {
            middleware.handle.stack.forEach((handler: any) => {
                if (handler.route) {
                    const { path, methods } = handler.route;
                    routes.push({ path, methods: Object.keys(methods).filter((m) => methods[m]) });
                }
            });
        }
    });
    res.json({ routes });
});

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

        // Initialize Role Resolver (CRITICAL - must be done before auth middleware is used)
        // Load LDAP group mappings from config file
        const ldapGroupMappingsPath = path.join(__dirname, 'config', 'ldap-group-mapping.json');
        const ldapGroupMappings = JSON.parse(fs.readFileSync(ldapGroupMappingsPath, 'utf-8'));

        initializeGlobalRoleResolver({
            rolesPermissionsPath: path.join(__dirname, 'config', 'roles-permissions.json'),
            ldapGroupMappings: ldapGroupMappings.groupMappings || {},
            ldapAttributeMappings: ldapGroupMappings.attributeMappings || {},
            enableDatabaseOverrides: true,
            cacheTTL: 60 * 60 * 1000, // 1 hour
            defaultRole: 'REQUESTER',
        });

        await initRedis(); // Initialize Redis cache (non-blocking)
        trendingJobInterval = initTrendingScoreJob(); // Start trending score background job
        initAnalyticsJob(); // Start analytics aggregation job
        initWebSocket(httpServer); // Initialize WebSocket server

        // Start real-time system stats broadcast (every 5 seconds)
        const { activeSessions: sessions } = await import('./routes/stats');
        systemStatsInterval = setInterval(async () => {
            try {
                const activeUsers = sessions.size;

                // Get comprehensive health metrics from monitoring service
                const healthMetrics = getHealthStatus();
                const metrics = getMetrics();

                const apiResponseTime =
                    metrics.requests.total > 0 ? Object.values(metrics.requests.byEndpoint).reduce((sum, e) => sum + e.avgDuration, 0) / Object.values(metrics.requests.byEndpoint).length : 0;
                const requestSuccessRate = metrics.requests.total > 0 ? (metrics.requests.success / metrics.requests.total) * 100 : 0;

                // System uptime: Start at 100%, degrade based on performance issues
                let systemUptime = 100;

                // Degrade for slow response times
                if (apiResponseTime > 1000) {
                    systemUptime -= 30;
                } else if (apiResponseTime > 500) {
                    systemUptime -= 20;
                } else if (apiResponseTime > 200) {
                    systemUptime -= 10;
                }

                // Degrade for low success rate
                if (requestSuccessRate < 80) {
                    systemUptime -= 40;
                } else if (requestSuccessRate < 90) {
                    systemUptime -= 25;
                } else if (requestSuccessRate < 95) {
                    systemUptime -= 10;
                }

                // Degrade based on overall health status
                if (healthMetrics.status === 'unhealthy') {
                    systemUptime -= 30;
                } else if (healthMetrics.status === 'degraded') {
                    systemUptime -= 15;
                }

                systemUptime = Math.max(0, Math.min(100, systemUptime));

                broadcastSystemStats({
                    activeUsers,
                    systemUptime: Math.round(systemUptime),
                    apiResponseTime,
                    requestSuccessRate,
                    serverHealthScore: healthMetrics.status === 'healthy' ? 100 : healthMetrics.status === 'degraded' ? 70 : 40,
                    cpuLoad: '0%',
                    memoryUsage: '0%',
                });
            } catch (err) {
                console.error('[SystemStats] Error broadcasting stats:', err);
            }
        }, 5000); // Broadcast every 5 seconds

        httpServer.listen(PORT, API_HOST, () => {
            console.log(`🚀 Environment: ${APP_ENV.toUpperCase()}`);
            console.log(`API server listening on http://${PUBLIC_HOST}:${PORT} (bind ${API_HOST})`);
            console.log(`WebSocket server ready on ws://${PUBLIC_HOST}:${PORT}`);
            console.log(`Health check: http://${PUBLIC_HOST}:${PORT}/health`);
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

    // Clear system stats broadcast
    if (systemStatsInterval) {
        clearInterval(systemStatsInterval);
        systemStatsInterval = null;
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
