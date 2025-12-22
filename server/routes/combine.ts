import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { checkUserRoles, hasPermission } from '../utils/roleUtils.js';
import { checkProcurementThresholds } from '../services/thresholdService.js';
import { createThresholdNotifications } from '../services/notificationService.js';

const router = Router();
const prisma = new PrismaClient();

// Get combinable requests or existing combined requests
// Optional auth: list can be viewed without auth but will show filtered results if auth provided
router.get('/', async (req, res) => {
    try {
        const { combinable } = req.query;

        // Extract auth info if available
        let userId: number | undefined;
        let userRoles: string[] = [];
        let userPermissions: any = {};

        const authReq = req as AuthenticatedRequest;
        if (authReq.user) {
            userId = authReq.user.sub;
            userRoles = authReq.user.roles || [];
            userPermissions = authReq.user.permissions || ({} as any);
        }

        // Role-based filtering using improved role checking (only if auth available)
        const userRoleInfo = checkUserRoles(userRoles);

        // Permission-first: allow via explicit permission; fallback to role flags
        const canCombine = Boolean((userPermissions as any)['request:combine']) || userRoleInfo.canCombineRequests || !userId; // Allow unauthenticated to view but not combine

        // Only procurement officers, procurement managers, and admins (or permission) can view combined requests for combining
        if (!canCombine && userId) {
            return res.status(403).json({
                message: 'Access denied. Only procurement officers and procurement managers can view combined requests.',
                code: 'INSUFFICIENT_PERMISSIONS',
            });
        }

        // If no combinable query param, return existing combined requests
        if (combinable !== 'true') {
            const combinedRequests = await (prisma as any).combinedRequest.findMany({
                include: {
                    lots: {
                        select: {
                            id: true,
                            reference: true,
                            title: true,
                            lotNumber: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Fetch user details separately for each combined request
            const transformedCombined = await Promise.all(
                combinedRequests.map(async (combined: any) => {
                    const user = await prisma.user.findUnique({
                        where: { id: combined.createdBy },
                        select: { id: true, name: true, email: true },
                    });

                    return {
                        id: combined.id,
                        reference: combined.reference,
                        title: combined.title,
                        description: combined.description,
                        lotsCount: combined.lots.length,
                        createdAt: combined.createdAt,
                        updatedAt: combined.updatedAt,
                        createdBy: user
                            ? {
                                  id: user.id,
                                  full_name: user.name || 'Unknown',
                                  email: user.email,
                              }
                            : null,
                    };
                })
            );

            return res.json(transformedCombined);
        }

        // Otherwise, return requests that can be combined
        let whereClause: any = {};

        whereClause.status = {
            in: ['DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'PROCUREMENT_REVIEW'],
        };

        // Exclude requests that have already been combined
        whereClause.combinedRequestId = null;

        // If authenticated and has permission, show all combinable requests
        // If not authenticated, still allow viewing but don't enforce permission check
        if (userId && !canCombine) {
            return res.status(403).json({
                message: 'Access denied. Only procurement officers and procurement managers can view combinable requests for combining.',
                code: 'INSUFFICIENT_PERMISSIONS',
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
            })),
        }));

        res.json(transformedRequests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({
            error: 'Failed to fetch requests',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Combine multiple requests into one
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('[COMBINE] Received request body:', JSON.stringify(req.body, null, 2));
        const { title, description, items, originalRequestIds, combinationConfig, requiresApproval, totalEstimated, currency, priority, targetDepartment } = req.body;

        // Validate required fields
        if (!title) {
            console.error('[COMBINE] Missing required field: title');
            return res.status(400).json({
                success: false,
                error: 'Missing required field: title',
                message: 'Combined request title is required',
            });
        }

        if (!originalRequestIds || !Array.isArray(originalRequestIds) || originalRequestIds.length === 0) {
            console.error('[COMBINE] Missing or invalid originalRequestIds:', originalRequestIds);
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid originalRequestIds',
                message: 'At least one request must be selected for combination',
            });
        }

        console.log('[COMBINE] Validated fields - title:', title, 'originalRequestIds:', originalRequestIds);

        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userRoles = authReq.user.roles || [];
        const userPermissions = authReq.user.permissions || ({} as any);

        // Get user role information for permission checking
        const userRoleInfo = checkUserRoles(userRoles);

        // Permission-first: allow via explicit permission; fallback to role flags
        const canCombine = Boolean((userPermissions as any)['request:combine']) || userRoleInfo.canCombineRequests;

        // Only procurement officers, procurement managers, and admins (or permission) can combine requests
        if (!canCombine) {
            return res.status(403).json({
                error: 'Access denied. Only procurement officers and procurement managers can combine requests.',
                code: 'INSUFFICIENT_PERMISSIONS',
            });
        }

        // Validate that user has permission to combine requests
        console.log('[COMBINE] Fetching original requests with IDs:', originalRequestIds);
        const originalRequests = await prisma.request.findMany({
            where: {
                id: { in: originalRequestIds },
                status: { in: ['DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'PROCUREMENT_REVIEW'] },
            },
            include: {
                department: { select: { name: true, id: true } },
                requester: { select: { name: true } },
            },
        });
        console.log('[COMBINE] Found', originalRequests.length, 'valid requests out of', originalRequestIds.length, 'requested');

        if (originalRequests.length !== originalRequestIds.length) {
            return res.status(400).json({
                error: 'Some requests cannot be combined or do not exist',
            });
        }

        // Check cross-department permissions - procurement users can combine across departments
        const departments = [...new Set(originalRequests.map((req) => req.department?.name))];

        if (departments.length > 1 && !(canCombine || userRoleInfo.isProcurementOfficer || userRoleInfo.isProcurementManager || userRoleInfo.isAdmin)) {
            return res.status(403).json({
                error: 'Cross-department combination requires procurement officer or manager permissions',
            });
        }

        // Create combined request
        const result = await prisma.$transaction(async (tx) => {
            // Generate unique reference for combined request
            const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
            const reference = `CMB-${timestamp}`;

            // Create the CombinedRequest parent record
            const combinedRequestParent = await (tx as any).combinedRequest.create({
                data: {
                    reference,
                    title,
                    description,
                    config: combinationConfig || {},
                    createdBy: userId,
                },
            });

            // Convert original requests into numbered lots
            let lotNumber = 1;
            const lots = [];

            for (const originalRequest of originalRequests) {
                // Update the original request to be a lot in the combined request
                const lot = await tx.request.update({
                    where: { id: originalRequest.id },
                    data: {
                        isCombined: true,
                        combinedRequestId: combinedRequestParent.id,
                        lotNumber: lotNumber,
                        status: 'PROCUREMENT_REVIEW', // Keep them active for evaluation
                        // Update title to include LOT designation
                        title: `LOT-${lotNumber}: ${originalRequest.title}`,
                    } as any, // Type assertion needed until Prisma client is regenerated
                });

                lots.push(lot);
                lotNumber++;
            }

            // Create audit log for combination
            await tx.requestAction.create({
                data: {
                    requestId: lots[0].id, // Log on first lot
                    performedById: userId,
                    action: 'COMMENT',
                    comment: `Created combined request ${reference} with ${lots.length} lots: ${originalRequests.map((r, idx) => `LOT-${idx + 1} (${r.reference})`).join(', ')}`,
                },
            });

            // Add individual audit logs for each lot
            for (let i = 0; i < lots.length; i++) {
                await tx.requestAction.create({
                    data: {
                        requestId: lots[i].id,
                        performedById: userId,
                        action: 'COMMENT',
                        comment: `Converted to LOT-${i + 1} in combined request ${reference}`,
                    },
                });
            }

            return { combinedRequestParent, lots };
        });

        // Log the combination for analytics
        console.log(`User ${userId} combined ${originalRequestIds.length} requests into ${result.combinedRequestParent.reference}`, {
            originalRequestIds,
            combinedRequestId: result.combinedRequestParent.id,
            lotsCreated: result.lots.length,
        });

        // Calculate total value across all lots
        const totalValue = result.lots.reduce((sum, lot) => {
            const lotValue = Number(lot.totalEstimated || 0);
            return sum + lotValue;
        }, 0);

        // Check if combined request exceeds thresholds and notify procurement officers
        try {
            const procurementTypes = items.map((item: any) => item.procurementType).filter(Boolean);
            const requestCurrency = currency || 'JMD';
            const thresholdResult = checkProcurementThresholds(totalValue, procurementTypes, requestCurrency);

            if (thresholdResult.requiresExecutiveApproval) {
                console.log(`[COMBINE] Combined request ${result.combinedRequestParent.reference} exceeds threshold, notifying procurement officers`);

                // Send notifications to procurement officers
                await createThresholdNotifications({
                    requestId: result.lots[0].id, // Use first lot ID for notification
                    requestReference: result.combinedRequestParent.reference,
                    requestTitle: title,
                    requesterName: originalRequests[0]?.requester?.name || 'Unknown',
                    departmentName: originalRequests[0]?.department?.name || 'Multiple Departments',
                    totalValue,
                    currency: requestCurrency,
                    thresholdAmount: thresholdResult.thresholdAmount,
                    category: thresholdResult.category,
                });

                console.log(`[COMBINE] Threshold notifications sent for combined request ${result.combinedRequestParent.reference}`);
            }
        } catch (notificationError) {
            // Don't fail the combination if notifications fail
            console.error('[COMBINE] Failed to send threshold notifications:', notificationError);
        }

        res.json({
            success: true,
            message: 'Requests combined successfully into numbered lots',
            combinedRequest: {
                id: result.combinedRequestParent.id,
                reference: result.combinedRequestParent.reference,
                title: result.combinedRequestParent.title,
                lotsCount: result.lots.length,
                lots: result.lots.map((lot, idx) => ({
                    id: lot.id,
                    reference: lot.reference,
                    lotNumber: idx + 1,
                    title: lot.title,
                })),
            },
            originalRequestIds,
        });
    } catch (error) {
        console.error('[COMBINE] Error combining requests:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[COMBINE] Error details:', errorMessage);
        res.status(500).json({
            success: false,
            error: 'Failed to combine requests',
            message: errorMessage,
            details: error instanceof Error ? error.stack : undefined,
        });
    }
});

// Get combined request details with all lots
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];
        const userPermissions = authReq.user.permissions || ({} as any);

        const userRoleInfo = checkUserRoles(userRoles);

        const canCombine = Boolean((userPermissions as any)['request:combine']) || userRoleInfo.canCombineRequests;

        if (!canCombine) {
            return res.status(403).json({
                error: 'Access denied',
                code: 'INSUFFICIENT_PERMISSIONS',
            });
        }

        const combinedRequest = await (prisma as any).combinedRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                lots: {
                    include: {
                        department: { select: { name: true, id: true } },
                        requester: { select: { name: true, email: true } },
                        items: {
                            select: {
                                id: true,
                                description: true,
                                quantity: true,
                                unitPrice: true,
                                totalPrice: true,
                                accountCode: true,
                                unitOfMeasure: true,
                            },
                        },
                    },
                    orderBy: { lotNumber: 'asc' },
                },
                evaluations: {
                    select: {
                        id: true,
                        evalNumber: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!combinedRequest) {
            return res.status(404).json({
                error: 'Combined request not found',
            });
        }

        // Calculate totals
        const totalValue = combinedRequest.lots.reduce((sum: number, lot: any) => {
            return sum + Number(lot.totalEstimated || 0);
        }, 0);

        const totalItems = combinedRequest.lots.reduce((sum: number, lot: any) => {
            return sum + lot.items.length;
        }, 0);

        res.json({
            ...combinedRequest,
            totalValue,
            totalItems,
            lotsCount: combinedRequest.lots.length,
        });
    } catch (error) {
        console.error('Error fetching combined request:', error);
        res.status(500).json({
            error: 'Failed to fetch combined request',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
