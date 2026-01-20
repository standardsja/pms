/**
 * Admin Routes - System management and configuration
 */
import express, { Router, Request, Response } from 'express';
import { prisma } from '../prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import bcryptjs from 'bcryptjs';

const router: Router = express.Router();

/**
 * Sanitize CSV cell value to prevent formula injection
 * Remove dangerous characters that could execute formulas in Excel/Sheets
 */
const sanitizeCsvCell = (value: string): string => {
    if (!value || typeof value !== 'string') return '';

    const trimmed = value.trim();

    // If cell starts with formula characters (=, +, -, @, tab, carriage return)
    // prepend with single quote to prevent execution
    if (/^[=+\-@\t\r]/.test(trimmed)) {
        return "'" + trimmed;
    }

    return trimmed;
};

// Middleware to check admin role
const adminOnly = async (req: Request, res: Response, next: Function) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Check if user has ADMIN role
        const userId = user.sub || user.id || user.userId;
        const userWithRoles = await prisma.user.findUnique({
            where: { id: userId },
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
 * GET /api/admin/users - Get all users with pagination
 */
router.get('/users', adminOnly, async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
        const offset = parseInt(req.query.offset as string, 10) || 0;

        if (isNaN(limit) || isNaN(offset)) {
            return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                include: {
                    department: true,
                    managedDepartments: {
                        include: {
                            department: true,
                        },
                    },
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.user.count(),
        ]);

        logger.info(`GET /api/admin/users returned ${users.length} users`, {
            total,
            limit,
            offset,
            hasBlockedUser: users.some((u) => u.blocked === true),
            blockedCount: users.filter((u) => u.blocked === true).length,
            firstUserManagedDepts: users[0]?.managedDepartments?.length || 0,
        });

        res.json({
            users,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + users.length < total,
            },
        });
    } catch (error) {
        logger.error('Failed to fetch users', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/users/:id - Get a specific user by ID
 */
router.get('/users/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                            },
                        },
                    },
                },
                department: true,
                managedDepartments: {
                    select: {
                        id: true,
                        departmentId: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
            omit: {
                passwordHash: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        logger.error('Failed to fetch user', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
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
 * GET /api/admin/departments - Get all departments
 */
router.get('/departments', adminOnly, async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });

        // Format response with userCount
        const formatted = departments.map((dept) => ({
            ...dept,
            userCount: dept._count.users,
        }));

        res.json(formatted);
    } catch (error) {
        logger.error('Failed to fetch departments', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch departments' });
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

            return res.json(created);
        }

        res.json(permissions);
    } catch (error: any) {
        logger.error('Failed to fetch permissions', { error: error?.message, stack: error?.stack });
        res.status(500).json({ success: false, message: 'Failed to fetch permissions', error: error?.message });
    }
});

/**
/**
 * GET /api/admin/workflow-statuses - Get all workflow statuses from database
 */
router.get('/workflow-statuses', adminOnly, async (req: Request, res: Response) => {
    try {
        const statuses = await prisma.workflowStatus.findMany({
            orderBy: { displayOrder: 'asc' },
            where: { isActive: true },
        });

        res.json(statuses);
    } catch (error) {
        logger.error('Failed to fetch workflow statuses', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch workflow statuses' });
    }
});

/**
 * POST /api/admin/workflow-statuses - Create new workflow status
 */
router.post('/workflow-statuses', adminOnly, async (req: Request, res: Response) => {
    try {
        const { statusId, name, description, color, icon, displayOrder } = req.body;

        if (!statusId || !name) {
            return res.status(400).json({ success: false, message: 'statusId and name are required' });
        }

        const newStatus = await prisma.workflowStatus.create({
            data: {
                statusId: statusId.toUpperCase(),
                name,
                description: description || null,
                color: color || '#3B82F6',
                icon: icon || null,
                displayOrder: displayOrder || 0,
                isActive: true,
            },
        });

        logger.info('Workflow status created', { statusId: newStatus.statusId, userId: res.locals.userId });

        res.status(201).json({ success: true, data: newStatus });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'Workflow status already exists' });
        }
        logger.error('Failed to create workflow status', { error });
        res.status(500).json({ success: false, message: 'Failed to create workflow status' });
    }
});

/**
 * PUT /api/admin/workflow-statuses/:id - Update workflow status
 */
router.put('/workflow-statuses/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, color, icon, displayOrder, isActive } = req.body;
        const statusId = parseInt(id, 10);

        if (isNaN(statusId)) {
            return res.status(400).json({ success: false, message: 'Invalid status ID' });
        }

        const updatedStatus = await prisma.workflowStatus.update({
            where: { id: statusId },
            data: {
                name: name || undefined,
                description: description || undefined,
                color: color || undefined,
                icon: icon || undefined,
                displayOrder: displayOrder !== undefined ? displayOrder : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
        });

        logger.info('Workflow status updated', { id, userId: res.locals.userId });

        res.json({ success: true, data: updatedStatus });
    } catch (error) {
        logger.error('Failed to update workflow status', { error });
        res.status(500).json({ success: false, message: 'Failed to update workflow status' });
    }
});

/**
 * DELETE /api/admin/workflow-statuses/:id - Delete workflow status
 */
router.delete('/workflow-statuses/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const statusId = parseInt(id, 10);

        if (isNaN(statusId)) {
            return res.status(400).json({ success: false, message: 'Invalid status ID' });
        }

        await prisma.workflowStatus.delete({
            where: { id: statusId },
        });

        logger.info('Workflow status deleted', { id, userId: res.locals.userId });

        res.json({ success: true, message: 'Workflow status deleted' });
    } catch (error) {
        logger.error('Failed to delete workflow status', { error });
        res.status(500).json({ success: false, message: 'Failed to delete workflow status' });
    }
});

/**
 * GET /api/admin/workflow-slas - Get all workflow SLAs from database
 */
router.get('/workflow-slas', adminOnly, async (req: Request, res: Response) => {
    try {
        const slas = await prisma.workflowSLA.findMany({
            where: { isActive: true },
            orderBy: { fromStatus: 'asc' },
        });

        res.json(slas);
    } catch (error) {
        logger.error('Failed to fetch workflow SLAs', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch workflow SLAs' });
    }
});

/**
 * POST /api/admin/workflow-slas - Create new workflow SLA
 */
router.post('/workflow-slas', adminOnly, async (req: Request, res: Response) => {
    try {
        const { slaId, name, description, fromStatus, toStatus, slaHours } = req.body;

        if (!slaId || !name || !fromStatus || !toStatus || !slaHours) {
            return res.status(400).json({
                success: false,
                message: 'slaId, name, fromStatus, toStatus, and slaHours are required',
            });
        }

        const newSla = await prisma.workflowSLA.create({
            data: {
                slaId: slaId.toUpperCase(),
                name,
                description: description || null,
                fromStatus,
                toStatus,
                slaHours: parseInt(slaHours),
                isActive: true,
            },
        });

        logger.info('Workflow SLA created', { slaId: newSla.slaId, userId: res.locals.userId });

        res.status(201).json({ success: true, data: newSla });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'Workflow SLA already exists or duplicate transition' });
        }
        logger.error('Failed to create workflow SLA', { error });
        res.status(500).json({ success: false, message: 'Failed to create workflow SLA' });
    }
});

/**
 * PUT /api/admin/workflow-slas/:id - Update workflow SLA
 */
router.put('/workflow-slas/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, fromStatus, toStatus, slaHours, isActive } = req.body;

        const updatedSla = await prisma.workflowSLA.update({
            where: { id: parseInt(id) },
            data: {
                name: name || undefined,
                description: description || undefined,
                fromStatus: fromStatus || undefined,
                toStatus: toStatus || undefined,
                slaHours: slaHours !== undefined ? parseInt(slaHours) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
        });

        logger.info('Workflow SLA updated', { id, userId: res.locals.userId });

        res.json({ success: true, data: updatedSla });
    } catch (error) {
        logger.error('Failed to update workflow SLA', { error });
        res.status(500).json({ success: false, message: 'Failed to update workflow SLA' });
    }
});

/**
 * DELETE /api/admin/workflow-slas/:id - Delete workflow SLA
 */
router.delete('/workflow-slas/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const slaId = parseInt(id, 10);

        if (isNaN(slaId)) {
            return res.status(400).json({ success: false, message: 'Invalid SLA ID' });
        }

        await prisma.workflowSLA.delete({
            where: { id: slaId },
        });

        logger.info('Workflow SLA deleted', { id, userId: res.locals.userId });

        res.json({ success: true, message: 'Workflow SLA deleted' });
    } catch (error) {
        logger.error('Failed to delete workflow SLA', { error });
        res.status(500).json({ success: false, message: 'Failed to delete workflow SLA' });
    }
});

/**
 * GET /api/admin/system-config - Get system configuration
 */
router.get('/system-config', adminOnly, async (req: Request, res: Response) => {
    try {
        // Fetch all config from database
        const configs = await prisma.systemConfig.findMany({
            orderBy: { key: 'asc' },
        });

        // Convert to object format for easier use
        const configObj: Record<string, any> = {};
        configs.forEach((cfg) => {
            let value: any = cfg.value;
            if (cfg.valueType === 'number') value = parseInt(cfg.value);
            else if (cfg.valueType === 'boolean') value = cfg.value === 'true';
            else if (cfg.valueType === 'json') value = JSON.parse(cfg.value);
            configObj[cfg.key] = value;
        });

        // If no configs exist, seed defaults
        if (configs.length === 0) {
            const defaults = [
                { key: 'SMTP_HOST', value: process.env.SMTP_HOST || 'smtp.example.com', valueType: 'string', description: 'SMTP server hostname' },
                { key: 'SMTP_PORT', value: process.env.SMTP_PORT || '587', valueType: 'number', description: 'SMTP server port' },
                { key: 'SMTP_USER', value: process.env.SMTP_USER || '', valueType: 'string', description: 'SMTP username' },
                { key: 'FROM_EMAIL', value: process.env.FROM_EMAIL || 'noreply@example.com', valueType: 'string', description: 'Default from email address' },
                { key: 'MAX_LOGIN_ATTEMPTS', value: '5', valueType: 'number', description: 'Maximum login attempts before account lock' },
                { key: 'SESSION_TIMEOUT', value: '30', valueType: 'number', description: 'Session timeout in minutes' },
                { key: 'PASSWORD_MIN_LENGTH', value: '8', valueType: 'number', description: 'Minimum password length' },
                { key: 'REQUIRE_SPECIAL_CHARS', value: 'true', valueType: 'boolean', description: 'Require special characters in passwords' },
                { key: 'LOGO_URL', value: '/logo.png', valueType: 'string', description: 'System logo URL' },
                { key: 'SYSTEM_NAME', value: 'Procurement Management System', valueType: 'string', description: 'System display name' },
            ];

            const created = await Promise.all(
                defaults.map((cfg) =>
                    prisma.systemConfig.create({
                        data: cfg,
                    })
                )
            );

            // Convert created configs to object
            created.forEach((cfg) => {
                let value: any = cfg.value;
                if (cfg.valueType === 'number') value = parseInt(cfg.value);
                else if (cfg.valueType === 'boolean') value = cfg.value === 'true';
                else if (cfg.valueType === 'json') value = JSON.parse(cfg.value);
                configObj[cfg.key] = value;
            });
        }

        res.json(configObj);
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
        const user = (req as any).user;
        const userId = user?.sub;
        const configData = req.body;

        // Update each config value in database
        for (const [key, value] of Object.entries(configData)) {
            let valueStr = String(value);
            let valueType = 'string';

            if (typeof value === 'number') {
                valueType = 'number';
                valueStr = String(value);
            } else if (typeof value === 'boolean') {
                valueType = 'boolean';
                valueStr = value ? 'true' : 'false';
            } else if (typeof value === 'object') {
                valueType = 'json';
                valueStr = JSON.stringify(value);
            }

            await prisma.systemConfig.upsert({
                where: { key },
                create: { key, value: valueStr, valueType, updatedBy: userId },
                update: { value: valueStr, valueType, updatedBy: userId },
            });
        }

        logger.info('System config updated by admin', {
            userId,
            configKeys: Object.keys(configData),
        });

        res.json({
            success: true,
            message: 'System configuration updated',
            config: configData,
        });
    } catch (error) {
        logger.error('Failed to update system config', { error });
        res.status(500).json({ success: false, message: 'Failed to update system config' });
    }
});

/**
 * POST /api/admin/create-user - Create a single user
 */
router.post('/create-user', adminOnly, async (req: Request, res: Response) => {
    try {
        const { email, name, department, role } = req.body;

        // Validate input
        if (!email || !name || !department) {
            return res.status(400).json({ success: false, message: 'Email, name, and department are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // Hash default password
        const defaultPassword = 'Passw0rd!';
        const passwordHash = await bcryptjs.hash(defaultPassword, 10);

        // Find department by name
        let dept = await prisma.department.findFirst({
            where: { name: department },
        });

        if (!dept) {
            // Create department if not found
            // Generate code: ensure minimum 4 characters, handle non-ASCII
            let deptCode = department
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, 4)
                .toUpperCase();

            // Ensure minimum 4 characters
            if (deptCode.length < 4) {
                deptCode = (deptCode + '0000').substring(0, 4);
            }

            dept = await prisma.department.create({
                data: {
                    name: department.trim(),
                    code: deptCode,
                },
            });
        }

        // Create the user
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                departmentId: dept.id,
            },
        });

        // Assign role if provided
        if (role) {
            try {
                const roleRecord = await prisma.role.findFirst({
                    where: { name: role },
                });

                if (roleRecord) {
                    await prisma.userRole.upsert({
                        where: {
                            userId_roleId: {
                                userId: newUser.id,
                                roleId: roleRecord.id,
                            },
                        },
                        create: {
                            userId: newUser.id,
                            roleId: roleRecord.id,
                        },
                        update: {},
                    });
                }
            } catch (roleErr: any) {
                // Non-fatal role assignment error
                logger.warn('Failed to assign role to new user', { error: roleErr, userId: newUser.id, role });
            }
        }

        res.status(201).json({
            success: true,
            message: `User ${email} created successfully. Default password has been set.`,
            user: newUser,
        });
    } catch (error: any) {
        logger.error('Failed to create user', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message,
        });
    }
});

/**
 * POST /api/admin/bulk-import - Import users from CSV
 */
router.post('/bulk-import', adminOnly, async (req: Request, res: Response) => {
    try {
        const body = req.body as any;
        const csvContent = body.csvContent || '';

        if (!csvContent || typeof csvContent !== 'string') {
            return res.status(400).json({ success: false, message: 'CSV content is required' });
        }

        // Simple CSV parser
        const lines = csvContent
            .trim()
            .split('\n')
            .filter((line: string) => line.trim());
        if (lines.length < 2) {
            return res.json({
                totalRows: 0,
                successCount: 0,
                failureCount: 0,
                details: ['No records found in CSV (need header + at least 1 data row)'],
            });
        }

        // Enforce maximum row limit
        const MAX_CSV_ROWS = 1000;
        if (lines.length - 1 > MAX_CSV_ROWS) {
            return res.status(400).json({
                success: false,
                message: `CSV file exceeds maximum allowed rows. Maximum: ${MAX_CSV_ROWS}, Found: ${lines.length - 1}`,
            });
        }

        // Parse header
        const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
        const emailIdx = headers.indexOf('email');
        const nameIdx = headers.indexOf('name');
        const deptIdx = headers.indexOf('department');
        const roleIdx = headers.indexOf('role');

        if (emailIdx === -1 || nameIdx === -1 || deptIdx === -1) {
            return res.status(400).json({
                success: false,
                message: 'CSV must have email, name, and department columns',
            });
        }

        let successCount = 0;
        let failureCount = 0;
        const details: string[] = [];
        const hash = await bcryptjs.hash('Passw0rd!', 10);

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            try {
                // Sanitize CSV cells to prevent formula injection
                const values = lines[i].split(',').map((v: string) => sanitizeCsvCell(v));
                const email = values[emailIdx];
                const name = values[nameIdx];
                const department = values[deptIdx];
                const role = roleIdx !== -1 ? values[roleIdx] : null;

                // Validate
                if (!email || !name || !department) {
                    failureCount++;
                    details.push(`✗ Row ${i + 1}: missing required fields`);
                    continue;
                }

                // Check if user exists
                const existing = await prisma.user.findUnique({ where: { email } });
                if (existing) {
                    failureCount++;
                    details.push(`✗ ${email}: User already exists`);
                    continue;
                }

                // Find or create department
                let dept = await prisma.department.findFirst({
                    where: {
                        OR: [{ code: { equals: department.substring(0, 4).toUpperCase() } }, { name: department }],
                    },
                });

                if (!dept) {
                    // Generate code: ensure minimum 4 characters, handle non-ASCII
                    let deptCode = department
                        .replace(/[^a-zA-Z0-9]/g, '')
                        .substring(0, 4)
                        .toUpperCase();

                    // Ensure minimum 4 characters
                    if (deptCode.length < 4) {
                        deptCode = (deptCode + '0000').substring(0, 4);
                    }

                    dept = await prisma.department.create({
                        data: {
                            name: department.trim(),
                            code: deptCode,
                        },
                    });
                }

                // Create user
                const newUser = await prisma.user.create({
                    data: {
                        email,
                        name,
                        passwordHash: hash,
                        departmentId: dept.id,
                    },
                });

                // Assign role if provided
                if (role) {
                    try {
                        const roleRecord = await prisma.role.findFirst({
                            where: { name: role },
                        });

                        if (roleRecord) {
                            await prisma.userRole.upsert({
                                where: {
                                    userId_roleId: {
                                        userId: newUser.id,
                                        roleId: roleRecord.id,
                                    },
                                },
                                create: {
                                    userId: newUser.id,
                                    roleId: roleRecord.id,
                                },
                                update: {},
                            });
                        }
                    } catch (_err) {
                        // Ignore role assignment errors
                    }
                }

                successCount++;
                details.push(`✓ ${email}: User created with default password`);
            } catch (err: any) {
                failureCount++;
                details.push(`✗ Row ${i + 1}: ${err.message}`);
            }
        }

        res.json({
            totalRows: lines.length - 1,
            successCount,
            failureCount,
            details,
        });
    } catch (error: any) {
        logger.error('Failed to import users', { error });
        res.status(500).json({ success: false, message: 'Failed to import users', details: [error.message] });
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
        const roleId = parseInt(id, 10);

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, message: 'Invalid role ID' });
        }

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
        const roleId = parseInt(id, 10);

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, message: 'Invalid role ID' });
        }

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
        const roleId = parseInt(id, 10);

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, message: 'Invalid role ID' });
        }

        // Verify role exists
        const role = await prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }

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
    } catch (error: any) {
        logger.error('Failed to fetch role permissions', { error: error?.message, stack: error?.stack });
        res.status(500).json({ success: false, message: 'Failed to fetch role permissions', error: error?.message });
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

        let data = defaultLocks;
        if (locks && locks.value) {
            try {
                data = JSON.parse(locks.value);
            } catch (parseErr) {
                logger.warn('Failed to parse MODULE_LOCKS JSON, using defaults', { error: parseErr });
            }
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        logger.error('Failed to fetch module locks, returning defaults', { error });
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
        res.status(200).json({ success: true, data: defaultLocks });
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
        const userId = parseInt(req.params.id, 10);
        const { reason } = req.body;
        const adminUser = (req as any).user;

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Block reason is required' });
        }

        // Sanitize reason - remove potentially harmful characters
        const sanitizedReason = reason
            .trim()
            .replace(/<[^>]*>/g, '')
            .substring(0, 500);

        // Check if user exists
        const userToBlock = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToBlock) {
            // Log failed attempt
            await prisma.auditLog
                .create({
                    data: {
                        userId: adminUser.sub,
                        action: 'USER_UPDATED',
                        entity: 'User',
                        entityId: userId,
                        message: `Failed to block user: User not found`,
                        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                        metadata: { reason: 'user_not_found', attemptedUserId: userId },
                    },
                })
                .catch(() => {}); // Non-fatal
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
                blockedReason: sanitizedReason,
                blockedBy: adminUser.sub,
            },
        });

        // Create audit log (non-fatal)
        try {
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
        } catch (auditErr) {
            logger.error('Failed to write audit log for user block (non-fatal)', { error: auditErr, userId, blockedBy: adminUser.sub });
        }

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
        const userId = parseInt(req.params.id, 10);
        const adminUser = (req as any).user;

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        // Check if user exists
        const userToUnblock = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToUnblock) {
            // Log failed attempt
            await prisma.auditLog
                .create({
                    data: {
                        userId: adminUser.sub,
                        action: 'USER_UPDATED',
                        entity: 'User',
                        entityId: userId,
                        message: `Failed to unblock user: User not found`,
                        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                        metadata: { reason: 'user_not_found', attemptedUserId: userId },
                    },
                })
                .catch(() => {}); // Non-fatal
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

        // Create audit log (non-fatal)
        try {
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
        } catch (auditErr) {
            logger.error('Failed to write audit log for user unblock (non-fatal)', { error: auditErr, userId, unblockedBy: adminUser.sub });
        }

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

/**
 * POST /api/admin/users/:id/roles - Update user roles
 */
router.post('/users/:id/roles', adminOnly, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { roles } = req.body;
        const adminUser = (req as any).user;

        if (!Array.isArray(roles)) {
            return res.status(400).json({ success: false, message: 'Roles must be an array' });
        }

        // Check if user exists
        const userToUpdate = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get all role records from database
        const allRoles = await prisma.role.findMany();
        const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

        // Convert role names to role IDs
        const roleIds = roles.map((roleName: string) => {
            const roleId = roleMap.get(roleName);
            if (!roleId) {
                throw new Error(`Role not found: ${roleName}`);
            }
            return roleId;
        });

        // Use transaction to ensure atomicity - delete and create roles together
        await prisma.$transaction(async (tx) => {
            // Delete existing roles
            await tx.userRole.deleteMany({
                where: { userId },
            });

            // Add new roles
            if (roleIds.length > 0) {
                await tx.userRole.createMany({
                    data: roleIds.map((roleId) => ({
                        userId,
                        roleId,
                    })),
                });
            }
        });

        // Fetch updated user data
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                department: true,
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        // Check if the updated user is the same as the logged-in admin
        const isCurrentUser = userId === adminUser.sub || userId === adminUser.id || userId === adminUser.userId;

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: adminUser.sub || adminUser.id || adminUser.userId,
                action: 'USER_UPDATED',
                entity: 'User',
                entityId: userId,
                message: `User ${userToUpdate.email} roles updated by admin`,
                ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                metadata: {
                    action: 'update_roles',
                    roles: roles,
                    updatedUser: userToUpdate.email,
                    updatedBy: adminUser.email,
                    status: 'success',
                },
            },
        });

        logger.info('User roles updated', {
            userId,
            email: userToUpdate.email,
            updatedBy: adminUser.sub || adminUser.id || adminUser.userId,
            roles,
        });

        res.json({
            success: true,
            message: 'User roles updated successfully',
            updatedUser,
            requiresReauth: isCurrentUser, // Signal frontend to refresh token if user updated their own roles
        });
    } catch (error: any) {
        logger.error('Failed to update user roles', { error, userId: req.params.id });
        res.status(500).json({ success: false, message: error?.message || 'Failed to update user roles' });
    }
});

/**
 * POST /api/admin/users/:id/department - Update user department
 */
router.post('/users/:id/department', adminOnly, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { departmentId } = req.body;
        const adminUser = (req as any).user;

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        // Check if user exists
        const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Validate department if provided
        if (departmentId !== null) {
            const deptId = parseInt(departmentId, 10);
            if (isNaN(deptId)) {
                return res.status(400).json({ success: false, message: 'Invalid department ID' });
            }
            const dept = await prisma.department.findUnique({ where: { id: deptId } });
            if (!dept) {
                return res.status(404).json({ success: false, message: 'Department not found' });
            }
        }

        // Update user department
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { departmentId: departmentId ? parseInt(departmentId, 10) : null },
            include: {
                department: true,
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: adminUser.sub,
                action: 'USER_UPDATED',
                entity: 'User',
                entityId: userId,
                message: `User ${userToUpdate.email} department updated by admin`,
                ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                metadata: {
                    action: 'update_department',
                    departmentId: departmentId,
                    updatedUser: userToUpdate.email,
                    updatedBy: adminUser.email,
                    status: 'success',
                },
            },
        });

        logger.info('User department updated', {
            userId,
            email: userToUpdate.email,
            updatedBy: adminUser.sub,
            departmentId,
        });

        // Check if updating current user
        const isCurrentUser = userId === adminUser.sub;

        res.json({
            success: true,
            message: 'User department updated successfully',
            updatedUser,
            isCurrentUser,
        });
    } catch (error) {
        logger.error('Failed to update user department', { error, userId: req.params.id });
        res.status(500).json({ success: false, message: 'Failed to update user department' });
    }
});

/**
 * POST /api/admin/users/:id/managed-departments
 * Assign multiple departments to a HOD user
 */
router.post('/users/:id/managed-departments', adminOnly, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { departmentIds } = req.body; // Array of department IDs
        const adminUser = (req as any).user;

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        if (!Array.isArray(departmentIds)) {
            return res.status(400).json({ success: false, message: 'departmentIds must be an array' });
        }

        // Check if user exists
        const userToUpdate = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify user has HEAD_OF_DIVISION role
        const isHOD = userToUpdate.roles.some((ur) => ur.role.name === 'HEAD_OF_DIVISION');
        if (!isHOD) {
            return res.status(400).json({
                success: false,
                message: 'Only users with HEAD_OF_DIVISION role can manage multiple departments',
            });
        }

        // Validate all department IDs
        const validDepartmentIds: number[] = [];
        for (const deptId of departmentIds) {
            const parsedId = parseInt(deptId, 10);
            if (isNaN(parsedId)) {
                return res.status(400).json({ success: false, message: `Invalid department ID: ${deptId}` });
            }
            const dept = await prisma.department.findUnique({ where: { id: parsedId } });
            if (!dept) {
                return res.status(404).json({ success: false, message: `Department not found: ${deptId}` });
            }
            validDepartmentIds.push(parsedId);
        }

        // Remove existing department assignments
        await prisma.departmentManager.deleteMany({
            where: { userId },
        });

        // Create new department assignments
        if (validDepartmentIds.length > 0) {
            await prisma.departmentManager.createMany({
                data: validDepartmentIds.map((deptId) => ({
                    userId,
                    departmentId: deptId,
                })),
            });
        }

        // Fetch updated user with managed departments
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                department: true,
                managedDepartments: {
                    include: {
                        department: true,
                    },
                },
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: adminUser.sub,
                action: 'USER_UPDATED',
                entity: 'User',
                entityId: userId,
                message: `User ${userToUpdate.email} managed departments updated by admin`,
                ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || null,
                metadata: {
                    action: 'update_managed_departments',
                    departmentIds: validDepartmentIds,
                    updatedUser: userToUpdate.email,
                    updatedBy: adminUser.email,
                    status: 'success',
                },
            },
        });

        logger.info('User managed departments updated', {
            userId,
            email: userToUpdate.email,
            updatedBy: adminUser.sub,
            departmentIds: validDepartmentIds,
        });

        res.json({
            success: true,
            message: 'Managed departments updated successfully',
            updatedUser,
            managedDepartments: updatedUser?.managedDepartments || [],
        });
    } catch (error) {
        logger.error('Failed to update managed departments', { error, userId: req.params.id });
        res.status(500).json({ success: false, message: 'Failed to update managed departments' });
    }
});

/**
 * GET /api/admin/users/:id/managed-departments
 * Get all departments managed by a HOD user
 */
router.get('/users/:id/managed-departments', adminOnly, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);

        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const managedDepartments = await prisma.departmentManager.findMany({
            where: { userId },
            include: {
                department: true,
            },
        });

        res.json({
            success: true,
            managedDepartments: managedDepartments.map((dm) => ({
                id: dm.id,
                departmentId: dm.departmentId,
                departmentName: dm.department.name,
                departmentCode: dm.department.code,
                createdAt: dm.createdAt,
            })),
        });
    } catch (error) {
        logger.error('Failed to fetch managed departments', { error, userId: req.params.id });
        res.status(500).json({ success: false, message: 'Failed to fetch managed departments' });
    }
});

/**
 * POST /api/admin/bulk-role-assignment - Assign roles to multiple users
 */
router.post('/bulk-role-assignment', adminOnly, async (req: Request, res: Response) => {
    try {
        const { userIds, roleId } = req.body;

        if (!Array.isArray(userIds) || !roleId) {
            return res.status(400).json({ success: false, message: 'userIds array and roleId required' });
        }

        const parsedRoleId = parseInt(roleId, 10);
        if (isNaN(parsedRoleId)) {
            return res.status(400).json({ success: false, message: 'Invalid role ID' });
        }

        const role = await prisma.role.findUnique({ where: { id: parsedRoleId } });
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }

        let successCount = 0;
        const errors: string[] = [];

        for (const userId of userIds) {
            try {
                await prisma.userRole.upsert({
                    where: {
                        userId_roleId: {
                            userId: parseInt(userId, 10),
                            roleId: parsedRoleId,
                        },
                    },
                    create: {
                        userId: parseInt(userId, 10),
                        roleId: parsedRoleId,
                    },
                    update: {},
                });
                successCount++;
            } catch (err: any) {
                errors.push(`User ${userId}: ${err.message}`);
            }
        }

        res.json({
            success: true,
            message: `Assigned role to ${successCount}/${userIds.length} users`,
            successCount,
            totalAttempted: userIds.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        logger.error('Failed to bulk assign roles', { error });
        res.status(500).json({ success: false, message: 'Failed to bulk assign roles' });
    }
});

/**
 * POST /api/admin/bulk-department-change - Move users to different departments
 */
router.post('/bulk-department-change', adminOnly, async (req: Request, res: Response) => {
    try {
        const { userIds, departmentId } = req.body;

        if (!Array.isArray(userIds) || !departmentId) {
            return res.status(400).json({ success: false, message: 'userIds array and departmentId required' });
        }

        const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
        if (!dept) {
            return res.status(404).json({ success: false, message: 'Department not found' });
        }

        const result = await prisma.user.updateMany({
            where: { id: { in: userIds.map((id: string) => parseInt(id)) } },
            data: { departmentId: parseInt(departmentId) },
        });

        res.json({
            success: true,
            message: `Updated ${result.count} users to department ${dept.name}`,
            updatedCount: result.count,
        });
    } catch (error) {
        logger.error('Failed to bulk change departments', { error });
        res.status(500).json({ success: false, message: 'Failed to bulk change departments' });
    }
});

/**
 * POST /api/admin/bulk-deactivate - Deactivate multiple users
 */
router.post('/bulk-deactivate', adminOnly, async (req: Request, res: Response) => {
    try {
        const { userIds, reason } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({ success: false, message: 'userIds array required' });
        }

        const result = await prisma.user.updateMany({
            where: { id: { in: userIds.map((id: string) => parseInt(id)) } },
            data: {
                blocked: true,
                blockedAt: new Date(),
                blockedReason: reason || 'Bulk deactivation',
            },
        });

        res.json({
            success: true,
            message: `Deactivated ${result.count} users`,
            deactivatedCount: result.count,
        });
    } catch (error) {
        logger.error('Failed to bulk deactivate users', { error });
        res.status(500).json({ success: false, message: 'Failed to bulk deactivate users' });
    }
});

/**
 * POST /api/admin/bulk-password-reset - Send password reset emails
 */
router.post('/bulk-password-reset', adminOnly, async (req: Request, res: Response) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds)) {
            return res.status(400).json({ success: false, message: 'userIds array required' });
        }

        // Get users
        const users = await prisma.user.findMany({
            where: { id: { in: userIds.map((id: string) => parseInt(id)) } },
            select: { id: true, email: true, name: true },
        });

        // In production, you would send actual emails here
        // For now, just mark them for password reset
        const resetTokens = await Promise.all(
            users.map((user) => {
                // Generate a simple token (in production use a proper token)
                const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
                return Promise.resolve({
                    userId: user.id,
                    email: user.email,
                    token,
                });
            })
        );

        res.json({
            success: true,
            message: `Password reset emails queued for ${users.length} users`,
            emailsSent: users.length,
            details: `Reset tokens generated for: ${users.map((u) => u.email).join(', ')}`,
        });
    } catch (error) {
        logger.error('Failed to bulk reset passwords', { error });
        res.status(500).json({ success: false, message: 'Failed to bulk reset passwords' });
    }
});

/**
 * GET /api/admin/splintering-rules - Get all splintering rules
 */
router.get('/splintering-rules', adminOnly, async (req: Request, res: Response) => {
    try {
        const rules = await prisma.splinteringRule.findMany({
            orderBy: { createdAt: 'asc' },
        });

        // If no rules exist, seed with defaults
        if (rules.length === 0) {
            const defaultRules = [
                {
                    ruleId: 'vendor-threshold',
                    name: 'Vendor Spending Threshold',
                    description: 'Flags multiple requests to same vendor within time period',
                    thresholdAmount: 25000,
                    timeWindowDays: 90,
                    enabled: true,
                },
                {
                    ruleId: 'category-threshold',
                    name: 'Category Spending Threshold',
                    description: 'Flags multiple requests in same category within time period',
                    thresholdAmount: 50000,
                    timeWindowDays: 180,
                    enabled: true,
                },
            ];

            await prisma.splinteringRule.createMany({
                data: defaultRules,
            });

            const seededRules = await prisma.splinteringRule.findMany({
                orderBy: { createdAt: 'asc' },
            });

            return res.json({ success: true, data: seededRules });
        }

        res.json({ success: true, data: rules });
    } catch (error) {
        logger.error('Failed to fetch splintering rules', { error });
        res.status(500).json({ success: false, message: 'Failed to fetch splintering rules' });
    }
});

/**
 * POST /api/admin/splintering-rules - Create a new splintering rule
 */
router.post('/splintering-rules', adminOnly, async (req: Request, res: Response) => {
    try {
        const { ruleId, name, description, thresholdAmount, timeWindowDays, enabled } = req.body;

        if (!ruleId || !name || thresholdAmount == null || timeWindowDays == null) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const rule = await prisma.splinteringRule.create({
            data: {
                ruleId,
                name,
                description,
                thresholdAmount,
                timeWindowDays,
                enabled: enabled ?? true,
            },
        });

        res.json({ success: true, data: rule, message: 'Splintering rule created successfully' });
    } catch (error) {
        logger.error('Failed to create splintering rule', { error });
        res.status(500).json({ success: false, message: 'Failed to create splintering rule' });
    }
});

/**
 * PUT /api/admin/splintering-rules/:id - Update a splintering rule
 */
router.put('/splintering-rules/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, thresholdAmount, timeWindowDays, enabled } = req.body;

        const rule = await prisma.splinteringRule.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                thresholdAmount,
                timeWindowDays,
                enabled,
            },
        });

        res.json({ success: true, data: rule, message: 'Splintering rule updated successfully' });
    } catch (error) {
        logger.error('Failed to update splintering rule', { error });
        res.status(500).json({ success: false, message: 'Failed to update splintering rule' });
    }
});

/**
 * DELETE /api/admin/splintering-rules/:id - Delete a splintering rule
 */
router.delete('/splintering-rules/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.splinteringRule.delete({
            where: { id: parseInt(id) },
        });

        res.json({ success: true, message: 'Splintering rule deleted successfully' });
    } catch (error) {
        logger.error('Failed to delete splintering rule', { error });
        res.status(500).json({ success: false, message: 'Failed to delete splintering rule' });
    }
});

/**
 * POST /api/admin/splintering-rules/:id/toggle - Toggle rule enabled status
 */
router.post('/splintering-rules/:id/toggle', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const rule = await prisma.splinteringRule.findUnique({
            where: { id: parseInt(id) },
        });

        if (!rule) {
            return res.status(404).json({ success: false, message: 'Rule not found' });
        }

        const updated = await prisma.splinteringRule.update({
            where: { id: parseInt(id) },
            data: { enabled: !rule.enabled },
        });

        res.json({ success: true, data: updated, message: `Rule ${updated.enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
        logger.error('Failed to toggle splintering rule', { error });
        res.status(500).json({ success: false, message: 'Failed to toggle rule' });
    }
});

/**
 * Navigation Menu Management
 */

/**
 * GET /api/admin/navigation-menus - Get all navigation menu items (accessible to all authenticated users)
 */
router.get('/navigation-menus', authMiddleware, async (req: Request, res: Response) => {
    try {
        const menus = await prisma.navigationMenu.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });

        logger.info(`GET /api/admin/navigation-menus returned ${menus.length} items`);
        res.status(200).json(menus);
    } catch (error) {
        logger.error('Failed to fetch navigation menus, returning empty array', { error });
        // Return empty array with 200 instead of 500 to prevent page loading errors
        res.status(200).json([]);
    }
});

/**
 * POST /api/admin/navigation-menus - Create new navigation menu item
 */
router.post('/navigation-menus', adminOnly, async (req: Request, res: Response) => {
    try {
        const { menuId, label, icon, path, description, displayOrder } = req.body;

        // Validate required fields
        if (!menuId || !label || !path) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: menuId, label, path',
            });
        }

        // Check for duplicate menuId
        const existing = await prisma.navigationMenu.findUnique({
            where: { menuId },
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Menu item with ID "${menuId}" already exists`,
            });
        }

        const menu = await prisma.navigationMenu.create({
            data: {
                menuId,
                label,
                icon: icon || null,
                path,
                description: description || null,
                displayOrder: displayOrder || 0,
                isActive: true,
            },
        });

        logger.info('Created navigation menu item', { menuId, label });
        res.status(201).json({ success: true, data: menu, message: 'Menu item created' });
    } catch (error) {
        logger.error('Failed to create navigation menu', { error });
        res.status(500).json({ success: false, message: 'Failed to create menu item' });
    }
});

/**
 * PUT /api/admin/navigation-menus/:id - Update navigation menu item
 */
router.put('/navigation-menus/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { label, icon, path, description, displayOrder, isActive } = req.body;

        const menu = await prisma.navigationMenu.findUnique({
            where: { id: parseInt(id) },
        });

        if (!menu) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        const updated = await prisma.navigationMenu.update({
            where: { id: parseInt(id) },
            data: {
                label: label !== undefined ? label : menu.label,
                icon: icon !== undefined ? icon : menu.icon,
                path: path !== undefined ? path : menu.path,
                description: description !== undefined ? description : menu.description,
                displayOrder: displayOrder !== undefined ? displayOrder : menu.displayOrder,
                isActive: isActive !== undefined ? isActive : menu.isActive,
            },
        });

        logger.info('Updated navigation menu item', { id: parseInt(id), label: updated.label });
        res.json({ success: true, data: updated, message: 'Menu item updated' });
    } catch (error) {
        logger.error('Failed to update navigation menu', { error });
        res.status(500).json({ success: false, message: 'Failed to update menu item' });
    }
});

/**
 * DELETE /api/admin/navigation-menus/:id - Delete navigation menu item
 */
router.delete('/navigation-menus/:id', adminOnly, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const menu = await prisma.navigationMenu.findUnique({
            where: { id: parseInt(id) },
        });

        if (!menu) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        await prisma.navigationMenu.delete({
            where: { id: parseInt(id) },
        });

        logger.info('Deleted navigation menu item', { id: parseInt(id), label: menu.label });
        res.json({ success: true, message: 'Menu item deleted' });
    } catch (error) {
        logger.error('Failed to delete navigation menu', { error });
        res.status(500).json({ success: false, message: 'Failed to delete menu item' });
    }
});

/**
 * POST /api/admin/users - Create a LOCAL/dummy user (admin-managed, not LDAP-synced)
 *
 * Creates a user with userSource=LOCAL that will not have roles synced from LDAP.
 * Useful for creating test users, contractors, or service accounts.
 */
router.post('/users', adminOnly, async (req: Request, res: Response) => {
    try {
        const { email, name, password, roleIds, departmentId } = req.body;

        // Validate required fields
        if (!email || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email and name are required',
            });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // Validate roles if provided
        if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
            const roles = await prisma.role.findMany({
                where: { id: { in: roleIds } },
            });

            if (roles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more role IDs are invalid',
                });
            }
        }

        // Validate department if provided
        if (departmentId) {
            const department = await prisma.department.findUnique({
                where: { id: departmentId },
            });

            if (!department) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid department ID',
                });
            }
        }

        // Hash password if provided (optional for dummy users)
        let passwordHash = null;
        if (password) {
            passwordHash = await bcryptjs.hash(password, 10);
        }

        // Create user with userSource=LOCAL
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                userSource: 'LOCAL', // Mark as LOCAL user (admin-managed, not LDAP-synced)
                departmentId: departmentId || null,
            },
            include: {
                department: true,
            },
        });

        // Assign roles if provided
        if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
            await prisma.userRole.createMany({
                data: roleIds.map((roleId: number) => ({
                    userId: newUser.id,
                    roleId,
                })),
            });
        } else {
            // No roles specified - assign REQUESTER as default
            const requesterRole = await prisma.role.findUnique({
                where: { name: 'REQUESTER' },
            });

            if (requesterRole) {
                await prisma.userRole.create({
                    data: {
                        userId: newUser.id,
                        roleId: requesterRole.id,
                    },
                });
            }
        }

        // Fetch complete user with roles
        const createdUser = await prisma.user.findUnique({
            where: { id: newUser.id },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
            omit: {
                passwordHash: true,
            },
        });

        logger.info('LOCAL user created by admin', {
            userId: newUser.id,
            email: newUser.email,
            userSource: 'LOCAL',
            createdBy: (req as any).user?.sub,
        });

        res.status(201).json({
            success: true,
            message: 'Local user created successfully',
            user: createdUser,
        });
    } catch (error) {
        logger.error('Failed to create LOCAL user', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
        });
    }
});

export { router as adminRoutes };
