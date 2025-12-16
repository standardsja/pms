/**
 * Role Request Service
 * Handles business logic for role assignment requests
 */

import { prisma } from '../prismaClient.js';

// Type for role request status (matches Prisma enum)
type RoleRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface CreateRoleRequestInput {
    userId: number;
    departmentId?: number;
    role: string; // e.g., PROCUREMENT_OFFICER, PROCUREMENT_MANAGER
    module: string; // e.g., procurement, budgeting
    reason?: string;
}

export interface ApproveRoleRequestInput {
    roleRequestId: number;
    approvedById: number;
    notes?: string;
    expiresAt?: Date;
}

export interface RejectRoleRequestInput {
    roleRequestId: number;
    approvedById: number;
    notes: string;
}

export class RoleRequestService {
    /**
     * Create a new role request
     * User is requesting a specific role for a module
     */
    async createRoleRequest(input: CreateRoleRequestInput) {
        const { userId, departmentId, role, module, reason } = input;

        // Check if user already has a pending request for this role/module
        const existingRequest = await prisma.roleRequest.findFirst({
            where: {
                userId,
                role,
                module,
                status: 'PENDING',
            },
        });

        if (existingRequest) {
            throw new Error(`You already have a pending request for ${role} in ${module}`);
        }

        // Check if user already has an approved request for this role/module
        const approvedRequest = await prisma.roleRequest.findFirst({
            where: {
                userId,
                role,
                module,
                status: 'APPROVED',
            },
        });

        if (approvedRequest) {
            throw new Error(`You already have access to ${role} in ${module}`);
        }

        // Create the request
        const roleRequest = await prisma.roleRequest.create({
            data: {
                userId,
                departmentId,
                role,
                module,
                reason,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Create notifications for administrators so they can review the request
        try {
            // Find admin users (ADMIN, ADMINISTRATOR, SUPER_ADMIN)
            const admins = await prisma.user.findMany({
                where: {
                    roles: {
                        some: {
                            role: {
                                OR: [{ name: { in: ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'] } }, { name: { contains: 'ADMIN' } }],
                            },
                        },
                    },
                },
                select: { id: true, email: true, name: true },
            });

            if (admins.length > 0) {
                const message = `${roleRequest.user?.name || roleRequest.user.email} requested access: ${roleRequest.role} (${roleRequest.module})`;

                const notifications = admins.map((a: typeof admins[number]) => ({
                    userId: a.id,
                    type: 'ROLE_REQUEST' as any,
                    message,
                    data: JSON.stringify({
                        roleRequestId: roleRequest.id,
                        requesterId: roleRequest.user?.id,
                        requesterName: roleRequest.user?.name,
                        role: roleRequest.role,
                        module: roleRequest.module,
                        department: roleRequest.department?.name || null,
                        reason: roleRequest.reason || null,
                    }),
                }));

                await prisma.notification.createMany({ data: notifications });
            } else {
                // No admins found - log a warning
                console.warn('No admin users found to notify about role request', { roleRequestId: roleRequest.id });
            }
        } catch (notifErr) {
            console.error('Failed to create admin notifications for role request:', notifErr);
            // Do not fail role request creation if notifications fail
        }

        return roleRequest;
    }

    /**
     * Get all pending role requests (for admins)
     */
    async getPendingRoleRequests(filters?: { status?: RoleRequestStatus; module?: string; departmentId?: number }) {
        const roleRequests = await prisma.roleRequest.findMany({
            where: {
                status: filters?.status || 'PENDING',
                ...(filters?.module && { module: filters.module }),
                ...(filters?.departmentId && { departmentId: filters.departmentId }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return roleRequests;
    }

    /**
     * Get role requests for a specific user
     */
    async getUserRoleRequests(userId: number) {
        const roleRequests = await prisma.roleRequest.findMany({
            where: {
                userId,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return roleRequests;
    }

    /**
     * Approve a role request
     * Admin approves, optionally grants role to user
     */
    async approveRoleRequest(input: ApproveRoleRequestInput, grantRoleImmediately: boolean = true) {
        const { roleRequestId, approvedById, notes, expiresAt } = input;

        // Get the role request
        const roleRequest = await prisma.roleRequest.findUnique({
            where: { id: roleRequestId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!roleRequest) {
            throw new Error('Role request not found');
        }

        if (roleRequest.status !== 'PENDING') {
            throw new Error(`Cannot approve request with status: ${roleRequest.status}`);
        }

        // Update the request status
        const updatedRequest = await prisma.roleRequest.update({
            where: { id: roleRequestId },
            data: {
                status: 'APPROVED',
                approvedById,
                approvedAt: new Date(),
                notes,
                expiresAt,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        // Optionally grant the role to the user immediately
        if (grantRoleImmediately) {
            await this.grantRoleToUser(roleRequest.user.id, roleRequest.role, expiresAt);
        }

        return updatedRequest;
    }

    /**
     * Reject a role request
     */
    async rejectRoleRequest(input: RejectRoleRequestInput) {
        const { roleRequestId, approvedById, notes } = input;

        // Get the role request
        const roleRequest = await prisma.roleRequest.findUnique({
            where: { id: roleRequestId },
        });

        if (!roleRequest) {
            throw new Error('Role request not found');
        }

        if (roleRequest.status !== 'PENDING') {
            throw new Error(`Cannot reject request with status: ${roleRequest.status}`);
        }

        // Update the request status
        const updatedRequest = await prisma.roleRequest.update({
            where: { id: roleRequestId },
            data: {
                status: 'REJECTED',
                approvedById,
                rejectedAt: new Date(),
                notes,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        return updatedRequest;
    }

    /**
     * Cancel a role request (user cancels their own request)
     */
    async cancelRoleRequest(roleRequestId: number, userId: number) {
        const roleRequest = await prisma.roleRequest.findUnique({
            where: { id: roleRequestId },
        });

        if (!roleRequest) {
            throw new Error('Role request not found');
        }

        if (roleRequest.userId !== userId) {
            throw new Error('You can only cancel your own requests');
        }

        if (roleRequest.status !== 'PENDING') {
            throw new Error(`Cannot cancel request with status: ${roleRequest.status}`);
        }

        const updatedRequest = await prisma.roleRequest.update({
            where: { id: roleRequestId },
            data: {
                status: 'CANCELLED',
            },
        });

        return updatedRequest;
    }

    /**
     * Grant a role to a user (internal method)
     * Adds the role to the user's roles via UserRole
     */
    private async grantRoleToUser(userId: number, roleName: string, expiresAt?: Date) {
        // Find the role by name
        let role = await prisma.role.findUnique({
            where: { name: roleName },
        });

        // If role doesn't exist, create it
        if (!role) {
            role = await prisma.role.create({
                data: {
                    name: roleName,
                    description: `Auto-created role: ${roleName}`,
                },
            });
        }

        // Check if user already has this role
        const existingUserRole = await prisma.userRole.findFirst({
            where: {
                userId,
                roleId: role.id,
            },
        });

        if (!existingUserRole) {
            await prisma.userRole.create({
                data: {
                    userId,
                    roleId: role.id,
                },
            });
        }

        return role;
    }

    /**
     * Get dashboard stats for admins
     */
    async getAdminDashboardStats() {
        const [pendingCount, approvedCount, rejectedCount, totalCount, byModule, byRole, recentRequests] = await Promise.all([
            prisma.roleRequest.count({
                where: { status: 'PENDING' },
            }),
            prisma.roleRequest.count({
                where: { status: 'APPROVED' },
            }),
            prisma.roleRequest.count({
                where: { status: 'REJECTED' },
            }),
            prisma.roleRequest.count(),
            prisma.roleRequest.groupBy({
                by: ['module'],
                where: { status: 'PENDING' },
                _count: true,
            }),
            prisma.roleRequest.groupBy({
                by: ['role'],
                where: { status: 'PENDING' },
                _count: true,
            }),
            prisma.roleRequest.findMany({
                where: { status: 'PENDING' },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            email: true,
                            name: true,
                        },
                    },
                },
            }),
        ]);

        return {
            pendingCount,
            approvedCount,
            rejectedCount,
            totalCount,
            byModule: byModule.map((item: any) => ({
                module: item.module,
                count: item._count,
            })),
            byRole: byRole.map((item: any) => ({
                role: item.role,
                count: item._count,
            })),
            recentRequests,
        };
    }

    /**
     * Verify if user has approved access to a role/module
     */
    async hasApprovedAccess(userId: number, role: string, module: string): Promise<boolean> {
        const approvedRequest = await prisma.roleRequest.findFirst({
            where: {
                userId,
                role,
                module,
                status: 'APPROVED',
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }, // Not expired
                ],
            },
        });

        return !!approvedRequest;
    }
}

export const roleRequestService = new RoleRequestService();
