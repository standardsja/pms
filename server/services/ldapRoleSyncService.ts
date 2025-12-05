/**
 * LDAP Role Sync Service
 *
 * Synchronizes AD group memberships to PMS roles and departments
 * Provides hybrid approach: AD groups + admin panel fallback
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { LDAPUser } from './ldapService';
import { getGroupMappings, findMappingsForGroups, mergeRoles, getFirstDepartment, GroupRoleMapping } from '../config/ldapGroupMapping';

const prisma = new PrismaClient();

export interface RoleSyncResult {
    rolesApplied: string[];
    departmentAssigned?: {
        id: string;
        name: string;
    };
    appliedFromADGroups: boolean;
    appliedFromAdminPanel: boolean;
}

/**
 * Sync LDAP user to database with roles and department
 *
 * Strategy:
 * 1. If user has AD group memberships, extract roles from mapping
 * 2. If no roles from AD groups, use admin-assigned roles (fallback)
 * 3. If no roles at all, assign REQUESTER as default
 * 4. If AD mapping specifies department, assign it; otherwise use admin-assigned
 */
export async function syncLDAPUserToDatabase(ldapUser: LDAPUser, existingUser?: any): Promise<RoleSyncResult> {
    const result: RoleSyncResult = {
        rolesApplied: [],
        appliedFromADGroups: false,
        appliedFromAdminPanel: false,
    };

    try {
        // Get or create user in database
        let dbUser = existingUser;
        if (!dbUser) {
            dbUser = await prisma.user.findUnique({
                where: { email: ldapUser.email },
                include: { roles: true, department: true },
            });
        }

        if (!dbUser) {
            logger.info('LDAP: Creating new user in database', { email: ldapUser.email });
            dbUser = await prisma.user.create({
                data: {
                    email: ldapUser.email,
                    name: ldapUser.name || ldapUser.email,
                    ldapDN: ldapUser.dn,
                    profileImage: ldapUser.profileImage,
                },
                include: { roles: true },
            });
        } else if (ldapUser.profileImage && !dbUser.profileImage) {
            // Update profile image from LDAP if user doesn't have one
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { profileImage: ldapUser.profileImage },
            });
            logger.info('LDAP: Profile image updated from LDAP', {
                email: ldapUser.email,
                profileImage: ldapUser.profileImage,
            });
        }

        // Get mapping rules
        const mappings = getGroupMappings();

        // Step 1: Extract AD groups and find matching mappings
        const userGroups = ldapUser.memberOf || [];
        const matchedMappings = findMappingsForGroups(userGroups, mappings);

        if (matchedMappings.length > 0) {
            logger.info('LDAP: User belongs to AD groups, applying mapped roles', {
                email: ldapUser.email,
                groupCount: userGroups.length,
                mappingCount: matchedMappings.length,
                groups: userGroups.slice(0, 3), // Log first 3 groups
            });

            // Extract unique roles from all matched mappings
            const adRoleNames = mergeRoles(...matchedMappings.map((m) => m.roles));

            // Get role records from database
            const roles = await prisma.role.findMany({
                where: { name: { in: adRoleNames } },
            });

            if (roles.length > 0) {
                // Clear existing roles (since AD groups are source of truth)
                await prisma.userRole.deleteMany({
                    where: { userId: dbUser.id },
                });

                // Assign new roles from AD groups
                await Promise.all(
                    roles.map((role) =>
                        prisma.userRole.create({
                            data: {
                                userId: dbUser.id,
                                roleId: role.id,
                            },
                        })
                    )
                );

                result.rolesApplied = roles.map((r) => r.name);
                result.appliedFromADGroups = true;

                logger.info('LDAP: Roles assigned from AD groups', {
                    email: ldapUser.email,
                    roles: result.rolesApplied,
                });
            }

            // Step 2: Try to assign department from AD group mapping
            const deptInfo = getFirstDepartment(matchedMappings);
            if (deptInfo) {
                const dept = await prisma.department.findUnique({
                    where: { code: deptInfo.code },
                });

                if (dept) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { departmentId: dept.id },
                    });

                    result.departmentAssigned = {
                        id: dept.id,
                        name: dept.name,
                    };

                    logger.info('LDAP: Department assigned from AD groups', {
                        email: ldapUser.email,
                        department: deptInfo.name,
                    });
                }
            }
        } else {
            // No AD groups matched - use admin-panel assigned roles as fallback
            logger.info('LDAP: No AD group mappings found, using admin-assigned roles', {
                email: ldapUser.email,
                userGroups: userGroups.length,
            });

            const userRoles = await prisma.userRole.findMany({
                where: { userId: dbUser.id },
                include: { role: true },
            });

            if (userRoles.length > 0) {
                result.rolesApplied = userRoles.map((ur) => ur.role.name);
                result.appliedFromAdminPanel = true;

                logger.info('LDAP: Using admin-assigned roles (AD group fallback)', {
                    email: ldapUser.email,
                    roles: result.rolesApplied,
                });
            } else {
                // No roles from AD groups or admin - assign REQUESTER as default
                logger.info('LDAP: No roles found, assigning REQUESTER as default', {
                    email: ldapUser.email,
                });

                const requesterRole = await prisma.role.findUnique({
                    where: { name: 'REQUESTER' },
                });

                if (requesterRole) {
                    await prisma.userRole.create({
                        data: {
                            userId: dbUser.id,
                            roleId: requesterRole.id,
                        },
                    });

                    result.rolesApplied = ['REQUESTER'];
                    result.appliedFromAdminPanel = true;
                }
            }
        }

        // Step 3: Sync LDAP department attribute if not already set from AD groups
        if (!result.departmentAssigned && ldapUser.department) {
            const dept = await prisma.department.findFirst({
                where: {
                    OR: [{ name: { contains: ldapUser.department } }, { code: ldapUser.department.toUpperCase() }],
                },
            });

            if (dept && !dbUser.departmentId) {
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { departmentId: dept.id },
                });

                result.departmentAssigned = {
                    id: dept.id,
                    name: dept.name,
                };

                logger.info('LDAP: Department assigned from LDAP attribute', {
                    email: ldapUser.email,
                    department: dept.name,
                });
            }
        }

        return result;
    } catch (error: any) {
        logger.error('LDAP: Error syncing user to database', {
            email: ldapUser.email,
            error: error.message,
        });

        // If sync fails, return what we have and let login proceed
        // (fail-safe: at least basic user exists)
        return result;
    }
}

/**
 * Get a summary of how roles were assigned (useful for debugging)
 */
export function describeSyncResult(result: RoleSyncResult): string {
    const parts: string[] = [];

    if (result.rolesApplied.length > 0) {
        const source = result.appliedFromADGroups ? 'AD groups' : result.appliedFromAdminPanel ? 'admin panel' : 'unknown';
        parts.push(`Roles from ${source}: ${result.rolesApplied.join(', ')}`);
    } else {
        parts.push('No roles assigned');
    }

    if (result.departmentAssigned) {
        parts.push(`Department: ${result.departmentAssigned.name}`);
    }

    return parts.join(' | ');
}
