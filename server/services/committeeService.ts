import { prisma } from '../prismaClient';
import type { Prisma } from '@prisma/client';

/**
 * Batch approve/reject ideas for committee efficiency
 */
export async function batchUpdateIdeas(ideaIds: number[], action: 'APPROVE' | 'REJECT', reviewerId: number, notes?: string): Promise<{ updated: number; failed: number[] }> {
    const failed: number[] = [];
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    try {
        // Use transaction callback for proper typing
        await prisma.$transaction(async (tx) => {
            for (const ideaId of ideaIds) {
                try {
                    await tx.idea.update({
                        where: { id: ideaId },
                        data: {
                            status,
                            reviewedBy: reviewerId,
                            reviewedAt: new Date(),
                            reviewNotes: notes || null,
                        },
                    });
                } catch (error) {
                    failed.push(ideaId);
                }
            }
        });

        const updated = ideaIds.length - failed.length;
        return { updated, failed };
    } catch (error) {
        console.error('[CommitteeService] Batch update error:', error);
        return { updated: 0, failed: ideaIds };
    }
}

/**
 * Get committee dashboard statistics with optimized queries
 */
export async function getCommitteeDashboardStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    promoted: number;
    pendingThisWeek: number;
    approvalRate: number;
    avgReviewTime: number; // in hours
}> {
    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Parallel query execution for performance
        const [pending, approved, rejected, promoted, pendingThisWeek, reviewedIdeas] = await Promise.all([
            prisma.idea.count({ where: { status: 'PENDING_REVIEW' } }),
            prisma.idea.count({ where: { status: 'APPROVED' } }),
            prisma.idea.count({ where: { status: 'REJECTED' } }),
            prisma.idea.count({ where: { status: 'PROMOTED_TO_PROJECT' } }),
            prisma.idea.count({
                where: {
                    status: 'PENDING_REVIEW',
                    createdAt: { gte: oneWeekAgo },
                },
            }),
            // Fetch reviewed ideas to calculate avg review time
            prisma.idea.findMany({
                where: {
                    reviewedAt: { not: null },
                    status: { in: ['APPROVED', 'REJECTED'] },
                },
                select: {
                    submittedAt: true,
                    reviewedAt: true,
                },
                take: 100, // Sample last 100 for performance
                orderBy: { reviewedAt: 'desc' },
            }),
        ]);

        // Calculate approval rate
        const totalReviewed = approved + rejected;
        const approvalRate = totalReviewed > 0 ? (approved / totalReviewed) * 100 : 0;

        // Calculate average review time
        let avgReviewTime = 0;
        if (reviewedIdeas.length > 0) {
            const totalReviewTime = reviewedIdeas.reduce((sum, idea) => {
                if (idea.reviewedAt) {
                    const reviewTime = idea.reviewedAt.getTime() - idea.submittedAt.getTime();
                    return sum + reviewTime;
                }
                return sum;
            }, 0);
            avgReviewTime = totalReviewTime / reviewedIdeas.length / (1000 * 60 * 60); // Convert to hours
        }

        return {
            pending,
            approved,
            rejected,
            promoted,
            pendingThisWeek,
            approvalRate: Math.round(approvalRate * 10) / 10, // Round to 1 decimal
            avgReviewTime: Math.round(avgReviewTime * 10) / 10,
        };
    } catch (error) {
        console.error('[CommitteeService] Dashboard stats error:', error);
        return {
            pending: 0,
            approved: 0,
            rejected: 0,
            promoted: 0,
            pendingThisWeek: 0,
            approvalRate: 0,
            avgReviewTime: 0,
        };
    }
}

/**
 * Get pending ideas for committee review with optimized query
 */
export async function getPendingIdeasForReview(options: { limit?: number; offset?: number; sortBy?: 'recent' | 'votes' | 'oldest'; category?: string }): Promise<{
    ideas: Array<{
        id: number;
        title: string;
        description: string;
        category: string;
        submittedBy: string;
        submittedAt: Date;
        voteCount: number;
        viewCount: number;
        waitingDays: number;
    }>;
    total: number;
}> {
    const { limit = 20, offset = 0, sortBy = 'recent', category } = options;

    try {
        const where: any = {
            status: 'PENDING_REVIEW',
        };

        if (category) {
            where.category = category;
        }

        // Determine sort order
        let orderBy: any = { createdAt: 'desc' }; // recent
        if (sortBy === 'votes') {
            orderBy = { voteCount: 'desc' };
        } else if (sortBy === 'oldest') {
            orderBy = { createdAt: 'asc' };
        }

        // Parallel execution
        const [ideas, total] = await Promise.all([
            prisma.idea.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    submittedAt: true,
                    voteCount: true,
                    viewCount: true,
                    isAnonymous: true,
                    submitter: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy,
                take: limit,
                skip: offset,
            }),
            prisma.idea.count({ where }),
        ]);

        // Calculate waiting days and format
        const now = Date.now();
        const formattedIdeas = ideas.map((idea) => ({
            id: idea.id,
            title: idea.title,
            description: idea.description,
            category: idea.category,
            submittedBy: idea.isAnonymous ? 'Anonymous' : idea.submitter?.name || idea.submitter?.email || 'Unknown',
            submittedAt: idea.submittedAt,
            voteCount: idea.voteCount,
            viewCount: idea.viewCount,
            waitingDays: Math.floor((now - idea.submittedAt.getTime()) / (1000 * 60 * 60 * 24)),
        }));

        return { ideas: formattedIdeas, total };
    } catch (error) {
        console.error('[CommitteeService] Get pending ideas error:', error);
        return { ideas: [], total: 0 };
    }
}

/**
 * Get committee member review statistics
 */
export async function getCommitteeMemberStats(userId: number): Promise<{
    reviewsThisMonth: number;
    reviewsTotal: number;
    approvalRate: number;
    avgReviewTimeHours: number;
}> {
    try {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [reviewsThisMonth, reviewsTotal, reviewedIdeas] = await Promise.all([
            prisma.idea.count({
                where: {
                    reviewedBy: userId,
                    reviewedAt: { gte: oneMonthAgo },
                },
            }),
            prisma.idea.count({
                where: { reviewedBy: userId },
            }),
            prisma.idea.findMany({
                where: {
                    reviewedBy: userId,
                    reviewedAt: { not: null },
                },
                select: {
                    status: true,
                    submittedAt: true,
                    reviewedAt: true,
                },
                take: 100,
                orderBy: { reviewedAt: 'desc' },
            }),
        ]);

        // Calculate approval rate
        const approved = reviewedIdeas.filter((i) => i.status === 'APPROVED').length;
        const approvalRate = reviewedIdeas.length > 0 ? (approved / reviewedIdeas.length) * 100 : 0;

        // Calculate avg review time
        let avgReviewTimeHours = 0;
        if (reviewedIdeas.length > 0) {
            const totalTime = reviewedIdeas.reduce((sum, idea) => {
                if (idea.reviewedAt) {
                    return sum + (idea.reviewedAt.getTime() - idea.submittedAt.getTime());
                }
                return sum;
            }, 0);
            avgReviewTimeHours = totalTime / reviewedIdeas.length / (1000 * 60 * 60);
        }

        return {
            reviewsThisMonth,
            reviewsTotal,
            approvalRate: Math.round(approvalRate * 10) / 10,
            avgReviewTimeHours: Math.round(avgReviewTimeHours * 10) / 10,
        };
    } catch (error) {
        console.error('[CommitteeService] Member stats error:', error);
        return {
            reviewsThisMonth: 0,
            reviewsTotal: 0,
            approvalRate: 0,
            avgReviewTimeHours: 0,
        };
    }
}
