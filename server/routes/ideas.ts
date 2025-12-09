/**
 * Ideas Routes
 * Handles all Innovation Hub idea operations
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../prismaClient';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { cacheGet, cacheSet, cacheDeletePattern } from '../config/redis';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { authMiddleware, requireCommittee } from '../middleware/auth';
import { validate, createIdeaSchema, voteSchema, approveRejectIdeaSchema, promoteIdeaSchema } from '../middleware/validation';
import { updateIdeaTrendingScore } from '../services/trendingService';
import { searchIdeas, getSearchSuggestions } from '../services/searchService';
import { findPotentialDuplicates } from '../services/duplicateDetectionService';
import { emitIdeaCreated, emitIdeaStatusChanged, emitVoteUpdated } from '../services/websocketService';

const router = Router();

// Rate limiting
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

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '_');
        cb(null, `idea_${Date.now()}_${base}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: config.MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (/^image\//.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image uploads are allowed'));
        }
    },
});

// Helper function to fix legacy status values
async function fixInvalidIdeaStatuses(): Promise<void> {
    try {
        const updates = [
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

        if (total > 0) {
            logger.info('Fixed invalid idea statuses', { updatedCount: total });
        }
    } catch (error) {
        logger.error('Failed to fix invalid idea statuses', error);
    }
}

// Get idea counts by status
router.get(
    '/counts',
    authMiddleware,
    asyncHandler(async (req, res) => {
        try {
            const counts = await prisma.$transaction(async (tx) => {
                const [pending, approved, rejected, promoted, draft, total] = await Promise.all([
                    tx.idea.count({ where: { status: 'PENDING_REVIEW' } }),
                    tx.idea.count({ where: { status: 'APPROVED' } }),
                    tx.idea.count({ where: { status: 'REJECTED' } }),
                    tx.idea.count({ where: { status: 'PROMOTED_TO_PROJECT' } }),
                    tx.idea.count({ where: { status: 'DRAFT' } }),
                    tx.idea.count(),
                ]);

                return { pending, approved, rejected, promoted, draft, total };
            });

            res.json(counts);
        } catch (error) {
            logger.error('Failed to fetch idea counts', error);
            res.status(500).json({ error: 'Failed to fetch idea counts' });
        }
    })
);

// List ideas with filtering and pagination
router.get(
    '/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        await fixInvalidIdeaStatuses();

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

        // Build cache key
        const cacheKey = `ideas:${userId}:${status || 'all'}:${sort || 'recent'}:${include || 'none'}:${mine || 'false'}:${cursor || 'start'}:${limit}`;

        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const where: any = {};

        // Filter to current user's ideas if mine=true
        if (mine === 'true' && user.sub) {
            where.submittedBy = user.sub;
        }

        // Filter by tag if provided
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
                };
            }
        }

        // Status filtering based on user role
        if (!isCommittee && mine !== 'true') {
            where.status = { in: ['APPROVED', 'PROMOTED_TO_PROJECT'] };
        } else if (status && status !== 'all') {
            const statusMap: Record<string, string> = {
                pending: 'PENDING_REVIEW',
                approved: 'APPROVED',
                rejected: 'REJECTED',
                promoted: 'PROMOTED_TO_PROJECT',
            };
            where.status = statusMap[status] || status;
        }

        // Sorting
        const orderBy: any = sort === 'trending' ? { trendingScore: 'desc' } : sort === 'popularity' ? { voteCount: 'desc' } : { createdAt: 'desc' };

        const includeAttachments = include === 'attachments';
        const take = Math.min(parseInt(limit, 10) || 20, 100);

        const ideas = await prisma.idea.findMany({
            where,
            orderBy,
            take: take + 1,
            ...(cursor && {
                cursor: { id: parseInt(cursor, 10) },
                skip: 1,
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

        // Batch load user votes
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

        const voteMap = new Map(userVotes.map((v) => [v.ideaId, v.voteType]));

        const ideasWithVotes = ideas.slice(0, take).map((idea: any) => ({
            ...idea,
            commentCount: idea._count?.comments || 0,
            hasVoted: voteMap.has(idea.id) ? (voteMap.get(idea.id) === 'UPVOTE' ? 'up' : 'down') : null,
            submittedBy: idea.isAnonymous ? 'Anonymous' : idea.submitter?.name || idea.submitter?.email || 'Unknown',
            tags: Array.isArray(idea.tags) ? idea.tags.map((it: any) => it.tag?.name).filter(Boolean) : [],
            tagObjects: Array.isArray(idea.tags) ? idea.tags.map((it: any) => ({ id: it.tagId, name: it.tag?.name })).filter((t: any) => t.name) : [],
        }));

        const hasMore = ideas.length > take;
        const nextCursor = hasMore ? ideas[take - 1]?.id : null;

        const result = {
            ideas: ideasWithVotes,
            pagination: {
                hasMore,
                nextCursor,
                limit: take,
            },
        };

        // Generate ETag for caching
        const etag = `"${crypto.createHash('md5').update(JSON.stringify(result)).digest('hex')}"`;
        const clientEtag = req.headers['if-none-match'];

        if (clientEtag === etag) {
            return res.status(304).end();
        }

        await cacheSet(cacheKey, result, 30);

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, max-age=30');
        res.json(result);
    })
);

// Get single idea by ID
router.get(
    '/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const ideaId = parseInt(id, 10);

        if (isNaN(ideaId)) {
            throw new BadRequestError('Invalid idea ID');
        }

        const idea = await prisma.idea.findUnique({
            where: { id: ideaId },
            include: {
                attachments: true,
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
                        votes: true,
                    },
                },
            },
        });

        if (!idea) {
            throw new NotFoundError('Idea not found');
        }

        // Check user's vote if authenticated
        const user = (req as any).user as { sub?: number };
        let hasVoted: 'up' | 'down' | null = null;

        if (user?.sub) {
            const userVote = await prisma.vote.findFirst({
                where: {
                    ideaId,
                    userId: user.sub,
                },
            });
            if (userVote) {
                hasVoted = userVote.voteType === 'UPVOTE' ? 'up' : 'down';
            }
        }

        res.json({
            ...idea,
            commentCount: idea._count?.comments || 0,
            hasVoted,
            submittedBy: idea.isAnonymous ? 'Anonymous' : idea.submitter?.name || idea.submitter?.email || 'Unknown',
            tags: Array.isArray(idea.tags) ? idea.tags.map((it: any) => it.tag?.name).filter(Boolean) : [],
        });
    })
);

// Create new idea
router.post(
    '/',
    authMiddleware,
    ideaCreationLimiter,
    upload.single('image'),
    validate(createIdeaSchema),
    asyncHandler(async (req, res) => {
        const user = (req as any).user as { sub: number };
        const { title, description, category, isAnonymous = false } = req.body;
        const tagIdsRaw = req.body?.tagIds || '';

        const idea = await prisma.idea.create({
            data: {
                title,
                description,
                category,
                status: 'PENDING_REVIEW',
                submittedBy: user.sub,
                isAnonymous: Boolean(isAnonymous),
            },
        });

        // Process tags
        const tagIds: number[] = String(tagIdsRaw)
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n));

        if (tagIds.length) {
            await prisma.ideaTag.createMany({
                data: tagIds.map((tid) => ({ ideaId: idea.id, tagId: tid })),
                skipDuplicates: true,
            });
        }

        // Process file upload
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

        // Reload with relations
        const created = await prisma.idea.findUnique({
            where: { id: idea.id },
            include: {
                attachments: true,
                tags: { include: { tag: true } },
            },
        });

        emitIdeaCreated(created);
        await cacheDeletePattern('ideas:*');

        logger.info('New idea created', { ideaId: idea.id, userId: user.sub });

        res.status(201).json(created);
    })
);

// Vote on idea
router.post(
    '/:id/vote',
    authMiddleware,
    voteLimiter,
    validate(voteSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { voteType } = req.body;
        const user = (req as any).user as { sub: number };

        const ideaId = parseInt(id, 10);
        const userId = user.sub;

        const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
        if (!idea) {
            throw new NotFoundError('Idea not found');
        }

        const type = voteType === 'DOWNVOTE' ? 'DOWNVOTE' : 'UPVOTE';

        // Atomic voting transaction
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.vote.findFirst({
                where: { ideaId, userId },
            });

            let voteCountDelta = 0;
            let upvoteCountDelta = 0;
            let downvoteCountDelta = 0;

            if (existing) {
                if (existing.voteType === type) {
                    // Same vote - return current state
                    return { idea, hasVoted: type === 'UPVOTE' ? 'up' : 'down' };
                }

                // Change vote type
                await tx.vote.update({
                    where: { id: existing.id },
                    data: { voteType: type },
                });

                if (existing.voteType === 'UPVOTE' && type === 'DOWNVOTE') {
                    voteCountDelta = -2;
                    upvoteCountDelta = -1;
                    downvoteCountDelta = 1;
                } else if (existing.voteType === 'DOWNVOTE' && type === 'UPVOTE') {
                    voteCountDelta = 2;
                    upvoteCountDelta = 1;
                    downvoteCountDelta = -1;
                }
            } else {
                // New vote
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

        await cacheDeletePattern('ideas:*');

        // Update trending score asynchronously
        updateIdeaTrendingScore(ideaId).catch((err) => logger.error('Failed to update trending score', { ideaId, error: err }));

        emitVoteUpdated(ideaId, result.idea.voteCount, result.idea.trendingScore);

        logger.info('Vote recorded', { ideaId, userId, voteType: type });

        res.json({ ...result.idea, hasVoted: result.hasVoted });
    })
);

// Remove vote from idea
router.delete(
    '/:id/vote',
    authMiddleware,
    voteLimiter,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const user = (req as any).user as { sub: number };

        const ideaId = parseInt(id, 10);
        const userId = user.sub;

        const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
        if (!idea) {
            throw new NotFoundError('Idea not found');
        }

        // Atomic vote removal transaction
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.vote.findFirst({
                where: { ideaId, userId },
            });

            if (!existing) {
                // No vote to remove
                return { idea, hasVoted: null };
            }

            // Remove the vote
            await tx.vote.delete({
                where: { id: existing.id },
            });

            // Update vote counts
            let voteCountDelta = 0;
            let upvoteCountDelta = 0;
            let downvoteCountDelta = 0;

            if (existing.voteType === 'UPVOTE') {
                voteCountDelta = -1;
                upvoteCountDelta = -1;
            } else {
                voteCountDelta = 1; // downvote removal increases net vote
                downvoteCountDelta = -1;
            }

            const updated = await tx.idea.update({
                where: { id: ideaId },
                data: {
                    voteCount: { increment: voteCountDelta },
                    upvoteCount: { increment: upvoteCountDelta },
                    downvoteCount: { increment: downvoteCountDelta },
                },
            });

            return { idea: updated, hasVoted: null };
        });

        await cacheDeletePattern('ideas:*');

        // Update trending score asynchronously
        updateIdeaTrendingScore(ideaId).catch((err) => logger.error('Failed to update trending score', { ideaId, error: err }));

        emitVoteUpdated(ideaId, result.idea.voteCount, result.idea.trendingScore);

        logger.info('Vote removed', { ideaId, userId });

        res.json({ ...result.idea, hasVoted: result.hasVoted });
    })
);

// Committee: Approve idea
router.post(
    '/:id/approve',
    authMiddleware,
    requireCommittee,
    validate(approveRejectIdeaSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { notes } = req.body;
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

        emitIdeaStatusChanged(updated.id, 'PENDING_REVIEW', 'APPROVED');
        await cacheDeletePattern('ideas:*');

        logger.info('Idea approved', { ideaId: updated.id, reviewerId: user.sub });

        res.json(updated);
    })
);

// Committee: Reject idea
router.post(
    '/:id/reject',
    authMiddleware,
    requireCommittee,
    validate(approveRejectIdeaSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { notes } = req.body;
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

        emitIdeaStatusChanged(updated.id, 'PENDING_REVIEW', 'REJECTED');
        await cacheDeletePattern('ideas:*');

        logger.info('Idea rejected', { ideaId: updated.id, reviewerId: user.sub });

        res.json(updated);
    })
);

// Committee: Promote idea to project
router.post(
    '/:id/promote',
    authMiddleware,
    requireCommittee,
    validate(promoteIdeaSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { projectCode } = req.body;
        const user = (req as any).user as { sub: number };

        const updated = await prisma.idea.update({
            where: { id: parseInt(id, 10) },
            data: {
                status: 'PROMOTED_TO_PROJECT',
                promotedAt: new Date(),
                projectCode: projectCode || null,
            },
        });

        emitIdeaStatusChanged(updated.id, 'APPROVED', 'PROMOTED_TO_PROJECT');
        await cacheDeletePattern('ideas:*');

        logger.info('Idea promoted to project', { ideaId: updated.id, projectCode, promotedBy: user.sub });

        res.json(updated);
    })
);

export { router as ideasRoutes };
