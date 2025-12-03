import { Router, Request, Response } from 'express';
import { prisma } from '../prismaClient';

const router = Router();

/**
 * GET /api/stats/health
 * Health check endpoint to verify database connectivity
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/stats/modules
 * Returns real-time statistics for Procurement and Innovation Hub modules
 */
router.get('/modules', async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Get active users in last 5 minutes for procurement
        const procurementActiveNow = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: fiveMinutesAgo,
                },
                roles: {
                    some: {
                        role: {
                            name: {
                                in: ['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'DEPARTMENT_HEAD', 'EXECUTIVE_DIRECTOR', 'FINANCE_OFFICER'],
                            },
                        },
                    },
                },
            },
        });

        // Get users active today in procurement
        const procurementToday = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: todayStart,
                },
                roles: {
                    some: {
                        role: {
                            name: {
                                in: ['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'DEPARTMENT_HEAD', 'EXECUTIVE_DIRECTOR', 'FINANCE_OFFICER'],
                            },
                        },
                    },
                },
            },
        });

        // Get active users in last 5 minutes for innovation
        const innovationActiveNow = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: fiveMinutesAgo,
                },
                roles: {
                    some: {
                        role: {
                            name: {
                                in: ['INNOVATION_COMMITTEE', 'EMPLOYEE'],
                            },
                        },
                    },
                },
            },
        });

        // Get users active today in innovation
        const innovationToday = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: todayStart,
                },
                roles: {
                    some: {
                        role: {
                            name: {
                                in: ['INNOVATION_COMMITTEE', 'EMPLOYEE'],
                            },
                        },
                    },
                },
            },
        });

        res.json({
            procurement: {
                activeNow: procurementActiveNow,
                today: procurementToday,
            },
            innovation: {
                activeNow: innovationActiveNow,
                today: innovationToday,
            },
            timestamp: now.toISOString(),
        });
    } catch (error) {
        console.error('Error fetching module stats:', error);
        res.status(500).json({ error: 'Failed to fetch module statistics' });
    }
});

/**
 * GET /api/stats/dashboard
 * Returns comprehensive dashboard statistics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Active users today (updated in last 24 hours)
        const activeUsers = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: todayStart,
                },
            },
        });

        // Requests this month
        const requestsThisMonth = await prisma.request.count({
            where: {
                createdAt: {
                    gte: monthStart,
                },
            },
        });

        // Innovation ideas (total)
        const innovationIdeas = await prisma.idea.count();

        // Pending approvals (requests awaiting approval)
        const pendingApprovals = await prisma.request.count({
            where: {
                status: {
                    in: ['SUBMITTED', 'DEPARTMENT_REVIEW', 'HOD_REVIEW', 'PROCUREMENT_REVIEW', 'FINANCE_REVIEW'],
                },
            },
        });

        res.json({
            activeUsers,
            requestsThisMonth,
            innovationIdeas,
            pendingApprovals,
            timestamp: now.toISOString(),
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

/**
 * GET /api/stats/system
 * Returns system-wide statistics for login/onboarding screens
 * Public endpoint - no authentication required
 */
router.get('/system', async (req: Request, res: Response) => {
    try {
        console.log('[Stats] Fetching system stats...');
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Total active users (active in last 7 days)
        console.log('[Stats] Counting active users...');
        const activeUsers = await prisma.user.count({
            where: {
                updatedAt: {
                    gte: sevenDaysAgo,
                },
            },
        });
        console.log(`[Stats] Active users: ${activeUsers}`);

        // Requests this month
        console.log('[Stats] Counting requests this month...');
        const requestsThisMonth = await prisma.request.count({
            where: {
                createdAt: {
                    gte: monthStart,
                },
            },
        });
        console.log(`[Stats] Requests this month: ${requestsThisMonth}`);

        // Innovation ideas (total)
        console.log('[Stats] Counting innovation ideas...');
        const innovationIdeas = await prisma.idea.count();
        console.log(`[Stats] Innovation ideas: ${innovationIdeas}`);

        // Pending approvals (requests awaiting approval)
        console.log('[Stats] Counting pending approvals...');
        const pendingApprovals = await prisma.request.count({
            where: {
                status: {
                    in: ['SUBMITTED', 'DEPARTMENT_REVIEW', 'HOD_REVIEW', 'PROCUREMENT_REVIEW', 'FINANCE_REVIEW'],
                },
            },
        });
        console.log(`[Stats] Pending approvals: ${pendingApprovals}`);

        // System uptime percentage (hardcoded for now, can be calculated from logs)
        const systemUptime = 99.9;

        // Total processed requests (all time)
        console.log('[Stats] Counting total processed requests...');
        const totalProcessedRequests = await prisma.request.count({
            where: {
                status: {
                    in: ['DEPARTMENT_APPROVED', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'],
                },
            },
        });
        console.log(`[Stats] Total processed: ${totalProcessedRequests}`);

        const result = {
            activeUsers,
            requestsThisMonth,
            innovationIdeas,
            pendingApprovals,
            systemUptime,
            totalProcessedRequests,
            timestamp: now.toISOString(),
        };

        console.log('[Stats] System stats fetched successfully:', result);
        res.json(result);
    } catch (error) {
        console.error('[Stats] Error fetching system stats:', error);
        res.status(500).json({ error: 'Failed to fetch system statistics' });
    }
});

export default router;
