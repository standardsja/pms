import { Router, Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getHealthStatus, getMetrics } from '../services/monitoringService';

const router = Router();

// Server start time for uptime calculation
const SERVER_START_TIME = Date.now();

// In-memory store for active sessions (module activity)
// Key: userId, Value: { module: 'pms' | 'ih', lastSeen: Date }
const activeSessions = new Map<number, { module: 'pms' | 'ih'; lastSeen: Date }>();

// Export for real-time broadcasts
export { activeSessions, SERVER_START_TIME };

// Clean up stale sessions (inactive for more than 3 minutes)
// Heartbeat interval is 45s, so 3 minutes allows for ~4 missed heartbeats before cleanup
setInterval(() => {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    for (const [userId, session] of activeSessions.entries()) {
        if (session.lastSeen < threeMinutesAgo) {
            console.log('[Stats] Removing stale session for userId:', userId);
            activeSessions.delete(userId);
        }
    }
}, 30 * 1000); // Run cleanup every 30 seconds

/**
 * DELETE /api/stats/heartbeat
 * Remove user's active session (called on logout)
 */
router.delete('/heartbeat', authMiddleware, async (req: Request, res: Response) => {
    console.log('[Stats/Heartbeat] ===== LOGOUT/CLEANUP =====');
    try {
        // Extract userId from authenticated request
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.sub;

        if (!userId) {
            console.warn('[Stats/Heartbeat] No userId found in request');
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('[Stats/Heartbeat] Removing session for userId:', userId);
        activeSessions.delete(userId);

        res.json({
            success: true,
            message: 'Session cleared',
            activeUsers: activeSessions.size,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Stats] Error clearing session:', error);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

/**
 * POST /api/stats/heartbeat
 * Track user activity in a specific module
 * Body: { module: 'pms' | 'ih' }
 */
router.post('/heartbeat', authMiddleware, async (req: Request, res: Response) => {
    console.log('[Stats/Heartbeat] ===== ENDPOINT HIT =====');
    console.log('[Stats/Heartbeat] Body:', req.body);

    try {
        // Extract userId from authenticated request
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.sub;

        if (!userId) {
            console.warn('[Stats/Heartbeat] No userId found in request');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { module } = req.body;

        console.log('[Stats/Heartbeat] Using userId:', userId, 'module:', module);

        if (!module || !['pms', 'ih'].includes(module)) {
            console.warn('[Stats/Heartbeat] Invalid module:', module);
            return res.status(400).json({ error: 'Invalid module. Must be "pms" or "ih"' });
        }

        // Update session activity
        activeSessions.set(userId, {
            module: module as 'pms' | 'ih',
            lastSeen: new Date(),
        });

        console.log('[Stats/Heartbeat] Session updated. Active sessions:', activeSessions.size);
        console.log('[Stats/Heartbeat] Active sessions map:', Array.from(activeSessions.entries()));

        res.json({
            success: true,
            activeUsers: activeSessions.size,
            userId: userId,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Stats] Error recording heartbeat:', error);
        res.status(500).json({ error: 'Failed to record activity' });
    }
});

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
            activeSessions: activeSessions.size,
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

        // Count active sessions per module from in-memory store
        let procurementActiveNow = 0;
        let innovationActiveNow = 0;

        for (const [userId, session] of activeSessions.entries()) {
            if (session.module === 'pms') {
                procurementActiveNow++;
            } else if (session.module === 'ih') {
                innovationActiveNow++;
            }
        }

        // Total users with procurement access (any procurement-related role)
        const procurementTotalUsers = await prisma.user.count({
            where: {
                roles: {
                    some: {
                        role: {
                            name: {
                                in: ['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'DEPARTMENT_HEAD', 'EXECUTIVE_DIRECTOR', 'FINANCE_OFFICER', 'BUDGET_MANAGER'],
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

        // Total users with innovation hub access
        const innovationTotalUsers = await prisma.user.count({
            where: {
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
                totalUsers: procurementTotalUsers,
                activeNow: procurementActiveNow,
                today: procurementToday,
            },
            innovation: {
                totalUsers: innovationTotalUsers,
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

        // Active users now (from real-time sessions)
        console.log('[Stats] Counting active users from sessions...');
        const activeUsers = activeSessions.size;
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

        // Get comprehensive health metrics from monitoring service
        const healthMetrics = getHealthStatus();
        const metrics = getMetrics();

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

        const apiResponseTime =
            metrics.requests.total > 0 ? Object.values(metrics.requests.byEndpoint).reduce((sum, e) => sum + e.avgDuration, 0) / Object.values(metrics.requests.byEndpoint).length : 0;
        const requestSuccessRate = metrics.requests.total > 0 ? (metrics.requests.success / metrics.requests.total) * 100 : 0;
        const serverHealthScore = healthMetrics.status === 'healthy' ? 100 : healthMetrics.status === 'degraded' ? 70 : 40;

        // System uptime: Start at 100%, degrade based on performance issues
        let systemUptime = 100;

        // Degrade for slow response times (deduct up to 30%)
        if (apiResponseTime > 1000) {
            systemUptime -= 30; // Very slow (>1s)
        } else if (apiResponseTime > 500) {
            systemUptime -= 20; // Slow (>500ms)
        } else if (apiResponseTime > 200) {
            systemUptime -= 10; // Acceptable but not great (>200ms)
        }

        // Degrade for low success rate (deduct up to 40%)
        if (requestSuccessRate < 80) {
            systemUptime -= 40; // Many failures
        } else if (requestSuccessRate < 90) {
            systemUptime -= 25; // Some failures
        } else if (requestSuccessRate < 95) {
            systemUptime -= 10; // Few failures
        }

        // Degrade based on overall health status (deduct up to 30%)
        if (healthMetrics.status === 'unhealthy') {
            systemUptime -= 30;
        } else if (healthMetrics.status === 'degraded') {
            systemUptime -= 15;
        }

        // Ensure uptime stays within 0-100%
        systemUptime = Math.max(0, Math.min(100, systemUptime));

        const result = {
            activeUsers,
            requestsThisMonth,
            innovationIdeas,
            pendingApprovals,
            systemUptime: Math.round(systemUptime),
            apiResponseTime,
            requestSuccessRate,
            serverHealthScore,
            cpuLoad: '0%',
            memoryUsage: '0%',
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
