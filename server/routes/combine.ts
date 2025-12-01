import { Router } from 'express';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkUserRoles, hasPermission } from '../utils/roleUtils';
import { checkProcurementThresholds } from '../services/thresholdService';
import { createThresholdNotifications } from '../services/notificationService';

const router = Router();
const prisma = new PrismaClient();

// Get combinable requests
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { combinable } = req.query;
        const authReq = req as AuthenticatedRequest;
        
        console.log(`[COMBINE] 🔍 GET request received`);
        console.log(`[COMBINE] Auth header:`, req.headers.authorization ? 'Present' : 'MISSING');
        console.log(`[COMBINE] x-user-id header:`, req.headers['x-user-id'] || 'MISSING');
        
        const userId = authReq.user?.sub;
        const userRoles = authReq.user?.roles || [];
        
        console.log(`[COMBINE] User ID from auth:`, userId);
        console.log(`[COMBINE] User roles from auth:`, userRoles);
        
        if (!userId) {
            console.log(`[COMBINE] ❌ No user ID - authentication failed`);
            return res.status(401).json({
                error: 'Authentication required',
                message: 'User ID not found in request',
            });
        }
        
        console.log(`[COMBINE] GET request from user ${userId} with roles:`, userRoles);

        let whereClause: any = {};

        // Only include requests that can be combined
        if (combinable === 'true') {
            whereClause.status = {
                in: [RequestStatus.DRAFT, RequestStatus.SUBMITTED, RequestStatus.DEPARTMENT_REVIEW, RequestStatus.PROCUREMENT_REVIEW],
            };
        }

        // Role-based filtering using improved role checking
        const userRoleInfo = checkUserRoles(userRoles);
        
        console.log(`[COMBINE] User role check result:`, {
            canCombineRequests: userRoleInfo.canCombineRequests,
            isProcurementOfficer: userRoleInfo.isProcurementOfficer,
            isProcurementManager: userRoleInfo.isProcurementManager,
            isAdmin: userRoleInfo.isAdmin,
        });

        // Only procurement officers, procurement managers, and admins can combine requests
        if (!userRoleInfo.canCombineRequests) {
            console.log(`[COMBINE] Access denied for user ${userId} - insufficient permissions`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement officers and procurement managers can combine requests.',
                code: 'INSUFFICIENT_PERMISSIONS',
                userRoles,
            });
        }

        if (userRoleInfo.isProcurementOfficer || userRoleInfo.isProcurementManager || userRoleInfo.isAdmin) {
            // Procurement users can see all combinable requests
            console.log(`[COMBINE] User ${userId} authorized to view combinable requests`);
        } else {
            // This should not happen due to the canCombineRequests check above, but as a fallback
            console.log(`[COMBINE] Unexpected role state for user ${userId}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Invalid role for combining requests.',
                code: 'INVALID_ROLE',
            });
        }

        const requests = await prisma.request.findMany({
            where: whereClause,
            include: {
                department: { select: { name: true, id: true } },
                requester: { select: { name: true } },
                items: {
                    select: {
                        id: true,
                        description: true,
                        quantity: true,
                        unitPrice: true,
                        totalPrice: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Transform requests for frontend
        const transformedRequests = requests.map((request) => ({
            id: request.id,
            reference: request.reference,
            title: request.title,
            status: request.status,
            priority: request.priority || 'MEDIUM',
            totalEstimated: request.totalEstimated || 0,
            currency: request.currency || 'USD',
            department: request.department?.name || 'Unknown',
            requestedBy: request.requester.name,
            createdAt: request.createdAt,
            items: request.items.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitCost: Number(item.unitPrice),
                totalCost: Number(item.totalPrice),
            }),
        }));
        
        console.log(`[COMBINE] Returning ${transformedRequests.length} combinable requests to user ${userId}`);

        res.json(transformedRequests);
    } catch (error) {
        console.error('Error fetching combinable requests:', error);
        res.status(500).json({
            error: 'Failed to fetch requests',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Combine multiple requests into one
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, items, originalRequestIds, combinationConfig, requiresApproval, totalEstimated, currency, priority, targetDepartment } = req.body;

        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userRoles = authReq.user.roles || [];
        
        console.log(`[COMBINE] POST request from user ${userId} to combine ${originalRequestIds?.length || 0} requests`);
        
        // Validate required fields
        if (!title || !items || !Array.isArray(items) || items.length === 0) {
            console.log(`[COMBINE] Validation failed - missing required fields`);
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Title and items are required',
                details: { title: !!title, items: items?.length || 0 },
            });
        }
        
        if (!originalRequestIds || !Array.isArray(originalRequestIds) || originalRequestIds.length < 2) {
            console.log(`[COMBINE] Validation failed - insufficient original requests`);
            return res.status(400).json({
                error: 'Validation failed',
                message: 'At least 2 original requests are required for combining',
                details: { originalRequestIds: originalRequestIds?.length || 0 },
            });
        }

        // Get user role information for permission checking
        const userRoleInfo = checkUserRoles(userRoles);
        
        console.log(`[COMBINE] User role check:`, {
            canCombineRequests: userRoleInfo.canCombineRequests,
            isProcurementOfficer: userRoleInfo.isProcurementOfficer,
            isProcurementManager: userRoleInfo.isProcurementManager,
        });

        // Only procurement officers, procurement managers, and admins can combine requests
        if (!userRoleInfo.canCombineRequests) {
            console.log(`[COMBINE] Access denied for user ${userId}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement officers and procurement managers can combine requests.',
                code: 'INSUFFICIENT_PERMISSIONS',
                userRoles,
            });
        }

        // Validate that user has permission to combine requests
        const originalRequests = await prisma.request.findMany({
            where: {
                id: { in: originalRequestIds },
                status: { in: [RequestStatus.DRAFT, RequestStatus.SUBMITTED, RequestStatus.DEPARTMENT_REVIEW, RequestStatus.PROCUREMENT_REVIEW] },
            },
            include: {
                department: { select: { name: true, id: true } },
                requester: { select: { name: true } },
            },
        });
        
        console.log(`[COMBINE] Found ${originalRequests.length} valid requests out of ${originalRequestIds.length}`);

        if (originalRequests.length !== originalRequestIds.length) {
            const foundIds = originalRequests.map(r => r.id);
            const missingIds = originalRequestIds.filter((id: number) => !foundIds.includes(id));
            console.log(`[COMBINE] Missing or invalid request IDs:`, missingIds);
            return res.status(400).json({
                error: 'Invalid requests',
                message: 'Some requests cannot be combined or do not exist',
                details: {
                    requested: originalRequestIds.length,
                    found: originalRequests.length,
                    missingIds,
                },
            });
        }

        // Check cross-department permissions - procurement users can combine across departments
        const departments = [...new Set(originalRequests.map((req) => req.department?.name))];

        if (departments.length > 1 && !(userRoleInfo.isProcurementOfficer || userRoleInfo.isProcurementManager || userRoleInfo.isAdmin)) {
            return res.status(403).json({
                error: 'Cross-department combination requires procurement officer or manager permissions',
            });
        }

        // Create combined request
        const result = await prisma.$transaction(async (tx) => {
            // Generate unique reference for combined request
            const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
            const reference = `CMB-${timestamp}`;

            // Create the combined request
            const combinedRequest = await tx.request.create({
                data: {
                    reference,
                    title,
                    description,
                    requesterId: userId,
                    departmentId: originalRequests[0].departmentId, // Use first request's department
                    totalEstimated: totalEstimated,
                    currency: currency || 'USD',
                    priority: priority || 'MEDIUM',
                    status: requiresApproval ? RequestStatus.SUBMITTED : RequestStatus.DRAFT,
                },
            });

            // Add items to the combined request
            for (const item of items) {
                await tx.requestItem.create({
                    data: {
                        requestId: combinedRequest.id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitCost,
                        totalPrice: item.totalCost || item.quantity * item.unitCost,
                        partNumber: item.originalRequests ? `From: ${item.originalRequests.join(', ')}` : undefined,
                    },
                });
            }

            // Mark original requests as combined (set status to a combined status or add note)
            for (const originalRequest of originalRequests) {
                await tx.request.update({
                    where: { id: originalRequest.id },
                    data: {
                        status: RequestStatus.CLOSED,
                        description: `${originalRequest.description}\n\n[COMBINED INTO ${reference}]`,
                    },
                });
                console.log(`[COMBINE] Marked request ${originalRequest.reference} as CLOSED`);
            }

            // Create audit log for combination
            await tx.requestAction.create({
                data: {
                    requestId: combinedRequest.id,
                    performedById: userId,
                    action: 'COMMENT',
                    comment: `Combined ${originalRequestIds.length} requests: ${originalRequests.map((r) => r.reference).join(', ')}`,
                },
            });

            // Add individual audit logs for each original request
            for (const originalRequest of originalRequests) {
                await tx.requestAction.create({
                    data: {
                        requestId: originalRequest.id,
                        performedById: userId,
                        action: 'COMMENT',
                        comment: `Request combined into ${reference}`,
                    },
                });
            }

            return combinedRequest;
        });

        // Log the combination for analytics
        console.log(`User ${userId} combined ${originalRequestIds.length} requests into ${result.reference}`, {
            originalRequestIds,
            combinedRequestId: result.id,
            totalValue: totalEstimated,
        });

        // Check if combined request exceeds thresholds and notify procurement officers
        try {
            const totalValue = totalEstimated || 0;
            const procurementTypes = items.map((item: any) => item.procurementType).filter(Boolean);
            const requestCurrency = currency || 'JMD';
            const thresholdResult = checkProcurementThresholds(totalValue, procurementTypes, requestCurrency);

            if (thresholdResult.requiresExecutiveApproval) {
                console.log(`[COMBINE] Combined request ${result.reference} exceeds threshold, notifying procurement officers`);

                // Fetch the full combined request details for notifications
                const combinedRequestFull = await prisma.request.findUnique({
                    where: { id: result.id },
                    include: {
                        requester: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                });

                // Send notifications to procurement officers
                await createThresholdNotifications({
                    requestId: result.id,
                    requestReference: result.reference,
                    requestTitle: title,
                    requesterName: combinedRequestFull?.requester?.name || 'Unknown',
                    departmentName: combinedRequestFull?.department?.name || 'Unknown',
                    totalValue,
                    currency: requestCurrency,
                    thresholdAmount: thresholdResult.thresholdAmount,
                    category: thresholdResult.category,
                });

                console.log(`[COMBINE] Threshold notifications sent for combined request ${result.reference}`);
            }
        } catch (notificationError) {
            // Don't fail the combination if notifications fail
            console.error('[COMBINE] Failed to send threshold notifications:', notificationError);
        }

        res.json({
            success: true,
            message: 'Requests combined successfully',
            combinedRequest: {
                id: result.id,
                reference: result.reference,
                title: result.title,
            },
            originalRequestIds,
        });
    } catch (error) {
        console.error('Error combining requests:', error);
        res.status(500).json({
            error: 'Failed to combine requests',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
