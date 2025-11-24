import { Router } from 'express';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get combinable requests
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { combinable } = req.query;
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userRoles = authReq.user.roles || [];

        let whereClause: any = {};

        // Only include requests that can be combined
        if (combinable === 'true') {
            whereClause.status = {
                in: ['DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'PROCUREMENT_REVIEW'],
            };
        }

        // Role-based filtering
        if (userRoles.includes('Procurement Officer') || userRoles.includes('Procurement Manager')) {
            // Procurement users can see all combinable requests
        } else if (userRoles.includes('Department Head')) {
            // Department heads can only see requests from their department
            whereClause.department = {
                name: authReq.user.department_name,
            };
        } else {
            // Regular users can only see their own requests
            whereClause.requesterId = userId;
        }

        const requests = await prisma.request.findMany({
            where: whereClause,
            include: {
                requester: {
                    select: { full_name: true },
                },
                department: {
                    select: { name: true },
                },
                items: {
                    select: {
                        description: true,
                        quantity: true,
                        unit_cost: true,
                        total_cost: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Transform to match frontend interface
        const transformedRequests = requests.map((request) => ({
            id: request.id,
            reference: request.reference,
            title: request.title,
            description: request.description,
            department: request.department?.name || 'Unknown',
            requestedBy: request.requester.full_name,
            totalEstimated: Number(request.totalEstimated || 0),
            currency: request.currency || 'USD',
            priority: request.priority || 'MEDIUM',
            status: request.status,
            createdAt: request.createdAt.toISOString(),
            items: request.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitCost: Number(item.unit_cost),
                totalCost: Number(item.total_cost),
            })),
        }));

        res.json(transformedRequests);
    } catch (error) {
        console.error('Error fetching combinable requests:', error);
        res.status(500).json({
            error: 'Failed to fetch combinable requests',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Combine multiple requests into one
router.post('/combine', authMiddleware, async (req, res) => {
    try {
        const { title, description, items, originalRequestIds, combinationConfig, requiresApproval, totalEstimated, currency, priority, targetDepartment } = req.body;
        
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userRoles = authReq.user.roles || [];

        // Validate that user has permission to combine requests
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

        if (originalRequests.length !== originalRequestIds.length) {
            return res.status(400).json({
                error: 'Some requests cannot be combined or do not exist',
            });
        }

        // Check permissions
        const departments = [...new Set(originalRequests.map((req) => req.department?.name))];
        const isProcurementUser = userRoles.includes('Procurement Officer') || userRoles.includes('Procurement Manager');

        if (!isProcurementUser && departments.length > 1) {
            return res.status(403).json({
                error: 'Only procurement users can combine requests from multiple departments',
            });
        }

        // Find target department
        let departmentId: number | null = null;
        if (targetDepartment) {
            const dept = await prisma.department.findFirst({
                where: { name: targetDepartment },
            });
            departmentId = dept?.id || null;
        }

        // Generate unique reference
        const referencePrefix = 'CMB';
        const timestamp = Date.now().toString().slice(-6);
        const reference = `${referencePrefix}-${timestamp}`;

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the combined request
            const combinedRequest = await tx.request.create({
                data: {
                    reference,
                    title,
                    description,
                    requesterId: userId,
                    departmentId: departmentId || originalRequests[0].departmentId,
                    totalEstimated: totalEstimated,
                    currency: currency || 'USD',
                    priority: priority || 'MEDIUM',
                    status: requiresApproval ? 'DEPARTMENT_REVIEW' : 'SUBMITTED',
                    procurementType: JSON.stringify(['combined']),
                },
            });

            // Create items for the combined request
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

            // Update original requests status to indicate they've been combined
            await tx.request.updateMany({
                where: { id: { in: originalRequestIds } },
                data: {
                    status: 'CLOSED',
                    description: {
                        set: `[COMBINED INTO ${reference}] Original request combined with others for improved efficiency.`,
                    },
                },
            });

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
            originalRequests: originalRequests.map((r) => r.reference),
            totalValue: totalEstimated,
            departments: departments.length,
            requiresApproval,
        });

        res.json({
            success: true,
            id: result.id,
            reference: result.reference,
            message: requiresApproval ? 'Combined request created and submitted for approval' : 'Requests successfully combined',
            originalRequests: originalRequests.map((r) => r.reference),
        });
    } catch (error) {
        console.error('Error combining requests:', error);
        res.status(500).json({
            error: 'Failed to combine requests',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/* 
// Get combination history/analytics - DISABLED due to schema issues
router.get('/analytics', authMiddleware, async (req: AuthenticatedRequest, res) => {
    // This route has database schema issues - disabled for now
    return res.status(501).json({ error: 'Analytics temporarily unavailable' });
});
*/
                        currency: true,
                        createdAt: true,
                    },
                },
                user: {
                    select: { full_name: true },
                },
            },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        // Calculate statistics
        const totalCombinations = combinationActions.length;
        const totalValueCombined = combinationActions.reduce((sum, action) => sum + Number(action.request.totalEstimated || 0), 0);

        // Group by month for trends
        const monthlyData = combinationActions.reduce((acc, action) => {
            const month = action.created_at.toISOString().slice(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { count: 0, value: 0 };
            }
            acc[month].count++;
            acc[month].value += Number(action.request.totalEstimated || 0);
            return acc;
        }, {} as Record<string, { count: number; value: number }>);

        res.json({
            summary: {
                totalCombinations,
                totalValueCombined,
                averageValuePerCombination: totalCombinations > 0 ? totalValueCombined / totalCombinations : 0,
            },
            recentCombinations: combinationActions.slice(0, 10).map((action) => ({
                reference: action.request.reference,
                combinedBy: action.user.full_name,
                value: action.request.totalEstimated,
                currency: action.request.currency,
                date: action.created_at,
                notes: action.notes,
            })),
            monthlyTrends: Object.entries(monthlyData)
                .map(([month, data]) => ({
                    month,
                    combinations: data.count,
                    totalValue: data.value,
                }))
                .sort((a, b) => a.month.localeCompare(b.month)),
        });
    } catch (error) {
        console.error('Error fetching combination analytics:', error);
        res.status(500).json({
            error: 'Failed to fetch analytics',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
