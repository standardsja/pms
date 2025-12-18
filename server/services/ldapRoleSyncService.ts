/**
 * LDAP Role Sync Service
 *
 * Synchronizes AD group memberships to PMS roles and departments
 * Provides hybrid approach: AD groups + admin panel fallback
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';
import { LDAPUser } from './ldapService.js';
import { getGroupMappings, findMappingsForGroups, mergeRoles, getFirstDepartment, GroupRoleMapping } from '../config/ldapGroupMapping.js';

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
            logger.info('LDAP: Creating new LDAP user in database', { email: ldapUser.email });
            dbUser = await prisma.user.create({
                data: {
                    email: ldapUser.email,
                    name: ldapUser.name || ldapUser.email,
                    ldapDN: ldapUser.dn,
                    phone: ldapUser.phone,
                    profileImage: ldapUser.profileImage,
                    userSource: 'LDAP', // Mark as LDAP user
                },
                include: { roles: true },
            });
        } else {
            // Check if this is a LOCAL user - do not sync roles for LOCAL users
            if (dbUser.userSource === 'LOCAL') {
                logger.info('LDAP: Skipping role sync for LOCAL user', {
                    email: ldapUser.email,
                    userSource: dbUser.userSource,
                });

                // Still sync LDAP profile data (phone, image) but preserve admin-assigned roles
                const updateData: any = {};

                if (ldapUser.phone && ldapUser.phone !== dbUser.phone) {
                    updateData.phone = ldapUser.phone;
                }

                if (ldapUser.profileImage) {
                    updateData.profileImage = ldapUser.profileImage;
                }

                if (Object.keys(updateData).length > 0) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: updateData,
                    });
                }

                // Return existing admin-assigned roles without modification
                const userRoles = await prisma.userRole.findMany({
                    where: { userId: dbUser.id },
                    include: { role: true },
                });

                result.rolesApplied = userRoles.map((ur) => ur.role.name);
                result.appliedFromAdminPanel = true;

                logger.info('LDAP: LOCAL user roles preserved (admin-managed)', {
                    email: ldapUser.email,
                    roles: result.rolesApplied,
                });

                return result;
            }

            // For LDAP users, continue with normal sync
            // Sync LDAP data to database
            const updateData: any = {};

            // Sync phone number from AD
            logger.info('LDAP: Phone sync check', {
                email: ldapUser.email,
                ldapPhone: ldapUser.phone,
                dbPhone: dbUser.phone,
                shouldUpdate: !!(ldapUser.phone && ldapUser.phone !== dbUser.phone),
            });
            if (ldapUser.phone && ldapUser.phone !== dbUser.phone) {
                updateData.phone = ldapUser.phone;
                logger.info('LDAP: Phone number will be synced', {
                    email: ldapUser.email,
                    oldPhone: dbUser.phone,
                    newPhone: ldapUser.phone,
                });
            }

            // Handle profile image sync logic:
            // 1. If LDAP has a photo, use it (LDAP is source of truth)
            // 2. If LDAP doesn't have a photo but user uploaded one, keep user's photo
            // 3. If neither exist, no photo
            if (ldapUser.profileImage) {
                // LDAP has a photo - sync it to database (overwrites user upload)
                updateData.profileImage = ldapUser.profileImage;
                logger.info('LDAP: Profile image synced from LDAP', {
                    email: ldapUser.email,
                    profileImage: ldapUser.profileImage,
                    hadPreviousPhoto: !!dbUser.profileImage,
                });
            } else if (!ldapUser.profileImage && !dbUser.profileImage) {
                // Neither LDAP nor database has a photo - user can upload their own
                logger.info('LDAP: No profile photo in LDAP, user can upload custom photo', {
                    email: ldapUser.email,
                });
            } else if (!ldapUser.profileImage && dbUser.profileImage) {
                // LDAP doesn't have photo, but user uploaded one - keep user's upload
                logger.info('LDAP: No LDAP photo found, keeping user-uploaded photo', {
                    email: ldapUser.email,
                    profileImage: dbUser.profileImage,
                });
            }

            // Update user if there are changes
            if (Object.keys(updateData).length > 0) {
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: updateData,
                });
                logger.info('LDAP: User data synced from LDAP', {
                    email: ldapUser.email,
                    updatedFields: Object.keys(updateData),
                });
            }
        }

        // Get mapping rules
        const mappings = getGroupMappings();

        // Step 1: Extract AD groups and find matching mappings
        const userGroups = ldapUser.memberOf || [];

        logger.info('LDAP: Checking user group memberships', {
            email: ldapUser.email,
            groupCount: userGroups.length,
            userGroups: userGroups.length > 0 ? userGroups : ['(no groups)'],
            availableMappings: mappings.map((m) => m.adGroupName),
        });

        const matchedMappings = findMappingsForGroups(userGroups, mappings);

        if (matchedMappings.length > 0) {
            logger.info('LDAP: User belongs to AD groups, applying mapped roles', {
                email: ldapUser.email,
                groupCount: userGroups.length,
                mappingCount: matchedMappings.length,
                matchedGroups: matchedMappings.map((m) => m.adGroupName),
                rolesToApply: matchedMappings.flatMap((m) => m.roles),
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
                        id: String(dept.id),
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
            logger.warn('LDAP: No AD group mappings found, using admin-assigned roles', {
                email: ldapUser.email,
                userGroupCount: userGroups.length,
                userGroupsReceived: userGroups.length > 0 ? userGroups : ['(none)'],
                availableMappings: mappings.length,
                mappingNames: mappings.map((m) => m.adGroupName),
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
            // Defensive handling: ldapUser.department may not be a string (could be null/array/object).
            const rawDept = ldapUser.department;
            const deptStr = typeof rawDept === 'string' ? rawDept.trim() : rawDept != null ? String(rawDept).trim() : '';
            const deptCode = deptStr ? deptStr.toUpperCase() : undefined;

            try {
                const whereClauses: any[] = [];
                if (deptStr) whereClauses.push({ name: { contains: deptStr } });
                if (deptCode) whereClauses.push({ code: deptCode });

                if (whereClauses.length > 0) {
                    const dept = await prisma.department.findFirst({
                        where: { OR: whereClauses },
                    });

                    if (dept && !dbUser.departmentId) {
                        await prisma.user.update({
                            where: { id: dbUser.id },
                            data: { departmentId: dept.id },
                        });

                        result.departmentAssigned = {
                            id: String(dept.id),
                            name: dept.name,
                        };

                        logger.info('LDAP: Department assigned from LDAP attribute', {
                            email: ldapUser.email,
                            department: dept.name,
                        });
                    }
                } else {
                    logger.debug('LDAP: department attribute present but empty after coercion', { email: ldapUser.email, rawDept });
                }
            } catch (deptErr: any) {
                logger.warn('LDAP: Failed to resolve department from LDAP attribute', { email: ldapUser.email, rawDept, error: deptErr?.message || deptErr });
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
