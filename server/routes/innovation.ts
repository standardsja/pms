/**
 * Innovation Hub Routes
 * Handles analytics, leaderboard, and other innovation-specific endpoints
 */
import { Router } from 'express';
import { prisma } from '../prismaClient';
import { logger } from '../config/logger';
import { cacheGet, cacheSet } from '../config/redis';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/innovation/analytics
 * Returns comprehensive innovation hub analytics and KPIs
 */
router.get(
    '/analytics',
    authMiddleware,
    asyncHandler(async (req, res) => {
        // Cache analytics for 5 minutes
        const cacheKey = 'innovation:analytics';
        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        try {
            // Get status counts
            const [pending, approved, rejected, promoted, draft, total] = await Promise.all([
                prisma.idea.count({ where: { status: 'PENDING_REVIEW' } }),
                prisma.idea.count({ where: { status: 'APPROVED' } }),
                prisma.idea.count({ where: { status: 'REJECTED' } }),
                prisma.idea.count({ where: { status: 'PROMOTED_TO_PROJECT' } }),
                prisma.idea.count({ where: { status: 'DRAFT' } }),
                prisma.idea.count(),
            ]);

            // Category distribution
            const categoryResults = await prisma.idea.groupBy({
                by: ['category'],
                _count: { id: true },
            });

            const ideasByCategory: Record<string, number> = {};
            categoryResults.forEach((c) => {
                ideasByCategory[c.category] = c._count.id;
            });

            // Top contributors (by ideas submitted)
            const topContributors = await prisma.idea.groupBy({
                by: ['submittedBy'],
                _count: { id: true },
                _sum: { voteCount: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5,
            });

            const contributorsData = await Promise.all(
                topContributors.map(async (c) => {
                    const user = await prisma.user.findUnique({
                        where: { id: c.submittedBy },
                        select: { name: true, email: true },
                    });
                    return {
                        name: user?.name || user?.email || 'Unknown',
                        ideas: c._count.id,
                        votes: c._sum.voteCount || 0,
                    };
                })
            );

            // Calculate engagement trend (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const weeklyIdeas = await prisma.idea.findMany({
                where: { createdAt: { gte: sevenDaysAgo } },
                select: { createdAt: true, voteCount: true },
            });

            const weeklyEngagement = {
                views: [0, 0, 0, 0, 0, 0, 0],
                votes: [0, 0, 0, 0, 0, 0, 0],
            };

            weeklyIdeas.forEach((idea) => {
                const dayIndex = Math.floor((new Date().getTime() - idea.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                if (dayIndex < 7) {
                    weeklyEngagement.votes[6 - dayIndex] += idea.voteCount;
                    weeklyEngagement.views[6 - dayIndex] += 1;
                }
            });

            const analytics = {
                kpis: {
                    totalIdeas: total,
                    underReview: pending,
                    approved,
                    promoted,
                    totalEngagement: pending + approved + rejected + promoted,
                },
                submissionsByMonth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Last 12 months
                ideasByCategory,
                statusPipeline: {
                    submitted: draft,
                    underReview: pending,
                    approved,
                    rejected,
                    promoted,
                },
                topContributors: contributorsData,
                weeklyEngagement,
            };

            await cacheSet(cacheKey, analytics, 300); // 5 minute cache
            res.json(analytics);
        } catch (error) {
            logger.error('Failed to fetch analytics', error);
            // Return default empty analytics on error
            res.json({
                kpis: { totalIdeas: 0, underReview: 0, approved: 0, promoted: 0, totalEngagement: 0 },
                submissionsByMonth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                ideasByCategory: {},
                statusPipeline: { submitted: 0, underReview: 0, approved: 0, rejected: 0, promoted: 0 },
                topContributors: [],
                weeklyEngagement: { views: [0, 0, 0, 0, 0, 0, 0], votes: [0, 0, 0, 0, 0, 0, 0] },
            });
        }
    })
);

/**
 * GET /api/leaderboard
 * Returns top contributors/innovators leaderboard
 */
router.get(
    '/leaderboard',
    authMiddleware,
    asyncHandler(async (req, res) => {
        // Cache leaderboard for 10 minutes
        const cacheKey = 'innovation:leaderboard';
        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        try {
            // Get top contributors with scoring
            const topIdeas = await prisma.idea.groupBy({
                by: ['submittedBy'],
                _count: { id: true },
                _sum: { voteCount: true },
                orderBy: [{ _sum: { voteCount: 'desc' } }, { _count: { id: 'desc' } }],
                take: 20,
            });

            const leaderboard = await Promise.all(
                topIdeas.map(async (item, index) => {
                    const user = await prisma.user.findUnique({
                        where: { id: item.submittedBy },
                        select: { id: true, name: true, email: true },
                    });

                    const ideaCount = item._count.id || 0;
                    const upvotes = item._sum.voteCount || 0;
                    const points = ideaCount * 10 + upvotes * 2; // Simple scoring

                    // Badges based on achievement
                    let badge = null;
                    if (ideaCount >= 10) badge = '⭐ Innovator';
                    else if (ideaCount >= 5) badge = '✨ Contributor';
                    else if (ideaCount >= 1) badge = '🚀 Starter';

                    return {
                        userId: user?.id || item.submittedBy,
                        name: user?.name || user?.email || 'Unknown',
                        email: user?.email || '',
                        ideaCount,
                        upvotes,
                        comments: 0, // Placeholder
                        points,
                        badge,
                    };
                })
            );

            const result = { leaderboard };
            await cacheSet(cacheKey, result, 600); // 10 minute cache
            res.json(result);
        } catch (error) {
            logger.error('Failed to fetch leaderboard', error);
            // Return empty leaderboard on error
            res.json({ leaderboard: [] });
        }
    })
);

export { router as innovationRoutes };
