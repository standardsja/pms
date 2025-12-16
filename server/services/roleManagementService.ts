/**
 * Role Management Service
 *
 * Centralized service for all role operations (assignment, removal, detection)
 * Ensures all role changes are properly logged and notified
 * Uses UserRole table as source of truth
 */

import { prisma } from '../prismaClient.js';
import { auditService } from './auditService.js';
import { logger } from '../config/logger.js';

export interface AssignRoleInput {
    userId: number;
    roleNames: string[];
    assignedBy: number;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

export interface RemoveRoleInput {
    userId: number;
    roleNames: string[];
    removedBy: number;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

export interface DetectRolesInput {
    userId: number;
    includeExpired?: boolean;
}

export interface RoleAssignmentResult {
    userId: number;
    assignedRoles: string[];
    skippedRoles: string[];
    auditLogIds: number[];
}

export interface RoleRemovalResult {
    userId: number;
    removedRoles: string[];
    notFoundRoles: string[];
    auditLogIds: number[];
}

export interface DetectedRolesResult {
    userId: number;
    roles: Array<{
        id: number;
        name: string;
        description?: string;
    }>;
    totalCount: number;
}

/**
 * Role Management Service
 */
class RoleManagementService {
    /**
     * Assign one or more roles to a user
     * - Validates role existence
     * - Prevents duplicate assignments
     * - Logs each assignment in audit trail
     * - Sends notifications
     */
    async assignRoles(input: AssignRoleInput): Promise<RoleAssignmentResult> {
        const { userId, roleNames, assignedBy, reason, ipAddress, userAgent, metadata } = input;

        logger.info('Assigning roles to user', {
            userId,
            roleNames,
            assignedBy,
            reason,
        });

        // Validate user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        // Validate assigner has permission (ADMIN or same user)
        const assigner = await prisma.user.findUnique({
            where: { id: assignedBy },
            include: { roles: { include: { role: true } } },
        });

        if (!assigner) {
            throw new Error(`Assigner with ID ${assignedBy} not found`);
        }

        const assignerRoles = assigner.roles.map((r: typeof assigner.roles[number]) => r.role.name);
        const isAdmin = assignerRoles.includes('ADMIN');

        if (!isAdmin && assignedBy !== userId) {
            throw new Error('Only admins can assign roles to other users');
        }

        // Get all role records
        const allRoles = await prisma.role.findMany({
            where: { name: { in: roleNames } },
        });

        if (allRoles.length === 0) {
            throw new Error(`No valid roles found: ${roleNames.join(', ')}`);
        }

        const validRoleNames = allRoles.map((r: typeof allRoles[number]) => r.name);
        const skippedRoles: string[] = [];
        const assignedRoles: string[] = [];
        const auditLogIds: number[] = [];

        // Get current user roles
        const currentRoleNames = user.roles.map((r: typeof user.roles[number]) => r.role.name);

        // Assign each role
        for (const role of allRoles) {
            try {
                // Skip if user already has this role
                if (currentRoleNames.includes(role.name)) {
                    skippedRoles.push(role.name);
                    logger.info('User already has role, skipping', {
                        userId,
                        roleName: role.name,
                    });
                    continue;
                }

                // Create UserRole assignment
                const userRole = await prisma.userRole.create({
                    data: {
                        userId,
                        roleId: role.id,
                    },
                });

                assignedRoles.push(role.name);

                // Audit log
                const auditData = {
                    userId: assignedBy,
                    action: 'ROLE_ASSIGNED' as const,
                    entity: 'User',
                    entityId: userId,
                    message: `Role ${role.name} assigned to user ${user.email} by admin`,
                    ipAddress,
                    userAgent,
                    metadata: {
                        ...metadata,
                        targetUserId: userId,
                        targetUserEmail: user.email,
                        roleName: role.name,
                        reason,
                        assignedBy,
                        timestamp: new Date().toISOString(),
                    },
                };

                const auditLog = await auditService.createAuditLog(auditData);
                if (auditLog?.id) {
                    auditLogIds.push(auditLog.id);
                }

                logger.info('Role assigned successfully', {
                    userId,
                    roleName: role.name,
                    auditLogId: auditLog?.id,
                });

                // Send notification to user
                if (userId !== assignedBy) {
                    try {
                        await prisma.notification.create({
                            data: {
                                userId,
                                type: 'ROLE_ASSIGNED' as any,
                                message: `You have been assigned the ${role.name} role`,
                                data: JSON.stringify({
                                    roleName: role.name,
                                    assignedBy: assigner.email,
                                    reason,
                                }),
                            },
                        });
                    } catch (err) {
                        logger.warn('Failed to send notification', {
                            userId,
                            error: (err as Error).message,
                        });
                    }
                }
            } catch (err) {
                logger.error('Failed to assign role', {
                    userId,
                    roleName: role.name,
                    error: (err as Error).message,
                });
                skippedRoles.push(role.name);
            }
        }

        return {
            userId,
            assignedRoles,
            skippedRoles,
            auditLogIds,
        };
    }

    /**
     * Remove one or more roles from a user
     * - Validates role existence
     * - Prevents removing non-existent assignments
     * - Logs each removal in audit trail
     * - Sends notifications
     */
    async removeRoles(input: RemoveRoleInput): Promise<RoleRemovalResult> {
        const { userId, roleNames, removedBy, reason, ipAddress, userAgent, metadata } = input;

        logger.info('Removing roles from user', {
            userId,
            roleNames,
            removedBy,
            reason,
        });

        // Validate user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        // Validate remover has permission (ADMIN only)
        const remover = await prisma.user.findUnique({
            where: { id: removedBy },
            include: { roles: { include: { role: true } } },
        });

        if (!remover) {
            throw new Error(`Remover with ID ${removedBy} not found`);
        }

        const removerRoles = remover.roles.map((r: typeof remover.roles[number]) => r.role.name);
        const isAdmin = removerRoles.includes('ADMIN');

        if (!isAdmin) {
            throw new Error('Only admins can remove roles');
        }

        // Get all role records
        const allRoles = await prisma.role.findMany({
            where: { name: { in: roleNames } },
        });

        if (allRoles.length === 0) {
            throw new Error(`No valid roles found: ${roleNames.join(', ')}`);
        }

        const removedRoles: string[] = [];
        const notFoundRoles: string[] = [];
        const auditLogIds: number[] = [];

        // Get current user roles
        const currentRoleNames = user.roles.map((r: typeof user.roles[number]) => r.role.name);

        // Remove each role
        for (const role of allRoles) {
            try {
                // Check if user has this role
                if (!currentRoleNames.includes(role.name)) {
                    notFoundRoles.push(role.name);
                    logger.info('User does not have role, skipping', {
                        userId,
                        roleName: role.name,
                    });
                    continue;
                }

                // Delete UserRole assignment
                await prisma.userRole.deleteMany({
                    where: {
                        userId,
                        roleId: role.id,
                    },
                });

                removedRoles.push(role.name);

                // Audit log
                const auditData = {
                    userId: removedBy,
                    action: 'ROLE_REMOVED' as const,
                    entity: 'User',
                    entityId: userId,
                    message: `Role ${role.name} removed from user ${user.email} by admin`,
                    ipAddress,
                    userAgent,
                    metadata: {
                        ...metadata,
                        targetUserId: userId,
                        targetUserEmail: user.email,
                        roleName: role.name,
                        reason,
                        removedBy,
                        timestamp: new Date().toISOString(),
                    },
                };

                const auditLog = await auditService.createAuditLog(auditData);
                if (auditLog?.id) {
                    auditLogIds.push(auditLog.id);
                }

                logger.info('Role removed successfully', {
                    userId,
                    roleName: role.name,
                    auditLogId: auditLog?.id,
                });

                // Send notification to user
                try {
                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'ROLE_REMOVED' as any,
                            message: `The ${role.name} role has been removed from your account`,
                            data: JSON.stringify({
                                roleName: role.name,
                                removedBy: remover.email,
                                reason,
                            }),
                        },
                    });
                } catch (err) {
                    logger.warn('Failed to send notification', {
                        userId,
                        error: (err as Error).message,
                    });
                }
            } catch (err) {
                logger.error('Failed to remove role', {
                    userId,
                    roleName: role.name,
                    error: (err as Error).message,
                });
                notFoundRoles.push(role.name);
            }
        }

        return {
            userId,
            removedRoles,
            notFoundRoles,
            auditLogIds,
        };
    }

    /**
     * Detect all roles for a user
     * Source of truth: UserRole table joined with Role table
     * Returns normalized role list suitable for RBAC checks
     */
    async detectRoles(input: DetectRolesInput): Promise<DetectedRolesResult> {
        const { userId, includeExpired } = input;

        logger.info('Detecting roles for user', {
            userId,
            includeExpired,
        });

        // Get user with all roles
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        // Extract role details
        const roles = user.roles.map((ur: typeof user.roles[number]) => ({
            id: ur.role.id,
            name: ur.role.name,
            description: ur.role.description,
        }));

        logger.info('Roles detected for user', {
            userId,
            roles: roles.map((r) => r.name),
            totalCount: roles.length,
        });

        return {
            userId,
            roles,
            totalCount: roles.length,
        };
    }

    /**
     * Check if user has a specific role
     * Used for quick permission checks
     */
    async hasRole(userId: number, roleName: string): Promise<boolean> {
        const userRole = await prisma.userRole.findFirst({
            where: {
                userId,
                role: {
                    name: {
                        equals: roleName,
                        mode: 'insensitive',
                    },
                },
            },
        });

        return Boolean(userRole);
    }

    /**
     * Check if user has any of the provided roles
     */
    async hasAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
        const userRole = await prisma.userRole.findFirst({
            where: {
                userId,
                role: {
                    name: {
                        in: roleNames,
                        mode: 'insensitive',
                    },
                },
            },
        });

        return Boolean(userRole);
    }

    /**
     * Check if user has all of the provided roles
     */
    async hasAllRoles(userId: number, roleNames: string[]): Promise<boolean> {
        const userRoles = await prisma.userRole.findMany({
            where: {
                userId,
                role: {
                    name: {
                        in: roleNames,
                        mode: 'insensitive',
                    },
                },
            },
        });

        return userRoles.length === roleNames.length;
    }
}

// Export singleton instance
export const roleManagementService = new RoleManagementService();
