import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Log splintering alert
router.post('/splintering-alerts', async (req, res) => {
    try {
        const { requestId, alertType, severity, message, details, userId, wasBlocked } = req.body;

        // In a real implementation, you'd have a SplinteringAlert table
        // For now, we'll log to a generic audit log or console
        const alertData = {
            requestId: parseInt(requestId) || null,
            alertType,
            severity,
            message,
            details: JSON.stringify(details),
            userId: parseInt(userId) || null,
            wasBlocked: Boolean(wasBlocked),
            createdAt: new Date(),
        };

        console.log('🚨 SPLINTERING ALERT LOGGED:', alertData);

        // In production, save to database:
        // await prisma.splinteringAlert.create({ data: alertData });

        res.json({ success: true, message: 'Alert logged successfully' });
    } catch (error) {
        console.error('Failed to log splintering alert:', error);
        res.status(500).json({ error: 'Failed to log alert' });
    }
});

// Get splintering statistics
router.get('/splintering-stats', async (req, res) => {
    try {
        const { timeFrame = '30' } = req.query;
        const daysAgo = parseInt(timeFrame as string);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        // Get requests from the last N days
        const recentRequests = await prisma.procurementRequest.findMany({
            where: {
                createdAt: {
                    gte: cutoffDate,
                },
            },
            include: {
                user: {
                    select: { name: true, email: true, department: true },
                },
                items: true,
            },
        });

        // Analyze for potential splintering patterns
        const vendorGroups = new Map<string, any[]>();
        const departmentGroups = new Map<string, any[]>();
        const userGroups = new Map<string, any[]>();

        recentRequests.forEach((request) => {
            // Group by vendor (if available in items or metadata)
            const vendorKey = 'unknown'; // Would extract from request data
            if (!vendorGroups.has(vendorKey)) vendorGroups.set(vendorKey, []);
            vendorGroups.get(vendorKey)!.push(request);

            // Group by department
            const deptKey = request.user?.department?.name || 'unknown';
            if (!departmentGroups.has(deptKey)) departmentGroups.set(deptKey, []);
            departmentGroups.get(deptKey)!.push(request);

            // Group by user
            const userKey = request.user?.email || 'unknown';
            if (!userGroups.has(userKey)) userGroups.set(userKey, []);
            userGroups.get(userKey)!.push(request);
        });

        // Calculate statistics
        const stats = {
            totalRequests: recentRequests.length,
            timeFrame: `${daysAgo} days`,
            potentialFlags: {
                highFrequencyVendors: Array.from(vendorGroups.entries())
                    .filter(([_, requests]) => requests.length >= 3)
                    .map(([vendor, requests]) => ({
                        vendor,
                        requestCount: requests.length,
                        totalValue: requests.reduce((sum, r) => sum + (r.totalEstimated || 0), 0),
                    })),
                highFrequencyDepartments: Array.from(departmentGroups.entries())
                    .filter(([_, requests]) => requests.length >= 5)
                    .map(([dept, requests]) => ({
                        department: dept,
                        requestCount: requests.length,
                        totalValue: requests.reduce((sum, r) => sum + (r.totalEstimated || 0), 0),
                    })),
                highFrequencyUsers: Array.from(userGroups.entries())
                    .filter(([_, requests]) => requests.length >= 4)
                    .map(([user, requests]) => ({
                        user,
                        requestCount: requests.length,
                        totalValue: requests.reduce((sum, r) => sum + (r.totalEstimated || 0), 0),
                    })),
            },
        };

        res.json(stats);
    } catch (error) {
        console.error('Failed to get splintering stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Get potential splintering violations
router.get('/splintering-analysis', async (req, res) => {
    try {
        const { userId } = req.query;
        const user = userId ? parseInt(userId as string) : null;

        // Get requests for analysis
        const whereClause: any = {};
        if (user) whereClause.userId = user;

        const requests = await prisma.procurementRequest.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { id: true, name: true, email: true, department: true },
                },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit for performance
        });

        // Transform for splintering analysis
        const analysisData = requests.map((request) => ({
            id: request.id,
            vendorName: '', // Would extract from request metadata
            category: request.procurementType || 'general',
            department: request.user?.department?.name || 'unknown',
            description: request.description || '',
            estimatedCost: request.totalEstimated || 0,
            requestedDate: request.createdAt.toISOString(),
            requestedBy: request.user?.name || '',
        }));

        res.json(analysisData);
    } catch (error) {
        console.error('Failed to get splintering analysis:', error);
        res.status(500).json({ error: 'Failed to analyze requests' });
    }
});

// Splintering rules management
router.get('/splintering-rules', async (req, res) => {
    try {
        // In production, fetch from database
        // For now, return default rules
        const defaultRules = [
            {
                id: 'vendor-threshold',
                name: 'Vendor Spending Threshold',
                description: 'Flags multiple requests to same vendor within time period',
                thresholdAmount: 25000,
                timeWindowDays: 90,
                enabled: true,
            },
            {
                id: 'category-threshold',
                name: 'Category Spending Threshold',
                description: 'Flags multiple requests in same category within time period',
                thresholdAmount: 50000,
                timeWindowDays: 180,
                enabled: true,
            },
        ];

        res.json(defaultRules);
    } catch (error) {
        console.error('Failed to get splintering rules:', error);
        res.status(500).json({ error: 'Failed to get rules' });
    }
});

router.post('/splintering-rules', async (req, res) => {
    try {
        const rule = req.body;

        // In production, save to database
        // await prisma.splinteringRule.create({ data: rule });

        console.log('Splintering rule created:', rule);
        res.json({ success: true, message: 'Rule created successfully' });
    } catch (error) {
        console.error('Failed to create splintering rule:', error);
        res.status(500).json({ error: 'Failed to create rule' });
    }
});

export default router;
