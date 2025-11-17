import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
                lastActive: {
                    gte: fiveMinutesAgo,
                },
                roles: {
                    hasSome: ['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'DEPARTMENT_HEAD', 'EXECUTIVE_DIRECTOR', 'FINANCE_OFFICER'],
                },
            },
        });

        // Get users active today in procurement
        const procurementToday = await prisma.user.count({
            where: {
                lastActive: {
                    gte: todayStart,
                },
                roles: {
                    hasSome: ['PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER', 'DEPARTMENT_HEAD', 'EXECUTIVE_DIRECTOR', 'FINANCE_OFFICER'],
                },
            },
        });

        // Get active users in last 5 minutes for innovation
        const innovationActiveNow = await prisma.user.count({
            where: {
                lastActive: {
                    gte: fiveMinutesAgo,
                },
                roles: {
                    hasSome: ['INNOVATION_COMMITTEE', 'EMPLOYEE'],
                },
            },
        });

        // Get users active today in innovation
        const innovationToday = await prisma.user.count({
            where: {
                lastActive: {
                    gte: todayStart,
                },
                roles: {
                    hasSome: ['INNOVATION_COMMITTEE', 'EMPLOYEE'],
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

export default router;
