/**
 * Role Request Routes
 * Endpoints for submitting and managing role requests
 */

import { Router, Request, Response } from 'express';
import { roleRequestService } from '../services/roleRequestService.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * POST /api/role-requests
 * User submits a role request
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { departmentId, role, module, reason } = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        if (!role || !module) {
            return res.status(400).json({
                success: false,
                message: 'Role and module are required',
            });
        }

        const roleRequest = await roleRequestService.createRoleRequest({
            userId,
            departmentId,
            role,
            module,
            reason,
        });

        logger.info(`Role request created: ${roleRequest.id} by user ${userId}`, {
            roleRequestId: roleRequest.id,
            userId,
            role,
            module,
        });

        res.status(201).json({
            success: true,
            message: 'Role request submitted successfully',
            data: roleRequest,
        });
    } catch (error: any) {
        logger.error('Error creating role request', {
            error: error.message,
            userId: (req as any).user?.id,
        });

        res.status(400).json({
            success: false,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * GET /api/role-requests
 * Get all role requests (filtered by status, module, department)
 * Admin only
 */
router.get('/', authMiddleware, requirePermission('admin:manage_roles'), async (req: Request, res: Response) => {
    try {
        const { status, module, departmentId } = req.query;

        const roleRequests = await roleRequestService.getPendingRoleRequests({
            status: (status as any) || 'PENDING',
            module: module as string,
            departmentId: departmentId ? parseInt(departmentId as string) : undefined,
        });

        res.json({
            success: true,
            data: roleRequests,
            count: roleRequests.length,
        });
    } catch (error: any) {
        logger.error('Error fetching role requests', {
            error: error.message,
            userId: (req as any).user?.id,
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch role requests',
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * GET /api/role-requests/my-requests
 * Get role requests for the current user
 */
router.get('/my-requests', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        const roleRequests = await roleRequestService.getUserRoleRequests(userId);

        res.json({
            success: true,
            data: roleRequests,
            count: roleRequests.length,
        });
    } catch (error: any) {
        logger.error('Error fetching user role requests', {
            error: error.message,
            userId: (req as any).user?.id,
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch your role requests',
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * GET /api/role-requests/stats/dashboard
 * Get admin dashboard statistics
 * Admin only
 */
router.get('/stats/dashboard', authMiddleware, requirePermission('admin:manage_roles'), async (req: Request, res: Response) => {
    try {
        const stats = await roleRequestService.getAdminDashboardStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        logger.error('Error fetching dashboard stats', {
            error: error.message,
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * GET /api/role-requests/:id
 * Get a specific role request
 * Only the requester or admin can view
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;
        const userPermissions = (req as any).permissions || {};

        const roleRequest = await roleRequestService.getPendingRoleRequests();
        const request = roleRequest.find((r: any) => r.id === parseInt(id));

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Role request not found',
            });
        }

        // Only requester or admin can view
        if (request.userId !== userId && !userPermissions['admin:manage_roles']) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this request',
            });
        }

        res.json({
            success: true,
            data: request,
        });
    } catch (error: any) {
        logger.error('Error fetching role request', {
            error: error.message,
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch role request',
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * PUT /api/role-requests/:id/approve
 * Approve a role request
 * Admin only
 */
router.put('/:id/approve', authMiddleware, requirePermission('admin:manage_roles'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes, expiresAt } = req.body;
        const approvedById = (req as any).user?.id;

        if (!approvedById) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        const approvedRequest = await roleRequestService.approveRoleRequest(
            {
                roleRequestId: parseInt(id),
                approvedById,
                notes,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            },
            true // Grant role immediately
        );

        logger.info(`Role request approved: ${id}`, {
            approvedById,
            roleRequestId: id,
            role: approvedRequest.role,
            userId: approvedRequest.userId,
        });

        res.json({
            success: true,
            message: 'Role request approved successfully',
            data: approvedRequest,
        });
    } catch (error: any) {
        logger.error('Error approving role request', {
            error: error.message,
            approvedById: (req as any).user?.id,
        });

        res.status(400).json({
            success: false,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * PUT /api/role-requests/:id/reject
 * Reject a role request
 * Admin only
 */
router.put('/:id/reject', authMiddleware, requirePermission('admin:manage_roles'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const approvedById = (req as any).user?.id;

        if (!approvedById) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        if (!notes) {
            return res.status(400).json({
                success: false,
                message: 'Rejection notes are required',
            });
        }

        const rejectedRequest = await roleRequestService.rejectRoleRequest({
            roleRequestId: parseInt(id),
            approvedById,
            notes,
        });

        logger.info(`Role request rejected: ${id}`, {
            approvedById,
            roleRequestId: id,
            reason: notes,
        });

        res.json({
            success: true,
            message: 'Role request rejected successfully',
            data: rejectedRequest,
        });
    } catch (error: any) {
        logger.error('Error rejecting role request', {
            error: error.message,
        });

        res.status(400).json({
            success: false,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * PUT /api/role-requests/:id/cancel
 * Cancel a role request (user cancels their own)
 */
router.put('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        const cancelledRequest = await roleRequestService.cancelRoleRequest(parseInt(id), userId);

        logger.info(`Role request cancelled: ${id}`, {
            userId,
            roleRequestId: id,
        });

        res.json({
            success: true,
            message: 'Role request cancelled successfully',
            data: cancelledRequest,
        });
    } catch (error: any) {
        logger.error('Error cancelling role request', {
            error: error.message,
            userId: (req as any).user?.id,
        });

        res.status(400).json({
            success: false,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

/**
 * GET /api/role-requests/check-access/:role/:module
 * Check if user has approved access to a role/module
 */
router.get('/check-access/:role/:module', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { role, module } = req.params;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }

        const hasAccess = await roleRequestService.hasApprovedAccess(userId, role, module);

        res.json({
            success: true,
            hasAccess,
            role,
            module,
        });
    } catch (error: any) {
        logger.error('Error checking role access', {
            error: error.message,
        });

        res.status(500).json({
            success: false,
            message: 'Failed to check role access',
            details: process.env.NODE_ENV === 'development' ? error : undefined,
        });
    }
});

export default router;
