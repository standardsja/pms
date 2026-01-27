/**
 * Procurement Requests Routes
 * Handles procurement request operations with Prisma database
 */
import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { prisma } from '../prismaClient.js';
import { RequestStatus } from '@prisma/client';
import { auditService } from '../services/auditService.js';
import { getAuditContext } from '../middleware/auditMiddleware.js';

const router = Router();

// Get all requests (with optional filtering)
router.get(
    '/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;
        const userRoles = authenticatedReq.user.roles || [];

        logger.info('Fetching procurement requests', { userId, roles: userRoles });

        // Build where clause based on user role
        const whereClause: any = {};

        // Non-admin users see only their department or assigned requests
        if (!userRoles.includes('ADMIN') && !userRoles.includes('PROCUREMENT_OFFICER')) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { departmentId: true },
            });

            whereClause.OR = [{ requesterId: userId }, { departmentId: user?.departmentId || 0 }, { currentAssigneeId: userId }];
        }

        const requests = await prisma.request.findMany({
            where: whereClause,
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                items: true,
                statusHistory: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Format response to match frontend expectations
        const formattedRequests = requests.map((req) => ({
            id: req.reference,
            title: req.title,
            department: req.department?.name || 'N/A',
            requestedBy: req.requester.name || req.requester.email,
            status: req.status,
            totalAmount: Number(req.totalEstimated || 0),
            createdAt: req.createdAt.toISOString(),
            items: req.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
            })),
        }));

        res.json(formattedRequests);
    })
);

// Recent activities for a requester (actions on their requests)
router.get(
    '/activities',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const requesterId = authenticatedReq.user?.sub;

        if (!requesterId) {
            return res.status(401).json({ message: 'User ID required' });
        }

        const actions = await prisma.requestAction.findMany({
            where: {
                request: {
                    requesterId,
                },
            },
            include: {
                request: {
                    select: { id: true, reference: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const mapStatus = (action: string): string => {
            if (action === 'RETURN' || action === 'REJECT') return 'rejected';
            if (action === 'APPROVE') return 'approved';
            return 'pending';
        };

        const activities = actions.map((a) => ({
            id: a.id,
            action: a.action,
            description: `${a.action} for request ${a.request.reference || a.request.id}`,
            status: mapStatus(a.action),
            createdAt: a.createdAt.toISOString(),
        }));

        return res.json({ activities });
    })
);

// Get request by ID
router.get(
    '/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;

        const request = await prisma.request.findUnique({
            where: { reference: id },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                items: true,
                statusHistory: {
                    include: {
                        changedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                attachments: true,
                currentAssignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Format response
        const formatted = {
            id: request.reference,
            title: request.title,
            description: request.description,
            department: request.department?.name || 'N/A',
            requestedBy: request.requester.name || request.requester.email,
            status: request.status,
            totalAmount: Number(request.totalEstimated || 0),
            createdAt: request.createdAt.toISOString(),
            submittedAt: request.submittedAt?.toISOString(),
            items: request.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
            })),
            statusHistory: request.statusHistory.map((history) => ({
                status: history.status,
                date: history.createdAt.toISOString(),
                actor: history.changedBy?.name || 'System',
                note: history.comment || '',
            })),
            attachments: request.attachments.map((att) => ({
                id: att.id,
                filename: att.filename,
                url: att.url,
            })),
            currentAssignee: request.currentAssignee
                ? {
                      id: request.currentAssignee.id,
                      name: request.currentAssignee.name,
                      email: request.currentAssignee.email,
                  }
                : null,
        };

        res.json(formatted);
    })
);

// Create new request
router.post(
    '/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;
        const auditContext = getAuditContext(req);
        const { title, description, items, fundingSource, budgetCode, departmentId } = req.body;

        logger.info('Creating new procurement request', { userId, title });

        // Validate required fields
        if (!title || !items || items.length === 0) {
            return res.status(400).json({ error: 'Title and items are required' });
        }

        // Generate reference number (format: REQ-YYYYMMDD-XXXX)
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.request.count({
            where: {
                reference: {
                    startsWith: `REQ-${dateStr}`,
                },
            },
        });
        const reference = `REQ-${dateStr}-${String(count + 1).padStart(4, '0')}`;

        // Calculate total
        const totalEstimated = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);

        // Get user's department if not specified
        let deptId = departmentId;
        if (!deptId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { departmentId: true },
            });
            deptId = user?.departmentId;
        }

        // Create request with items
        const newRequest = await prisma.request.create({
            data: {
                reference,
                title,
                description,
                requesterId: userId,
                departmentId: deptId,
                status: RequestStatus.DRAFT,
                budgetCode,
                totalEstimated,
                items: {
                    create: items.map((item: any) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                    })),
                },
                statusHistory: {
                    create: {
                        status: RequestStatus.DRAFT,
                        changedById: userId,
                        comment: 'Request created',
                    },
                },
            },
            include: {
                items: true,
                requester: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                department: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        logger.info('Created new procurement request', { requestId: newRequest.id, reference });

        await auditService.logRequest({
            userId,
            requestId: newRequest.id,
            action: 'REQUEST_CREATED',
            message: `Created procurement request ${reference}`,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            metadata: {
                reference,
                title: newRequest.title,
                departmentId: newRequest.departmentId,
                totalEstimated: Number(newRequest.totalEstimated),
            },
        });

        res.status(201).json({
            id: newRequest.reference,
            title: newRequest.title,
            status: newRequest.status,
            totalAmount: Number(newRequest.totalEstimated),
            createdAt: newRequest.createdAt.toISOString(),
        });
    })
);

// Update request
router.put(
    '/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;
        const auditContext = getAuditContext(req);
        const { title, description, items, budgetCode } = req.body;

        const existingRequest = await prisma.request.findUnique({
            where: { reference: id },
            include: { items: true },
        });

        if (!existingRequest) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Only allow updates if request is in DRAFT status or user is authorized
        if (existingRequest.status !== RequestStatus.DRAFT && existingRequest.requesterId !== userId) {
            return res.status(403).json({ error: 'Cannot update request in current status' });
        }

        // Calculate new total if items changed
        let totalEstimated = existingRequest.totalEstimated;
        if (items) {
            totalEstimated = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
        }

        // Update request
        const updatedRequest = await prisma.request.update({
            where: { reference: id },
            data: {

                // Assign current request to self (Budget Manager override for finance stages)
                router.post(
                    '/:id/assign/self',
                    authMiddleware,
                    asyncHandler(async (req, res) => {
                        const { id } = req.params;
                        const authenticatedReq = req as AuthenticatedRequest;
                        const userId = authenticatedReq.user.sub;
                        const roleEntries = authenticatedReq.user.roles || [];
                        const roleNames: string[] = roleEntries.map((r: any) => (typeof r === 'string' ? r : r?.name || '')).map((n) => n.toUpperCase());

                        // Only Budget Manager (or Finance Manager) can self-assign at finance stages
                        if (!roleNames.includes('BUDGET_MANAGER') && !roleNames.includes('FINANCE_MANAGER')) {
                            return res.status(403).json({ message: 'Only Budget Manager or Finance Manager may self-assign at finance stages.' });
                        }

                        const request = await prisma.request.findUnique({
                            where: { reference: id },
                            select: { id: true, status: true },
                        });
                        if (!request) return res.status(404).json({ message: 'Request not found' });

                        if (!['FINANCE_REVIEW', 'BUDGET_MANAGER_REVIEW'].includes(String(request.status))) {
                            return res.status(400).json({ message: 'Self-assignment only allowed during finance review stages.' });
                        }

                        const updated = await prisma.request.update({
                            where: { id: request.id },
                            data: {
                                currentAssigneeId: Number(userId),
                                statusHistory: {
                                    create: {
                                        status: request.status,
                                        changedById: Number(userId),
                                        comment: 'Assigned to self by Budget/Finance Manager',
                                    },
                                },
                            },
                            include: {
                                requester: { select: { id: true, name: true, email: true } },
                                department: { select: { id: true, name: true, code: true } },
                                currentAssignee: { select: { id: true, name: true, email: true } },
                            },
                        });

                        // Audit log
                        try {
                            const ctx = getAuditContext(authenticatedReq);
                            await auditService.log({
                                ...ctx,
                                action: 'APPROVAL_DELEGATED',
                                details: { type: 'SELF_ASSIGN', requestId: updated.id, stage: request.status },
                            });
                        } catch (e) {
                            logger.warn('Audit log failed for self-assign', { error: String(e) });
                        }

                        return res.json(updated);
                    })
                );

                // Assign current request to a specific user (Budget Manager finance-stage delegation)
                router.post(
                    '/:id/assign',
                    authMiddleware,
                    asyncHandler(async (req, res) => {
                        const { id } = req.params;
                        const { userId: targetUserId } = req.body as { userId?: number };
                        const authenticatedReq = req as AuthenticatedRequest;
                        const actorUserId = authenticatedReq.user.sub;
                        const roleEntries = authenticatedReq.user.roles || [];
                        const roleNames: string[] = roleEntries.map((r: any) => (typeof r === 'string' ? r : r?.name || '')).map((n) => n.toUpperCase());

                        if (!targetUserId || Number.isNaN(Number(targetUserId))) {
                            return res.status(400).json({ message: 'Valid userId is required' });
                        }

                        // Only Budget Manager (or Finance Manager) can assign during finance stages
                        if (!roleNames.includes('BUDGET_MANAGER') && !roleNames.includes('FINANCE_MANAGER')) {
                            return res.status(403).json({ message: 'Only Budget Manager or Finance Manager may assign at finance stages.' });
                        }

                        const request = await prisma.request.findUnique({
                            where: { reference: id },
                            select: { id: true, status: true },
                        });
                        if (!request) return res.status(404).json({ message: 'Request not found' });

                        if (!['FINANCE_REVIEW', 'BUDGET_MANAGER_REVIEW'].includes(String(request.status))) {
                            return res.status(400).json({ message: 'Assignment only allowed during finance review stages.' });
                        }

                        const updated = await prisma.request.update({
                            where: { id: request.id },
                            data: {
                                currentAssigneeId: Number(targetUserId),
                                statusHistory: {
                                    create: {
                                        status: request.status,
                                        changedById: Number(actorUserId),
                                        comment: `Assigned to user ${Number(targetUserId)} by Budget/Finance Manager`,
                                    },
                                },
                            },
                            include: {
                                requester: { select: { id: true, name: true, email: true } },
                                department: { select: { id: true, name: true, code: true } },
                                currentAssignee: { select: { id: true, name: true, email: true } },
                            },
                        });

                        // Audit log
                        try {
                            const ctx = getAuditContext(authenticatedReq);
                            await auditService.log({
                                ...ctx,
                                action: 'APPROVAL_DELEGATED',
                                details: { type: 'ASSIGN', requestId: updated.id, stage: request.status, toUserId: Number(targetUserId) },
                            });
                        } catch (e) {
                            logger.warn('Audit log failed for assign', { error: String(e) });
                        }

                        return res.json(updated);
                    })
                );
                title: title || existingRequest.title,
                description: description || existingRequest.description,
                budgetCode: budgetCode || existingRequest.budgetCode,
                totalEstimated,
                updatedAt: new Date(),
            },
            include: {
                items: true,
                requester: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Update items if provided
        if (items) {
            // Delete existing items
            await prisma.requestItem.deleteMany({
                where: { requestId: existingRequest.id },
            });

            // Create new items
            await prisma.requestItem.createMany({
                data: items.map((item: any) => ({
                    requestId: existingRequest.id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                })),
            });
        }

        logger.info('Updated procurement request', { requestId: id });

        await auditService.logRequest({
            userId,
            requestId: existingRequest.id,
            action: 'REQUEST_UPDATED',
            message: `Updated procurement request ${id}`,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            metadata: {
                title: updatedRequest.title,
                totalEstimated: Number(updatedRequest.totalEstimated),
                itemsUpdated: Boolean(items),
            },
        });

        res.json({
            id: updatedRequest.reference,
            title: updatedRequest.title,
            status: updatedRequest.status,
            updatedAt: updatedRequest.updatedAt.toISOString(),
        });
    })
);

// Submit request for approval
router.post(
    '/:id/submit',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;
        const auditContext = getAuditContext(req);

        const request = await prisma.request.findUnique({
            where: { reference: id },
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== RequestStatus.DRAFT) {
            return res.status(400).json({ error: 'Only draft requests can be submitted' });
        }

        // Update status to SUBMITTED
        const updated = await prisma.request.update({
            where: { reference: id },
            data: {
                status: RequestStatus.SUBMITTED,
                submittedAt: new Date(),
                statusHistory: {
                    create: {
                        status: RequestStatus.SUBMITTED,
                        changedById: userId,
                        comment: 'Request submitted for approval',
                    },
                },
            },
        });

        logger.info('Submitted procurement request', { requestId: id });

        await auditService.logRequest({
            userId,
            requestId: request.id,
            action: 'REQUEST_SUBMITTED',
            message: `Submitted procurement request ${id}`,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
        });

        res.json({
            id: updated.reference,
            status: updated.status,
            submittedAt: updated.submittedAt?.toISOString(),
        });
    })
);

// Approve/reject request
router.post(
    '/:id/action',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { action, notes } = req.body;
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;
        const userRoles = authenticatedReq.user.roles || [];
        const auditContext = getAuditContext(req);

        const request = await prisma.request.findUnique({
            where: { reference: id },
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Determine new status based on action and current status
        let newStatus: RequestStatus;
        if (action === 'approve') {
            // Workflow: SUBMITTED → DEPARTMENT_APPROVED → FINANCE_APPROVED
            if (request.status === RequestStatus.SUBMITTED) {
                newStatus = RequestStatus.DEPARTMENT_APPROVED;
            } else if (request.status === RequestStatus.DEPARTMENT_APPROVED) {
                newStatus = RequestStatus.FINANCE_APPROVED;
            } else {
                return res.status(400).json({ error: 'Cannot approve request in current status' });
            }
        } else if (action === 'reject') {
            if (request.status === RequestStatus.SUBMITTED) {
                newStatus = RequestStatus.DEPARTMENT_RETURNED;
            } else if (request.status === RequestStatus.DEPARTMENT_APPROVED) {
                newStatus = RequestStatus.FINANCE_RETURNED;
            } else {
                return res.status(400).json({ error: 'Cannot reject request in current status' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
        }

        // Update request status
        const updated = await prisma.request.update({
            where: { reference: id },
            data: {
                status: newStatus,
                statusHistory: {
                    create: {
                        status: newStatus,
                        changedById: userId,
                        comment: notes || `Request ${action}ed`,
                    },
                },
            },
        });

        logger.info('Processed procurement request action', { requestId: id, action, newStatus });

        await auditService.logApproval({
            userId,
            requestId: request.id,
            approved: action === 'approve',
            stage: request.status,
            comment: notes,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
        });

        res.json({
            id: updated.reference,
            status: updated.status,
            updatedAt: updated.updatedAt.toISOString(),
        });
    })
);

// Get PDF (placeholder - implement PDF generation library as needed)
router.get(
    '/:id/pdf',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const request = await prisma.request.findUnique({
            where: { reference: id },
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // TODO: Implement PDF generation using pdfkit or similar
        res.json({ message: 'PDF generation not yet implemented', requestId: id });
    })
);

/**
 * GET /api/requests/activities
 * Get recent activities for the current user's requests
 */
router.get(
    '/activities',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user.sub;

        // Fetch recent request status changes for user's requests
        const activities = await prisma.requestStatusHistory.findMany({
            where: {
                request: {
                    requesterId: userId,
                },
            },
            include: {
                request: {
                    select: {
                        id: true,
                        reference: true,
                        title: true,
                    },
                },
                changedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 10, // Last 10 activities
        });

        const formatted = activities.map((activity) => ({
            id: activity.id,
            action: `Status changed to ${activity.status}`,
            description: `Request ${activity.request?.reference} - ${activity.request?.title}`,
            status: activity.status,
            createdAt: activity.createdAt.toISOString(),
        }));

        res.json({ activities: formatted });
    })
);

export default router;
