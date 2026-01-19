import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { checkUserRoles } from '../utils/roleUtils.js';

const router = Router();
const prisma = new PrismaClient();

// Get all pending approvals for the current user based on their role
router.get('/', authMiddleware, async (req, res) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userIdNum = Number(userId);
        const userRoles = authReq.user.roles || [];
        const { type } = req.query; // Filter by type: 'request', 'evaluation', 'po', 'payment'

        console.log('[Approvals] userId:', userIdNum, 'userRoles:', userRoles);

        const userRoleInfo = checkUserRoles(userRoles);

        let pendingItems: any[] = [];

        // Determine which approvals the user can see based on their role
        if (userRoleInfo.isDepartmentHead) {
            // Department heads see requests awaiting department review in all their managed departments
            const managedDepartments = await prisma.departmentManager.findMany({
                where: { userId: Number.isFinite(userIdNum) ? userIdNum : undefined },
                select: { departmentId: true },
            });

            let managedDeptIds = managedDepartments.map((dm) => dm.departmentId);

            // If no managed departments via DepartmentManager, check primary department
            if (managedDeptIds.length === 0) {
                const hodUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { departmentId: true },
                });
                if (hodUser?.departmentId) {
                    managedDeptIds = [hodUser.departmentId];
                }
            }

            console.log('[Approvals HOD] userId:', userId, 'managedDeptIds:', managedDeptIds);

            // Deduplicate and ensure primary department is included
            managedDeptIds = Array.from(new Set(managedDeptIds));

            // Query DEPARTMENT_REVIEW requests
            const departmentReviewRequests = await prisma.request.findMany({
                where: {
                    status: 'DEPARTMENT_REVIEW',
                    departmentId: managedDeptIds.length > 0 ? { in: managedDeptIds } : undefined,
                },
                include: {
                    requester: { select: { name: true, email: true } },
                    department: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            console.log('[Approvals HOD] DEPARTMENT_REVIEW found:', departmentReviewRequests.length);

            // Query HOD_REVIEW requests either assigned to this HOD or in their managed departments
            const hodReviewRequests = await prisma.request.findMany({
                where: {
                    status: 'HOD_REVIEW',
                    OR: [{ currentAssigneeId: Number.isFinite(userIdNum) ? userIdNum : undefined }, managedDeptIds.length > 0 ? { departmentId: { in: managedDeptIds } } : undefined].filter(
                        Boolean
                    ) as any,
                },
                include: {
                    requester: { select: { name: true, email: true } },
                    department: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            console.log(
                '[Approvals HOD] HOD_REVIEW found:',
                hodReviewRequests.length,
                hodReviewRequests.map((r) => ({ id: r.id, dept: r.department?.name, status: r.status, assignee: r.currentAssigneeId }))
            );

            const allRequests = [...departmentReviewRequests, ...hodReviewRequests];

            pendingItems.push(
                ...allRequests.map((req) => ({
                    id: req.id,
                    type: 'Request',
                    number: req.reference,
                    description: req.title,
                    requester: req.requester.name,
                    department: req.department?.name || 'N/A',
                    amount: Number(req.totalEstimated || 0),
                    submittedDate: req.createdAt.toISOString().split('T')[0],
                    dueDate: req.expectedDelivery?.toISOString().split('T')[0] || null,
                    priority: req.priority || 'MEDIUM',
                    documents: 0, // TODO: Count attachments
                    status: req.status,
                }))
            );
        }

        if (userRoleInfo.isExecutiveDirector) {
            // Executive directors see requests awaiting executive review
            const requests = await prisma.request.findMany({
                where: {
                    status: 'EXECUTIVE_REVIEW',
                },
                include: {
                    requester: { select: { name: true, email: true } },
                    department: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            pendingItems.push(
                ...requests.map((req) => ({
                    id: req.id,
                    type: 'Request',
                    number: req.reference,
                    description: req.title,
                    requester: req.requester.name,
                    department: req.department?.name || 'N/A',
                    amount: Number(req.totalEstimated || 0),
                    submittedDate: req.createdAt.toISOString().split('T')[0],
                    dueDate: req.expectedDelivery?.toISOString().split('T')[0] || null,
                    priority: req.priority || 'MEDIUM',
                    documents: 0,
                    status: req.status,
                }))
            );
        }

        if (userRoleInfo.isProcurementUser) {
            // Procurement users see requests awaiting procurement review
            const requests = await prisma.request.findMany({
                where: {
                    status: 'PROCUREMENT_REVIEW',
                },
                include: {
                    requester: { select: { name: true, email: true } },
                    department: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            pendingItems.push(
                ...requests.map((req) => ({
                    id: req.id,
                    type: 'Request',
                    number: req.reference,
                    description: req.title,
                    requester: req.requester.name,
                    department: req.department?.name || 'N/A',
                    amount: Number(req.totalEstimated || 0),
                    submittedDate: req.createdAt.toISOString().split('T')[0],
                    dueDate: req.expectedDelivery?.toISOString().split('T')[0] || null,
                    priority: req.priority || 'MEDIUM',
                    documents: 0,
                    status: req.status,
                }))
            );

            // TODO: Add evaluations awaiting validation
            // TODO: Add RFQs awaiting approval
        }

        if (userRoleInfo.isFinanceUser) {
            // Finance users see requests awaiting finance review
            const requests = await prisma.request.findMany({
                where: {
                    status: 'FINANCE_REVIEW',
                },
                include: {
                    requester: { select: { name: true, email: true } },
                    department: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            pendingItems.push(
                ...requests.map((req) => ({
                    id: req.id,
                    type: 'Request',
                    number: req.reference,
                    description: req.title,
                    requester: req.requester.name,
                    department: req.department?.name || 'N/A',
                    amount: Number(req.totalEstimated || 0),
                    submittedDate: req.createdAt.toISOString().split('T')[0],
                    dueDate: req.expectedDelivery?.toISOString().split('T')[0] || null,
                    priority: req.priority || 'MEDIUM',
                    documents: 0,
                    status: req.status,
                }))
            );
        }

        // Filter by type if specified
        if (type && type !== 'all') {
            pendingItems = pendingItems.filter((item) => item.type.toLowerCase() === (type as string).toLowerCase());
        }

        const response: any = { success: true, requests: pendingItems };

        // Add debug info in development
        if (process.env.APP_ENV === 'development') {
            response.debug = {
                userId,
                isDepartmentHead: userRoleInfo.isDepartmentHead,
                departmentReviewCount: pendingItems.filter((p) => p.status === 'DEPARTMENT_REVIEW').length,
                hodReviewCount: pendingItems.filter((p) => p.status === 'HOD_REVIEW').length,
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Error fetching approvals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch approvals',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
