import { prisma } from '../prismaClient.js';

/**
 * Pre-aggregated analytics cache (updated periodically)
 */
interface AnalyticsCache {
    totalIdeas: number;
    totalVotes: number;
    totalComments: number;
    totalViews: number;
    ideasByStatus: Record<string, number>;
    ideasByCategory: Record<string, number>;
    topContributors: Array<{ userId: number; userName: string; ideasCount: number }>;
    votingTrends: Array<{ date: string; votes: number }>;
    submissionTrends: Array<{ date: string; submissions: number }>;
    avgVotesPerIdea: number;
    avgCommentsPerIdea: number;
    avgViewsPerIdea: number;
    lastUpdated: Date;
}

let analyticsCache: AnalyticsCache | null = null;
let updateInterval: NodeJS.Timeout | null = null;

/**
 * Calculate comprehensive analytics
 */
export async function calculateAnalytics(): Promise<AnalyticsCache> {
    console.log('[Analytics] Calculating analytics...');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        // Parallel execution for performance
        const [totalIdeas, totalVotes, totalComments, totalViews, ideasByStatus, ideasByCategory, topContributors, recentIdeas, recentVotes] = await Promise.all([
            // Total counts
            prisma.idea.count(),
            prisma.vote.count(),
            prisma.ideaComment.count(),
            prisma.idea.aggregate({ _sum: { viewCount: true } }),

            // Group by status
            prisma.idea.groupBy({
                by: ['status'],
                _count: { id: true },
            }),

            // Group by category
            prisma.idea.groupBy({
                by: ['category'],
                _count: { id: true },
            }),

            // Top contributors
            prisma.idea.groupBy({
                by: ['submittedBy'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),

            // Recent ideas (for submission trends)
            prisma.idea.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true },
            }),

            // Recent votes (for voting trends)
            prisma.vote.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true },
            }),
        ]);

        // Get user names for top contributors
        const contributorIds = topContributors.map((c: any) => c.submittedBy);
        const users = await prisma.user.findMany({
            where: { id: { in: contributorIds } },
            select: { id: true, name: true, email: true },
        });

        const userMap = new Map(users.map((u) => [u.id, u.name || u.email || 'Unknown']));

        // Format top contributors
        const topContributorsFormatted = topContributors.map((c: any) => ({
            userId: c.submittedBy,
            userName: userMap.get(c.submittedBy) || 'Unknown',
            ideasCount: c._count.id,
        }));

        // Format status distribution
        const statusDistribution: Record<string, number> = {};
        ideasByStatus.forEach((item: any) => {
            statusDistribution[item.status] = item._count.id;
        });

        // Format category distribution
        const categoryDistribution: Record<string, number> = {};
        ideasByCategory.forEach((item: any) => {
            categoryDistribution[item.category] = item._count.id;
        });

        // Calculate submission trends (daily for last 30 days)
        const submissionTrendsRaw = calculateDailyTrends(
            recentIdeas.map((i: any) => i.createdAt),
            30
        );
        const submissionTrends = submissionTrendsRaw.map(({ date, votes }) => ({ date, submissions: votes || 0 }));

        // Calculate voting trends (daily for last 30 days)
        const votingTrendsRaw = calculateDailyTrends(
            recentVotes.map((v: any) => v.createdAt),
            30
        );
        const votingTrends = votingTrendsRaw.map(({ date, votes }) => ({ date, votes: votes || 0 }));

        // Calculate averages
        const avgVotesPerIdea = totalIdeas > 0 ? Math.round((totalVotes / totalIdeas) * 10) / 10 : 0;
        const avgCommentsPerIdea = totalIdeas > 0 ? Math.round((totalComments / totalIdeas) * 10) / 10 : 0;
        const avgViewsPerIdea = totalIdeas > 0 ? Math.round(((totalViews._sum.viewCount || 0) / totalIdeas) * 10) / 10 : 0;

        const analytics: AnalyticsCache = {
            totalIdeas,
            totalVotes,
            totalComments,
            totalViews: totalViews._sum.viewCount || 0,
            ideasByStatus: statusDistribution,
            ideasByCategory: categoryDistribution,
            topContributors: topContributorsFormatted,
            votingTrends,
            submissionTrends,
            avgVotesPerIdea,
            avgCommentsPerIdea,
            avgViewsPerIdea,
            lastUpdated: new Date(),
        };

        analyticsCache = analytics;
        console.log('[Analytics] Analytics calculated successfully');
        return analytics;
    } catch (error) {
        console.error('[Analytics] Error calculating analytics:', error);
        throw error;
    }
}

/**
 * Helper function to calculate daily trends
 */
function calculateDailyTrends(dates: Date[], days: number): Array<{ date: string; votes?: number; submissions?: number }> {
    const trends: Record<string, number> = {};
    const now = new Date();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trends[dateStr] = 0;
    }

    // Count occurrences
    dates.forEach((date) => {
        const dateStr = new Date(date).toISOString().split('T')[0];
        if (trends.hasOwnProperty(dateStr)) {
            trends[dateStr]++;
        }
    });

    // Convert to array and sort by date (return as generic count, caller renames)
    return Object.entries(trends)
        .map(([date, count]) => ({ date, votes: count, submissions: count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get cached analytics (or calculate if not available)
 */
export async function getAnalytics(): Promise<AnalyticsCache> {
    if (analyticsCache && isRecentEnough(analyticsCache.lastUpdated)) {
        return analyticsCache;
    }

    return await calculateAnalytics();
}

/**
 * Check if cached data is recent enough (5 minutes)
 */
function isRecentEnough(lastUpdated: Date): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdated > fiveMinutesAgo;
}

/**
 * Initialize periodic analytics update (every 5 minutes)
 */
export function initAnalyticsJob(): void {
    console.log('[Analytics] Initializing analytics job...');

    // Calculate immediately on startup
    calculateAnalytics().catch((err) => {
        console.error('[Analytics] Initial calculation failed:', err);
    });

    // Update every 5 minutes
    updateInterval = setInterval(() => {
        calculateAnalytics().catch((err) => {
            console.error('[Analytics] Scheduled calculation failed:', err);
        });
    }, 5 * 60 * 1000);

    console.log('[Analytics] Analytics job initialized (5 minute interval)');
}

/**
 * Stop analytics update job
 */
export function stopAnalyticsJob(): void {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('[Analytics] Analytics job stopped');
    }
}

/**
 * Get category-specific analytics
 */
export async function getCategoryAnalytics(category: IdeaCategory): Promise<{
    totalIdeas: number;
    approvalRate: number;
    avgVotes: number;
    avgViews: number;
    topIdea: any;
}> {
    try {
        const [ideas, approvedCount, topIdea] = await Promise.all([
            prisma.idea.findMany({
                where: { category },
                select: { voteCount: true, viewCount: true, status: true },
            }),
            prisma.idea.count({
                where: { category, status: IdeaStatus.APPROVED },
            }),
            prisma.idea.findFirst({
                where: { category },
                orderBy: { voteCount: 'desc' },
                select: { id: true, title: true, voteCount: true, viewCount: true },
            }),
        ]);

        const totalIdeas = ideas.length;
        const approvalRate = totalIdeas > 0 ? (approvedCount / totalIdeas) * 100 : 0;
        const avgVotes = totalIdeas > 0 ? ideas.reduce((sum, i) => sum + i.voteCount, 0) / totalIdeas : 0;
        const avgViews = totalIdeas > 0 ? ideas.reduce((sum, i) => sum + i.viewCount, 0) / totalIdeas : 0;

        return {
            totalIdeas,
            approvalRate: Math.round(approvalRate * 10) / 10,
            avgVotes: Math.round(avgVotes * 10) / 10,
            avgViews: Math.round(avgViews * 10) / 10,
            topIdea: topIdea || null,
        };
    } catch (error) {
        console.error(`[Analytics] Error calculating category analytics for ${category}:`, error);
        throw error;
    }
}

/**
 * Get time-based analytics (this week, this month, this year)
 */
export async function getTimeBasedAnalytics(): Promise<{
    thisWeek: { ideas: number; votes: number; comments: number };
    thisMonth: { ideas: number; votes: number; comments: number };
    thisYear: { ideas: number; votes: number; comments: number };
}> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    try {
        const [weekStats, monthStats, yearStats] = await Promise.all([
            Promise.all([
                prisma.idea.count({ where: { createdAt: { gte: weekAgo } } }),
                prisma.vote.count({ where: { createdAt: { gte: weekAgo } } }),
                prisma.ideaComment.count({ where: { createdAt: { gte: weekAgo } } }),
            ]),
            Promise.all([
                prisma.idea.count({ where: { createdAt: { gte: monthAgo } } }),
                prisma.vote.count({ where: { createdAt: { gte: monthAgo } } }),
                prisma.ideaComment.count({ where: { createdAt: { gte: monthAgo } } }),
            ]),
            Promise.all([
                prisma.idea.count({ where: { createdAt: { gte: yearStart } } }),
                prisma.vote.count({ where: { createdAt: { gte: yearStart } } }),
                prisma.ideaComment.count({ where: { createdAt: { gte: yearStart } } }),
            ]),
        ]);

        return {
            thisWeek: { ideas: weekStats[0], votes: weekStats[1], comments: weekStats[2] },
            thisMonth: { ideas: monthStats[0], votes: monthStats[1], comments: monthStats[2] },
            thisYear: { ideas: yearStats[0], votes: yearStats[1], comments: yearStats[2] },
        };
    } catch (error) {
        console.error('[Analytics] Error calculating time-based analytics:', error);
        throw error;
    }
}
