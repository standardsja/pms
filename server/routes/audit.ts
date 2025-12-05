/**
 * Audit Trail Routes
 * API endpoints for viewing and querying audit logs
 */
import { Router } from 'express';
import { auditService } from '../services/auditService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuditAction } from '@prisma/client';

const router = Router();

/**
 * GET /api/audit/recent
 * Get recent audit logs (admin only)
 */
router.get(
    '/recent',
    asyncHandler(async (req, res) => {
        const user = (req as any).user;
        
        // Check if user has admin role
        if (!user?.roles?.includes('ADMIN')) {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
        const logs = await auditService.getRecentLogs(limit);

        res.json({
            success: true,
            data: logs,
            count: logs.length,
        });
    })
);

/**
 * GET /api/audit/entity/:entity/:entityId
 * Get audit logs for a specific entity (e.g., ProcurementRequest #123)
 */
router.get(
    '/entity/:entity/:entityId',
    asyncHandler(async (req, res) => {
        const user = (req as any).user;
        const { entity, entityId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

        // Users can view audit logs for entities they have access to
        // For now, require authentication
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const logs = await auditService.getEntityLogs(entity, parseInt(entityId), limit);

        res.json({
            success: true,
            data: logs,
            count: logs.length,
            entity,
            entityId: parseInt(entityId),
        });
    })
);

/**
 * GET /api/audit/user/:userId
 * Get audit logs for a specific user
 */
router.get(
    '/user/:userId',
    asyncHandler(async (req, res) => {
        const currentUser = (req as any).user;
        const { userId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

        // Users can view their own logs, admins can view any user's logs
        if (currentUser.sub !== parseInt(userId) && !currentUser.roles?.includes('ADMIN')) {
            return res.status(403).json({ message: 'Forbidden: Can only view your own audit logs' });
        }

        const logs = await auditService.getUserLogs(parseInt(userId), limit);

        res.json({
            success: true,
            data: logs,
            count: logs.length,
            userId: parseInt(userId),
        });
    })
);

/**
 * POST /api/audit/search
 * Search audit logs with filters (admin only)
 */
router.post(
    '/search',
    asyncHandler(async (req, res) => {
        const user = (req as any).user;

        // Check if user has admin role
        if (!user?.roles?.includes('ADMIN')) {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        const { userId, action, entity, startDate, endDate, limit } = req.body;

        const logs = await auditService.searchLogs({
            userId: userId ? parseInt(userId) : undefined,
            action: action as AuditAction | undefined,
            entity,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? Math.min(parseInt(limit), 1000) : 100,
        });

        res.json({
            success: true,
            data: logs,
            count: logs.length,
            filters: {
                userId,
                action,
                entity,
                startDate,
                endDate,
            },
        });
    })
);

/**
 * GET /api/audit/actions
 * Get list of all available audit actions (for filter dropdowns)
 */
router.get('/actions', (req, res) => {
    const actions = Object.values(AuditAction);
    res.json({
        success: true,
        data: actions,
    });
});

export { router as auditRoutes };
