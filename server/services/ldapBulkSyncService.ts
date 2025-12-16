/**
 * LDAP Bulk User Sync Service
 *
 * Imports all users from Active Directory and assigns roles based on AD group memberships
 * This allows automatic provisioning of all AD users without requiring individual logins
 */

import { Client } from 'ldapts';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { syncLDAPUserToDatabase } from './ldapRoleSyncService.js';
import { LDAPUser } from './ldapService.js';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export interface BulkSyncResult {
    totalUsersFound: number;
    usersImported: number;
    usersUpdated: number;
    usersFailed: number;
    errors: Array<{ email: string; error: string }>;
    duration: number; // in milliseconds
}

export interface BulkSyncProgress {
    current: number;
    total: number;
    currentUser?: string;
}

/**
 * Search all users in Active Directory
 *
 * @param filter - Optional LDAP filter to narrow down users (default: all users with email)
 * @returns Array of LDAP users with their group memberships
 */
async function searchAllADUsers(filter?: string): Promise<LDAPUser[]> {
    if (!config.LDAP) {
        throw new Error('LDAP is not configured');
    }

    const client = new Client({
        url: config.LDAP.url,
        timeout: 30000, // 30 second timeout for bulk operations
        connectTimeout: 30000,
        strictDN: false,
    });

    const users: LDAPUser[] = [];

    try {
        // Bind with admin credentials
        logger.info('LDAP Bulk Sync: Binding with admin credentials');
        await client.bind(config.LDAP.bindDN, config.LDAP.bindPassword);

        // Default filter: all users with userPrincipalName (excludes computer accounts, etc.)
        const searchFilter = filter || '(&(objectClass=user)(userPrincipalName=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))';
        // Note: userAccountControl filter excludes disabled accounts

        logger.info('LDAP Bulk Sync: Searching for users', {
            baseDN: config.LDAP.searchDN,
            filter: searchFilter,
        });

        const { searchEntries } = await client.search(config.LDAP.searchDN, {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['dn', 'userPrincipalName', 'mail', 'cn', 'displayName', 'department', 'memberOf', 'thumbnailPhoto', 'sAMAccountName'],
            paged: true, // Enable paging for large result sets
            sizeLimit: 1000, // Limit to 1000 users (adjust as needed)
        });

        logger.info(`LDAP Bulk Sync: Found ${searchEntries.length} users in Active Directory`);

        // Convert LDAP entries to LDAPUser objects
        for (const entry of searchEntries) {
            try {
                const email = (entry.mail as string) || (entry.userPrincipalName as string);

                if (!email) {
                    logger.warn('LDAP Bulk Sync: Skipping user without email', {
                        dn: entry.dn,
                        cn: entry.cn,
                    });
                    continue;
                }

                // Extract group memberships
                const memberOf = Array.isArray(entry.memberOf) ? (entry.memberOf as string[]) : entry.memberOf ? [entry.memberOf as string] : [];

                // Save profile photo if available
                let profileImage: string | undefined;
                if (entry.thumbnailPhoto) {
                    try {
                        profileImage = await saveLDAPPhoto(email, entry.thumbnailPhoto as Buffer);
                    } catch (error: any) {
                        logger.warn('LDAP Bulk Sync: Failed to save profile photo', {
                            email,
                            error: error.message,
                        });
                    }
                }

                users.push({
                    dn: entry.dn as string,
                    email,
                    name: (entry.displayName as string) || (entry.cn as string) || email.split('@')[0],
                    department: entry.department as string | undefined,
                    memberOf,
                    profileImage,
                });
            } catch (error: any) {
                logger.error('LDAP Bulk Sync: Error processing user entry', {
                    dn: entry.dn,
                    error: error.message,
                });
            }
        }

        await client.unbind();

        return users;
    } catch (error: any) {
        logger.error('LDAP Bulk Sync: Search failed', {
            error: error.message,
            code: error.code,
        });

        try {
            await client.unbind();
        } catch {
            // Ignore unbind errors
        }

        throw new Error(`Failed to search Active Directory: ${error.message}`);
    }
}

/**
 * Bulk sync all users from Active Directory to database
 *
 * @param filter - Optional LDAP filter to narrow down users
 * @param onProgress - Optional callback for progress updates
 * @returns Sync result summary
 */
export async function bulkSyncADUsers(filter?: string, onProgress?: (progress: BulkSyncProgress) => void): Promise<BulkSyncResult> {
    const startTime = Date.now();

    const result: BulkSyncResult = {
        totalUsersFound: 0,
        usersImported: 0,
        usersUpdated: 0,
        usersFailed: 0,
        errors: [],
        duration: 0,
    };

    try {
        logger.info('LDAP Bulk Sync: Starting bulk user synchronization');

        // Step 1: Search all users in AD
        const ldapUsers = await searchAllADUsers(filter);
        result.totalUsersFound = ldapUsers.length;

        logger.info(`LDAP Bulk Sync: Processing ${ldapUsers.length} users`);

        // Step 2: Sync each user to database
        for (let i = 0; i < ldapUsers.length; i++) {
            const ldapUser = ldapUsers[i];

            // Report progress
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: ldapUsers.length,
                    currentUser: ldapUser.email,
                });
            }

            try {
                // Check if user already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email: ldapUser.email },
                    include: { roles: true, department: true },
                });

                // Sync user and roles
                await syncLDAPUserToDatabase(ldapUser, existingUser);

                if (existingUser) {
                    result.usersUpdated++;
                    logger.info('LDAP Bulk Sync: User updated', {
                        email: ldapUser.email,
                        groupCount: ldapUser.memberOf?.length || 0,
                    });
                } else {
                    result.usersImported++;
                    logger.info('LDAP Bulk Sync: User imported', {
                        email: ldapUser.email,
                        groupCount: ldapUser.memberOf?.length || 0,
                    });
                }
            } catch (error: any) {
                result.usersFailed++;
                result.errors.push({
                    email: ldapUser.email,
                    error: error.message,
                });

                logger.error('LDAP Bulk Sync: Failed to sync user', {
                    email: ldapUser.email,
                    error: error.message,
                });
            }
        }

        result.duration = Date.now() - startTime;

        logger.info('LDAP Bulk Sync: Completed', {
            totalFound: result.totalUsersFound,
            imported: result.usersImported,
            updated: result.usersUpdated,
            failed: result.usersFailed,
            durationMs: result.duration,
        });

        return result;
    } catch (error: any) {
        result.duration = Date.now() - startTime;

        logger.error('LDAP Bulk Sync: Failed', {
            error: error.message,
            durationMs: result.duration,
        });

        throw error;
    }
}

/**
 * Save LDAP profile photo to disk
 */
async function saveLDAPPhoto(email: string, photoBuffer: Buffer): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename from email and timestamp
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `ldap-${sanitizedEmail}-${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, filename);

    // Write photo to disk
    await fs.promises.writeFile(filePath, photoBuffer);

    return `/uploads/profiles/${filename}`;
}

/**
 * Get sync statistics (how many AD users are already in the system)
 */
export async function getSyncStatistics() {
    if (!config.LDAP) {
        return {
            ldapConfigured: false,
            totalADUsers: 0,
            usersInDatabase: 0,
            usersWithLDAPDN: 0,
        };
    }

    try {
        // Count users in AD
        const ldapUsers = await searchAllADUsers();
        const totalADUsers = ldapUsers.length;

        // Count users in database
        const totalDBUsers = await prisma.user.count();

        // Count users with LDAP DN (synced from AD)
        const usersWithLDAP = await prisma.user.count({
            where: {
                ldapDN: { not: null },
            },
        });

        return {
            ldapConfigured: true,
            totalADUsers,
            usersInDatabase: totalDBUsers,
            usersWithLDAPDN: usersWithLDAP,
            syncPercentage: totalADUsers > 0 ? Math.round((usersWithLDAP / totalADUsers) * 100) : 0,
        };
    } catch (error: any) {
        logger.error('Failed to get sync statistics', { error: error.message });
        throw error;
    }
}
