import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prismaClient.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

const router = Router();

// Middleware to verify HOD role
const verifyHOD = (req: Request, res: Response, next: NextFunction) => {
    const userRoles = (req as any).user?.roles || [];
    if (!userRoles.includes('HEAD_OF_DIVISION')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. HEAD_OF_DIVISION role required.',
        });
    }
    next();
};

/**
 * GET /api/v1/departments
 * Fetch departments for the HOD (filtered by HOD's division)
 */
router.get(
    '/departments',
    authMiddleware,
    verifyHOD,
    asyncHandler(async (req: Request, res: Response) => {
        const hodId = (req as any).user?.sub;
        const division = req.query.division as string;

        logger.info(`Fetching departments for HOD ${hodId}, division: ${division}`);

        // Get HOD's department first
        const hodUser = await prisma.user.findUnique({
            where: { id: hodId as any },
            include: { department: true },
        });

        if (!hodUser) {
            return res.status(404).json({
                success: false,
                message: 'HOD user not found',
            });
        }

        // Fetch departments - either filter by specific division or HOD's division
        const departments = await prisma.department.findMany({
            where: {
                id: division ? parseInt(division) : hodUser.departmentId || undefined,
            },
            include: {
                manager: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Format response
        const formattedDepartments = departments.map((dept: any) => ({
            id: dept.id.toString(),
            name: dept.name,
            code: dept.code,
            head: dept.manager?.name || 'Unassigned',
            status: 'Active',
            createdAt: new Date().toISOString(),
        }));

        res.json({
            success: true,
            departments: formattedDepartments,
            count: formattedDepartments.length,
        });
    })
);

/**
 * GET /api/v1/users
 * Fetch users in HOD's department/division
 */
router.get(
    '/users',
    authMiddleware,
    verifyHOD,
    asyncHandler(async (req: Request, res: Response) => {
        const hodId = (req as any).user?.sub;
        const department = req.query.department as string;
        const excludeRole = req.query.excludeRole as string;

        logger.info(`Fetching users for HOD ${hodId}, department: ${department}`);

        // Get HOD's department
        const hodUser = await prisma.user.findUnique({
            where: { id: hodId as any },
            include: { department: true },
        });

        if (!hodUser) {
            return res.status(404).json({
                success: false,
                message: 'HOD user not found',
            });
        }

        // Fetch users in the same department
        const users = await prisma.user.findMany({
            where: {
                departmentId: department ? parseInt(department) : hodUser.departmentId || undefined,
            },
            include: {
                department: {
                    select: {
                        name: true,
                    },
                },
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Format response
        const formattedUsers = users.map((user: any) => ({
            id: user.id.toString(),
            name: user.name || user.email,
            email: user.email,
            role: user.roles?.[0]?.role?.name || 'Requester',
            department: user.department?.name || 'Unknown',
            status: 'Active',
            createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
            lastActive: user.updatedAt?.toISOString(),
        }));

        res.json({
            success: true,
            users: formattedUsers,
            count: formattedUsers.length,
        });
    })
);

/**
 * GET /api/v1/dashboard-stats
 * Fetch comprehensive dashboard statistics for HOD
 */
router.get(
    '/dashboard-stats',
    authMiddleware,
    verifyHOD,
    asyncHandler(async (req: Request, res: Response) => {
        const hodId = (req as any).user?.sub;

        logger.info(`Fetching dashboard stats for HOD ${hodId}`);

        // Get HOD's department
        const hodUser = await prisma.user.findUnique({
            where: { id: hodId as any },
            include: { department: true },
        });

        if (!hodUser) {
            return res.status(404).json({
                success: false,
                message: 'HOD user not found',
            });
        }

        const departmentId = hodUser.departmentId;

        // 1. Total requests count
        const totalRequests = await prisma.request.count({
            where: departmentId ? { departmentId } : undefined,
        });

        // 2. Pending approvals count (requests at HOD_REVIEW status)
        const pendingApprovals = await prisma.request.count({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: 'HOD_REVIEW',
            },
        });

        // 3. Approved requests count
        const approvedRequests = await prisma.request.count({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: {
                    in: ['FINANCE_REVIEW', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'],
                },
            },
        });

        // 4. Rejected requests count
        const rejectedRequests = await prisma.request.count({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: 'REJECTED',
            },
        });

        // 5. Budget statistics
        const budgetStats = await prisma.request.aggregate({
            where: departmentId ? { departmentId } : undefined,
            _sum: {
                totalEstimated: true,
            },
        });

        const approvedBudget = await prisma.request.aggregate({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: {
                    in: ['FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'],
                },
            },
            _sum: {
                totalEstimated: true,
            },
        });

        const pendingBudget = await prisma.request.aggregate({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: 'HOD_REVIEW',
            },
            _sum: {
                totalEstimated: true,
            },
        });

        // 6. Department count
        const departmentCount = await prisma.department.count();

        // 7. Active users in the department
        const activeUsers = await prisma.user.count({
            where: departmentId ? { departmentId } : undefined,
        });

        // 8. Average approval time (in days) - calculate from actionDate
        const approvedWithDates = await prisma.request.findMany({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: {
                    in: ['FINANCE_REVIEW', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'],
                },
                actionDate: { not: null },
                createdAt: { not: null },
            },
            select: {
                createdAt: true,
                actionDate: true,
            },
        });

        const averageApprovalTime =
            approvedWithDates.length > 0
                ? approvedWithDates.reduce((sum, req) => {
                      const days = Math.floor((req.actionDate!.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                      return sum + days;
                  }, 0) / approvedWithDates.length
                : 0;

        // 9. Trend data (submissions and approvals over last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            date.setHours(0, 0, 0, 0);
            return date;
        });

        const trendSubmissions = await Promise.all(
            last7Days.map(async (date) => {
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                return await prisma.request.count({
                    where: {
                        ...(departmentId ? { departmentId } : {}),
                        createdAt: {
                            gte: date,
                            lt: nextDay,
                        },
                    },
                });
            })
        );

        const trendApprovals = await Promise.all(
            last7Days.map(async (date) => {
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                return await prisma.request.count({
                    where: {
                        ...(departmentId ? { departmentId } : {}),
                        actionDate: {
                            gte: date,
                            lt: nextDay,
                        },
                        status: {
                            in: ['FINANCE_REVIEW', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'],
                        },
                    },
                });
            })
        );

        // 10. Department performance
        const departments = await prisma.department.findMany({
            select: {
                name: true,
                requests: {
                    select: {
                        status: true,
                    },
                },
            },
        });

        const departmentPerformance = departments.map((dept) => ({
            name: dept.name,
            pending: dept.requests.filter((r) => r.status === 'HOD_REVIEW').length,
            approved: dept.requests.filter((r) => ['FINANCE_REVIEW', 'FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'].includes(r.status)).length,
        }));

        res.json({
            success: true,
            stats: {
                totalRequests,
                pendingApprovals,
                approvedRequests,
                rejectedRequests,
                totalBudgetRequested: Number(budgetStats._sum.totalEstimated || 0),
                approvedAmount: Number(approvedBudget._sum.totalEstimated || 0),
                pendingAmount: Number(pendingBudget._sum.totalEstimated || 0),
                departmentCount,
                activeUsers,
                averageApprovalTime: Math.round(averageApprovalTime * 10) / 10,
                trendSubmissions,
                trendApprovals,
                departmentPerformance,
            },
            timestamp: new Date().toISOString(),
        });
    })
);

/**
 * GET /api/v1/pending-approvals
 * Fetch pending approval requests for HOD
 */
router.get(
    '/pending-approvals',
    authMiddleware,
    verifyHOD,
    asyncHandler(async (req: Request, res: Response) => {
        const hodId = (req as any).user?.sub;
        const limit = parseInt(req.query.limit as string) || 10;

        logger.info(`Fetching pending approvals for HOD ${hodId}`);

        // Get HOD's department
        const hodUser = await prisma.user.findUnique({
            where: { id: hodId as any },
            include: { department: true },
        });

        if (!hodUser) {
            return res.status(404).json({
                success: false,
                message: 'HOD user not found',
            });
        }

        const departmentId = hodUser.departmentId;

        // Fetch pending requests at HOD_REVIEW stage
        const pendingRequests = await prisma.request.findMany({
            where: {
                ...(departmentId ? { departmentId } : {}),
                status: 'HOD_REVIEW',
            },
            include: {
                department: {
                    select: {
                        name: true,
                    },
                },
                assignedUser: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });

        const formattedRequests = pendingRequests.map((req) => ({
            id: req.id.toString(),
            title: req.title,
            department: req.department?.name || 'Unknown',
            requester: req.assignedUser?.name || req.assignedUser?.email || 'Unknown',
            status: req.status,
            amount: Number(req.totalEstimated || 0),
            submitDate: req.createdAt.toISOString(),
        }));

        res.json({
            success: true,
            requests: formattedRequests,
            count: formattedRequests.length,
        });
    })
);

/**
 * GET /api/v1/reports
 * Fetch reports for HOD's division (real data from requests)
 */
router.get(
    '/reports',
    authMiddleware,
    verifyHOD,
    asyncHandler(async (req: Request, res: Response) => {
        const hodId = (req as any).user?.sub;
        const division = req.query.division as string;

        logger.info(`Fetching reports for HOD ${hodId}, division: ${division}`);

        // Get HOD's department
        const hodUser = await prisma.user.findUnique({
            where: { id: hodId as any },
            include: { department: true },
        });

        if (!hodUser) {
            return res.status(404).json({
                success: false,
                message: 'HOD user not found',
            });
        }

        // Get real report data from requests and related tables
        const departmentId = division ? parseInt(division) : hodUser.departmentId;

        // Request statistics by status
        const requestsByStatus = await prisma.request.groupBy({
            by: ['status'],
            where: {
                departmentId: departmentId || undefined,
            },
            _count: {
                id: true,
            },
        });

        // Total spending by department
        const totalSpending = await prisma.request.aggregate({
            where: {
                departmentId: departmentId || undefined,
                status: {
                    in: ['FINANCE_APPROVED', 'SENT_TO_VENDOR', 'CLOSED'],
                },
            },
            _sum: {
                totalEstimated: true,
            },
        });

        // Recent requests
        const recentRequests = await prisma.request.findMany({
            where: {
                departmentId: departmentId || undefined,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
            select: {
                reference: true,
                title: true,
                status: true,
                totalEstimated: true,
                createdAt: true,
            },
        });

        // Generate report objects based on real data
        const currentDate = new Date();
        const reports = [
            {
                id: '1',
                title: `Procurement Summary - ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                type: 'Procurement Summary',
                generatedBy: hodUser.name || hodUser.email,
                period: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                status: 'Completed',
                createdAt: currentDate.toISOString(),
                data: {
                    requestsByStatus: requestsByStatus.map((item) => ({
                        status: item.status,
                        count: item._count.id,
                    })),
                    totalSpending: Number(totalSpending._sum.totalEstimated || 0),
                    recentRequests: recentRequests.map((req) => ({
                        reference: req.reference,
                        title: req.title,
                        status: req.status,
                        amount: Number(req.totalEstimated || 0),
                        date: req.createdAt.toISOString(),
                    })),
                },
            },
        ];

        res.json({
            success: true,
            reports,
            count: reports.length,
        });
    })
);
                title: 'Department Performance Analysis',
                type: 'Performance Report',
                generatedBy: 'Michael Chen',
                period: 'November - December 2024',
                status: 'In Progress',
                createdAt: new Date('2024-12-06').toISOString(),
            },
            {
                id: '4',
                title: 'Supplier Performance Metrics',
                type: 'Supplier Report',
                generatedBy: 'Alice Johnson',
                period: 'Q4 2024',
                status: 'Completed',
                createdAt: new Date('2024-12-02').toISOString(),
                fileUrl: '/reports/supplier-q4-2024.pdf',
            },
        ];

        res.json({
            success: true,
            reports: mockReports,
            count: mockReports.length,
            note: 'Reports are using mock data. Create a reports table in Prisma schema to enable database integration.',
        });
    })
);

export default router;
