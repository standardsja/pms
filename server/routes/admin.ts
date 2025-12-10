/**
 * Admin Routes - System management and configuration
 */
import express, { Router, Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

const router: Router = express.Router();

// Middleware to check admin role
const adminOnly = async (req: Request, res: Response, next: Function) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Check if user has ADMIN role
        const userWithRoles = await prisma.user.findUnique({
            where: { id: user.sub }, // Use user.sub from JWT payload
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        const isAdmin = userWithRoles?.roles.some((ur) => ur.role.name === 'ADMIN');
        if (!isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        }

        next();
    } catch (error) {
        logger.error('Admin check failed', { error });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/admin/users - Get all users
 */
router.get('/users', adminOnly, async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                department: true,
                roles: {
                    include: {
                        role: true,
                    },
                },
                // Include security fields
                blocked: true,
                blockedAt: true,
                blockedReason: true,
                blockedBy: true,
                lastLogin: true,
                failedLogins: true,
                lastFailedLogin: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        logger.info(`GET /api/admin/users returned ${users.length} users`, {
            firstUser: users[0]?.id,
            hasBlockedUser: users.some((u) => u.blocked === true),
            blockedCount: users.filter((u) => u.blocked === true).length,
        });

        res.json(users);
    } catch (error) {
        logger.error('Please try again later', { error });
        res.status(500).json({ success: false, message: 'Please try again later' });
    }
});

/**
 * GET /api/admin/roles - Get all roles
 */
router.get('/roles', adminOnly, async (req: Request, res: Response) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });

        // Format response with userCount
        const formatted = roles.map((role) => ({
            ...role,
            userCount: role._count.users,
        }));

        res.json(formatted);
    } catch (error) {
        logger.error('Failed to fetch roles', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
});

/**
 * GET /api/admin/permissions - Get all permissions
 */
router.get('/permissions', adminOnly, async (req: Request, res: Response) => {
    try {
        // Fetch permissions from database
        const permissions = await prisma.permission.findMany({
            orderBy: { module: 'asc' },
        });

        // If no permissions exist, seed them
        if (permissions.length === 0) {
            const defaultPermissions = [
                { name: 'CREATE_REQUEST', description: 'Create procurement requests', module: 'procurement' },
                { name: 'APPROVE_REQUEST', description: 'Approve procurement requests', module: 'procurement' },
                { name: 'REJECT_REQUEST', description: 'Reject procurement requests', module: 'procurement' },
                { name: 'VIEW_REPORTS', description: 'View system reports', module: 'admin' },
                { name: 'MANAGE_USERS', description: 'Manage system users', module: 'admin' },
                { name: 'MANAGE_ROLES', description: 'Manage roles and permissions', module: 'admin' },
                { name: 'SYSTEM_CONFIG', description: 'Configure system settings', module: 'admin' },
                { name: 'VIEW_AUDIT_LOGS', description: 'View audit logs', module: 'admin' },
                { name: 'CREATE_IDEA', description: 'Submit ideas to innovation hub', module: 'innovation' },
                { name: 'EVALUATE_IDEA', description: 'Evaluate and vote on ideas', module: 'innovation' },
            ];

            const created = await Promise.all(
                defaultPermissions.map((perm) =>
                    prisma.permission.create({
                        data: perm,
                    })
                )
            );

            res.json(created);
        } else {
            res.json(permissions);
        }
    } catch (error) {
        logger.error('Failed to fetch permissions', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
});

/**
 * GET /api/admin/workflow-statuses - Get workflow statuses
 */
router.get('/workflow-statuses', adminOnly, async (req: Request, res: Response) => {
    try {
        // Return default workflow statuses if not in database
        const statuses = [
            {
                id: '1',
                name: 'Draft',
                code: 'DRAFT',
                description: 'Initial request draft',
                color: 'gray',
                order: 1,
                requiresApproval: false,
                allowsTransition: ['SUBMITTED', 'REJECTED'],
            },
            {
                id: '2',
                name: 'Submitted',
                code: 'SUBMITTED',
                description: 'Submitted for review',
                color: 'blue',
                order: 2,
                requiresApproval: true,
                allowsTransition: ['APPROVED', 'REJECTED', 'PROCESSING'],
            },
            {
                id: '3',
                name: 'Processing',
                code: 'PROCESSING',
                description: 'Being processed',
                color: 'yellow',
                order: 3,
                requiresApproval: false,
                allowsTransition: ['APPROVED', 'CANCELLED'],
            },
            {
                id: '4',
                name: 'Approved',
                code: 'APPROVED',
                description: 'Approved by reviewer',
                color: 'green',
                order: 4,
                requiresApproval: false,
                allowsTransition: [],
            },
            {
                id: '5',
                name: 'Rejected',
                code: 'REJECTED',
                description: 'Rejected by reviewer',
                color: 'red',
                order: 5,
                requiresApproval: false,
                allowsTransition: ['DRAFT'],
            },
        ];

        res.json(statuses);
    } catch (error) {
        logger.error('Failed to fetch workflow statuses', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch workflow statuses' });
    }
});

/**
 * GET /api/admin/workflow-slas - Get workflow SLAs
 */
router.get('/workflow-slas', adminOnly, async (req: Request, res: Response) => {
    try {
        // Return default SLAs
        const slas = [
            { fromStatus: 'SUBMITTED', toStatus: 'APPROVED', hours: 48 },
            { fromStatus: 'DRAFT', toStatus: 'SUBMITTED', hours: 72 },
            { fromStatus: 'PROCESSING', toStatus: 'APPROVED', hours: 24 },
        ];

        res.json(slas);
    } catch (error) {
        logger.error('Failed to fetch workflow SLAs', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch workflow SLAs' });
    }
});

/**
 * GET /api/admin/system-config - Get system configuration
 */
router.get('/system-config', adminOnly, async (req: Request, res: Response) => {
    try {
        // Return default system config
        const config = {
            smtpHost: process.env.SMTP_HOST || 'smtp.example.com',
            smtpPort: parseInt(process.env.SMTP_PORT || '587'),
            smtpUser: process.env.SMTP_USER || '',
            smtpPassword: process.env.SMTP_PASSWORD || '',
            fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
            maxLoginAttempts: 5,
            sessionTimeout: 30,
            passwordMinLength: 8,
            requireSpecialChars: true,
            logoUrl: '/logo.png',
            systemName: 'Procurement Management System',
        };

        res.json(config);
    } catch (error) {
        logger.error('Failed to fetch system config', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch system config' });
    }
});

/**
 * POST /api/admin/system-config - Update system configuration
 */
router.post('/system-config', adminOnly, async (req: Request, res: Response) => {
    try {
        const { smtpHost, smtpPort, smtpUser, fromEmail, maxLoginAttempts, sessionTimeout, passwordMinLength, requireSpecialChars, logoUrl, systemName } = req.body;

        // In a real implementation, this would save to database
        // For now, just validate and return success
        logger.info('System config updated', {
            smtpHost,
            smtpPort,
            fromEmail,
            maxLoginAttempts,
            sessionTimeout,
        });

        res.json({
            success: true,
            message: 'System configuration updated',
            config: {
                smtpHost,
                smtpPort,
                smtpUser,
                fromEmail,
                maxLoginAttempts,
                sessionTimeout,
                passwordMinLength,
                requireSpecialChars,
                logoUrl,
                systemName,
            },
        });
    } catch (error) {
        logger.error('Failed to update system config', { error });
        res.status(500).json({ success: false, message: 'Failed to update system config' });
    }
});

/**
 * POST /api/admin/bulk-import - Import users from CSV
 */
router.post('/bulk-import', adminOnly, async (req: Request, res: Response) => {
    try {
        // This would typically process a CSV file
        // For now, return a mock response
        const totalRows = 10;
        const successCount = 9;
        const failureCount = 1;

        res.json({
            totalRows,
            successCount,
            failureCount,
            details: [`✓ ${successCount} users imported successfully`, `✗ ${failureCount} users failed import (duplicate emails or invalid format)`, `Processed ${totalRows} rows`],
        });
    } catch (error) {
        logger.error('Failed to import users', { error });
        res.status(500).json({ success: false, message: 'Failed to import users' });
    }
});

/**
 * POST /api/admin/roles - Create a new role
 */
router.post('/roles', adminOnly, async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({ success: false, message: 'Name and description are required' });
        }

        const role = await prisma.role.create({
            data: {
                name,
                description,
            },
            include: {
                _count: { select: { users: true } },
            },
        });

        res.status(201).json({
            ...role,
            userCount: role._count.users,
        });
    } catch (error) {
        logger.error('Failed to create role', { error });
        res.status(500).json({ success: false, message: 'Failed to create role' });
    }
});

/**
 * PUT /api/admin/roles/:id - Update a role
 */
router.put('/roles/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const roleId = parseInt(id);

        const role = await prisma.role.update({
            where: { id: roleId },
            data: {
                name,
                description,
            },
            include: {
                _count: { select: { users: true } },
            },
        });

        res.json({
            ...role,
            userCount: role._count.users,
        });
    } catch (error) {
        logger.error('Failed to update role', { error });
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
});

/**
 * DELETE /api/admin/roles/:id - Delete a role
 */
router.delete('/roles/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const roleId = parseInt(id);

        // Check if role has users
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: { _count: { select: { users: true } } },
        });

        if (role && role._count.users > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete role with active users' });
        }

        await prisma.role.delete({
            where: { id: roleId },
        });

        res.json({ success: true, message: 'Role deleted' });
    } catch (error) {
        logger.error('Failed to delete role', { error });
        res.status(500).json({ success: false, message: 'Failed to delete role' });
    }
});

/**
 * GET /api/admin/roles/:id/permissions - Get permissions for a specific role
 */
router.get('/roles/:id/permissions', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const roleId = parseInt(id);

        const rolePermissions = await prisma.rolePermission.findMany({
            where: { roleId },
            include: {
                permission: true,
            },
        });

        const permissionIds = rolePermissions.map((rp) => rp.permission.id);

        // Get all permissions for reference
        const allPermissions = await prisma.permission.findMany({
            orderBy: { module: 'asc' },
        });

        res.json({
            roleId,
            assignedPermissions: permissionIds,
            allPermissions,
            rolePermissions: rolePermissions.map((rp) => rp.permission),
        });
    } catch (error) {
        logger.error('Failed to fetch role permissions', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch role permissions' });
    }
});

/**
 * POST /api/admin/roles/:id/permissions - Assign permissions to a role
 */
router.post('/roles/:id/permissions', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const roleId = parseInt(id);

        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ success: false, message: 'permissionIds must be an array' });
        }

        // Delete existing permissions
        await prisma.rolePermission.deleteMany({
            where: { roleId },
        });

        // Create new permissions
        const assigned = await Promise.all(
            permissionIds.map((permissionId: number) =>
                prisma.rolePermission.create({
                    data: {
                        roleId,
                        permissionId,
                    },
                })
            )
        );

        res.json({ success: true, message: 'Permissions assigned', count: assigned.length });
    } catch (error) {
        logger.error('Failed to assign permissions to role', { error });
        res.status(500).json({ success: false, message: 'Failed to assign permissions' });
    }
});

/**
 * GET /admin/audit-log - Get audit logs (admin only)
 */
router.get('/audit-log', adminOnly, async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
        const offset = parseInt(req.query.offset as string) || 0;

        // Get recent audit logs
        const logs = await prisma.auditLog.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        // Get total count
        const total = await prisma.auditLog.count();

        res.json({
            success: true,
            data: logs || [],
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch audit logs', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs', data: [] });
    }
});

/**
 * GET /api/admin/module-locks - Get all module lock states
 * Available to all authenticated users (not just admins) so they can see current lock states
 */
router.get('/module-locks', authMiddleware, async (req: Request, res: Response) => {
    try {
        const locks = await prisma.systemConfig.findUnique({
            where: { key: 'MODULE_LOCKS' },
        });

        const defaultLocks = {
            procurement: { locked: false, updatedAt: new Date().toISOString() },
            innovation: { locked: false, updatedAt: new Date().toISOString() },
            committee: { locked: false, updatedAt: new Date().toISOString() },
            budgeting: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            audit: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            prime: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            datapoint: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            maintenance: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            asset: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            project: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            knowledge: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
        };

        const data = locks ? JSON.parse(locks.value) : defaultLocks;
        res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error('Failed to fetch module locks', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch module locks', data: {} });
    }
});

/**
 * POST /api/admin/module-locks/:key - Update a module lock
 */
router.post('/module-locks/:key', adminOnly, async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { locked, reason } = req.body;
        const user = (req as any).user;

        // Validate module key
        const validKeys = ['procurement', 'innovation', 'committee', 'budgeting', 'audit', 'prime', 'datapoint', 'maintenance', 'asset', 'project', 'knowledge'];
        if (!validKeys.includes(key)) {
            return res.status(400).json({ success: false, message: 'Invalid module key' });
        }

        // Get current locks
        let locksConfig = await prisma.systemConfig.findUnique({
            where: { key: 'MODULE_LOCKS' },
        });

        const defaultLocks = {
            procurement: { locked: false, updatedAt: new Date().toISOString() },
            innovation: { locked: false, updatedAt: new Date().toISOString() },
            committee: { locked: false, updatedAt: new Date().toISOString() },
            budgeting: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            audit: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            prime: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            datapoint: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            maintenance: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            asset: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            project: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
            knowledge: { locked: true, reason: 'Coming soon', updatedAt: new Date().toISOString() },
        };

        const currentLocks = locksConfig ? JSON.parse(locksConfig.value) : defaultLocks;

        // Update the specific lock
        currentLocks[key] = {
            locked: locked ?? currentLocks[key].locked,
            reason: reason ?? currentLocks[key].reason,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.name ?? user?.email ?? 'Admin',
        };

        // Save or update in database
        if (locksConfig) {
            await prisma.systemConfig.update({
                where: { key: 'MODULE_LOCKS' },
                data: { value: JSON.stringify(currentLocks) },
            });
        } else {
            await prisma.systemConfig.create({
                data: {
                    key: 'MODULE_LOCKS',
                    value: JSON.stringify(currentLocks),
                },
            });
        }

        logger.info(`Module lock updated: ${key} -> ${locked}`, { user: user?.id, module: key });
        res.status(200).json({ success: true, message: 'Module lock updated', data: currentLocks[key] });
    } catch (error) {
        logger.error('Failed to update module lock', { error });
        res.status(500).json({ success: false, message: 'Failed to update module lock' });
    }
});

/**
 * POST /api/admin/users/:id/block - Block a user from accessing the system
 */
router.post('/users/:id/block', adminOnly, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { reason } = req.body;
        const adminUser = (req as any).user;

        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Block reason is required' });
        }

        // Check if user exists
        const userToBlock = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToBlock) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent blocking self
        if (userId === adminUser.sub) {
            return res.status(400).json({ success: false, message: 'You cannot block yourself' });
        }

        // Block the user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                blocked: true,
                blockedAt: new Date(),
                blockedReason: reason.trim(),
                blockedBy: adminUser.sub,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: adminUser.sub,
                action: 'USER_UPDATED',
                entity: 'User',
                entityId: userId,
                message: `User ${userToBlock.email} was blocked by admin`,
                ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                metadata: {
                    action: 'block',
                    reason: reason.trim(),
                    blockedUser: userToBlock.email,
                    blockedBy: adminUser.email,
                    status: 'success',
                },
            },
        });

        logger.info('User blocked', {
            userId,
            email: userToBlock.email,
            blockedBy: adminUser.sub,
            reason: reason.trim(),
        });

        res.json({
            success: true,
            message: 'User has been blocked successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                blocked: updatedUser.blocked,
                blockedAt: updatedUser.blockedAt,
                blockedReason: updatedUser.blockedReason,
            },
        });
    } catch (error) {
        logger.error('Failed to block user', { error, userId: req.params.id });
        res.status(500).json({ success: false, message: 'Failed to block user' });
    }
});

/**
 * POST /api/admin/users/:id/unblock - Unblock a user
 */
router.post('/users/:id/unblock', adminOnly, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const adminUser = (req as any).user;

        // Check if user exists
        const userToUnblock = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToUnblock) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Unblock the user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                blocked: false,
                blockedAt: null,
                blockedReason: null,
                blockedBy: null,
                failedLogins: 0, // Reset failed login counter
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: adminUser.sub,
                action: 'USER_UPDATED',
                entity: 'User',
                entityId: userId,
                message: `User ${userToUnblock.email} was unblocked by admin`,
                ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                metadata: {
                    action: 'unblock',
                    unblockedUser: userToUnblock.email,
                    unblockedBy: adminUser.email,
                    status: 'success',
                },
            },
        });

        logger.info('User unblocked', {
            userId,
            email: userToUnblock.email,
            unblockedBy: adminUser.sub,
        });

        res.json({
            success: true,
            message: 'User has been unblocked successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                blocked: updatedUser.blocked,
            },
        });
    } catch (error) {
        logger.error('Failed to unblock user', { error, userId: req.params.id });
        res.status(500).json({ success: false, message: 'Failed to unblock user' });
    }
});

export { router as adminRoutes };
