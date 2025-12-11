/**
 * LDAP Authentication Service
 * Handles LDAP authentication and user lookup
 *
 * SECURITY NOTES:
 * - Never log passwords or sensitive credentials
 * - Always unbind LDAP connections properly
 * - Validate all user input before LDAP queries
 * - Use parameterized queries to prevent LDAP injection
 */
import { Client } from 'ldapts';
import { URL } from 'url';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { BadRequestError, UnauthorizedError } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';

export interface LDAPUser {
    dn: string;
    email: string;
    name?: string;
    department?: string;
    phone?: string; // Phone number from AD
    memberOf?: string[]; // AD group memberships
    profileImage?: string; // Profile photo path
}

export interface LDAPUserWithGroups extends LDAPUser {
    memberOf: string[]; // List of AD group DNs
}

/**
 * LDAP Service class - handles all LDAP operations
 */
class LDAPService {
    private client: Client | null = null;

    constructor() {
        if (config.LDAP) {
            this.client = new Client({
                url: config.LDAP.url,
                timeout: 10000, // 10 second timeout (increased)
                connectTimeout: 10000,
                strictDN: false, // More lenient DN parsing
            });

            logger.info('LDAP Service initialized', {
                url: config.LDAP.url,
                searchDN: config.LDAP.searchDN,
            });
        } else {
            logger.info('LDAP Service not configured - using database authentication only');
        }
    }

    /**
     * Check if LDAP is configured and available
     */
    public isEnabled(): boolean {
        return !!config.LDAP && !!this.client;
    }

    /**
     * Authenticate a user against LDAP directory
     *
     * @param email - User's email/UPN
     * @param password - User's password
     * @returns LDAP user info if authentication succeeds
     * @throws UnauthorizedError if authentication fails
     * @throws BadRequestError if user not found or LDAP error
     */
    public async authenticateUser(email: string, password: string): Promise<LDAPUser> {
        if (!this.isEnabled() || !config.LDAP) {
            throw new BadRequestError('LDAP authentication is not configured');
        }

        // Sanitize email to prevent LDAP injection
        const sanitizedEmail = this.sanitizeInput(email);

        let userDN = '';
        let ldapUser: LDAPUser | null = null;

        // Attempt the LDAP flow, with a single fallback attempt if DNS fails and a fallback IP is provided
        let attemptedFallback = false;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                // Step 1: Bind with admin credentials to search for user
                logger.info('LDAP attempting admin bind', {
                    url: config.LDAP.url,
                    bindDN: config.LDAP.bindDN,
                    searchDN: config.LDAP.searchDN,
                });

                await this.client!.bind(config.LDAP.bindDN, config.LDAP.bindPassword);

                logger.info('LDAP admin bind successful for user search', { email: sanitizedEmail });

                // Step 2: Search for the user
                const { searchEntries } = await this.client!.search(config.LDAP.searchDN, {
                    filter: `(userPrincipalName=${sanitizedEmail})`,
                    scope: 'sub',
                    // Include sAMAccountName and userPrincipalName to support bind fallbacks
                    attributes: ['dn', 'userPrincipalName', 'sAMAccountName', 'cn', 'displayName', 'mail', 'department', 'telephoneNumber', 'memberOf', 'thumbnailPhoto'],
                });

                if (searchEntries.length === 0) {
                    logger.warn('LDAP user not found in directory', { email: sanitizedEmail });
                    throw new BadRequestError('User not found in directory');
                }

                // Get user DN and info
                const entry = searchEntries[0];
                userDN = entry.dn as string;

                // Extract group memberships
                const memberOf = Array.isArray(entry.memberOf) ? (entry.memberOf as string[]) : entry.memberOf ? [entry.memberOf as string] : [];

                // Save profile photo from LDAP if available
                let profileImage: string | undefined;
                if (entry.thumbnailPhoto) {
                    try {
                        const photoBuffer = entry.thumbnailPhoto as Buffer;
                        // Validate buffer has actual data
                        if (photoBuffer && photoBuffer.length > 0) {
                            profileImage = await this.saveLDAPPhoto(sanitizedEmail, photoBuffer);
                            logger.info('LDAP photo buffer processed', { email: sanitizedEmail, bufferSize: photoBuffer.length });
                        } else {
                            logger.warn('LDAP thumbnailPhoto exists but buffer is empty', { email: sanitizedEmail });
                        }
                    } catch (error: any) {
                        logger.warn('Failed to save LDAP profile photo', { email: sanitizedEmail, error: error.message });
                    }
                } else {
                    logger.info('No thumbnailPhoto attribute in LDAP entry', { email: sanitizedEmail });
                }

                // Extract phone number - handle array or string response
                let phoneNumber: string | undefined;
                if (entry.telephoneNumber) {
                    if (Array.isArray(entry.telephoneNumber) && entry.telephoneNumber.length > 0) {
                        phoneNumber = entry.telephoneNumber[0] as string;
                    } else if (typeof entry.telephoneNumber === 'string') {
                        phoneNumber = entry.telephoneNumber;
                    }
                }
                
                ldapUser = {
                    dn: userDN,
                    email: (entry.mail as string) || sanitizedEmail,
                    name: (entry.displayName as string) || (entry.cn as string) || undefined,
                    department: entry.department as string | undefined,
                    phone: phoneNumber,
                    memberOf,
                    profileImage,
                };

                logger.info('LDAP user found in directory', {
                    email: sanitizedEmail,
                    dn: userDN,
                    name: ldapUser.name,
                    groupCount: memberOf.length,
                });

                // Step 3: Unbind admin connection
                await this.client!.unbind();

                // Step 4: Try to bind as the user to verify password
                // Some AD deployments disallow binding with DN; attempt fallbacks:
                // 1) bind with user DN
                // 2) bind with userPrincipalName (UPN / email)
                // 3) bind with sAMAccountName (if available)
                const upn = (entry.userPrincipalName as string) || (entry.mail as string) || sanitizedEmail;
                const sam = entry.sAMAccountName as string | undefined;

                let bindSucceeded = false;
                const bindErrors: string[] = [];

                try {
                    await this.client!.bind(userDN, password);
                    bindSucceeded = true;
                    logger.info('LDAP user authenticated by DN bind', { email: sanitizedEmail, dn: userDN });
                } catch (e: any) {
                    bindErrors.push(`DN bind failed: ${e.message}`);
                }

                if (!bindSucceeded) {
                    try {
                        await this.client!.bind(upn, password);
                        bindSucceeded = true;
                        logger.info('LDAP user authenticated by UPN bind', { email: sanitizedEmail, upn });
                    } catch (e: any) {
                        bindErrors.push(`UPN bind failed: ${e.message}`);
                    }
                }

                if (!bindSucceeded && sam) {
                    try {
                        await this.client!.bind(sam, password);
                        bindSucceeded = true;
                        logger.info('LDAP user authenticated by sAMAccountName bind', { email: sanitizedEmail, sAMAccountName: sam });
                    } catch (e: any) {
                        bindErrors.push(`sAMAccountName bind failed: ${e.message}`);
                    }
                }

                if (!bindSucceeded) {
                    logger.warn('LDAP bind attempts failed', { email: sanitizedEmail, attempts: bindErrors });
                    throw new UnauthorizedError('Invalid credentials');
                }

                logger.info('LDAP user authenticated successfully', {
                    email: sanitizedEmail,
                    dn: userDN,
                });

                // Successfully authenticated
                return ldapUser;
            } catch (error: any) {
                logger.error('LDAP authentication error', {
                    email: sanitizedEmail,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    syscall: error.syscall,
                    stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
                });

                // Always try to unbind to clean up
                await this.safeUnbind();

                // If DNS resolution failed and a fallback IP is provided, recreate client and retry once
                const dnsFailed = error.code === 'ENOTFOUND' || (error.message && error.message.includes('getaddrinfo'));
                const fallbackIp = process.env.LDAP_FALLBACK_IP;
                if (!attemptedFallback && dnsFailed && fallbackIp) {
                    attemptedFallback = true;
                    try {
                        const orig = new URL(config.LDAP.url);
                        const port = orig.port || (orig.protocol === 'ldaps:' ? '636' : '389');
                        const newUrl = `${orig.protocol}//${fallbackIp}:${port}`;
                        logger.warn('LDAP DNS lookup failed; retrying using fallback IP', { orig: config.LDAP.url, newUrl });
                        this.client = new Client({
                            url: newUrl,
                            timeout: 10000,
                            connectTimeout: 10000,
                            strictDN: false,
                        });
                        // Retry the loop
                        continue;
                    } catch (e: any) {
                        logger.error('Failed to create LDAP client for fallback IP', { error: e.message });
                        // fall through to error handling below
                    }
                }

                // Determine error type with better error messages
                if (error.code === 49 || error.message?.includes('Invalid credentials')) {
                    throw new UnauthorizedError('Invalid credentials');
                }

                // Connection errors
                if (error.errno === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                    logger.error('LDAP connection timeout - server may be unreachable', {
                        url: config.LDAP.url,
                        suggestion: 'Check network connectivity and firewall rules',
                    });
                    throw new BadRequestError('LDAP server connection timeout. Please contact your system administrator.');
                }

                if (error.errno === 'ECONNREFUSED') {
                    logger.error('LDAP connection refused - server may be down', {
                        url: config.LDAP.url,
                    });
                    throw new BadRequestError('LDAP server is not responding. Please contact your system administrator.');
                }

                if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
                    throw error;
                }

                throw new BadRequestError('LDAP authentication failed');
            } finally {
                // Always ensure unbind
                await this.safeUnbind();
            }
        }

        // If we reach here something unexpected happened
        throw new BadRequestError('LDAP authentication failed');
    }

    /**
     * Search for a user in LDAP directory by email
     *
     * @param email - User's email/UPN
     * @returns LDAP user info if found
     */
    public async findUser(email: string): Promise<LDAPUser | null> {
        if (!this.isEnabled() || !config.LDAP) {
            return null;
        }

        const sanitizedEmail = this.sanitizeInput(email);

        try {
            await this.client!.bind(config.LDAP.bindDN, config.LDAP.bindPassword);

            const { searchEntries } = await this.client!.search(config.LDAP.searchDN, {
                filter: `(userPrincipalName=${sanitizedEmail})`,
                scope: 'sub',
                attributes: ['dn', 'userPrincipalName', 'cn', 'displayName', 'mail', 'department', 'memberOf', 'thumbnailPhoto'],
            });

            if (searchEntries.length === 0) {
                return null;
            }

            const entry = searchEntries[0];

            // Extract group memberships
            const memberOf = Array.isArray(entry.memberOf) ? (entry.memberOf as string[]) : entry.memberOf ? [entry.memberOf as string] : [];

            // Save profile photo from LDAP if available
            let profileImage: string | undefined;
            if (entry.thumbnailPhoto) {
                try {
                    const photoBuffer = entry.thumbnailPhoto as Buffer;
                    // Validate buffer has actual data
                    if (photoBuffer && photoBuffer.length > 0) {
                        profileImage = await this.saveLDAPPhoto(sanitizedEmail, photoBuffer);
                        logger.info('LDAP photo buffer processed', { email: sanitizedEmail, bufferSize: photoBuffer.length });
                    } else {
                        logger.warn('LDAP thumbnailPhoto exists but buffer is empty', { email: sanitizedEmail });
                    }
                } catch (error: any) {
                    logger.warn('Failed to save LDAP profile photo', { email: sanitizedEmail, error: error.message });
                }
            } else {
                logger.info('No thumbnailPhoto attribute in LDAP entry', { email: sanitizedEmail });
            }

            return {
                dn: entry.dn as string,
                email: (entry.mail as string) || sanitizedEmail,
                name: (entry.displayName as string) || (entry.cn as string) || undefined,
                department: entry.department as string | undefined,
                memberOf,
                profileImage,
            };
        } catch (error: any) {
            logger.error('LDAP user search error', {
                email: sanitizedEmail,
                error: error.message,
            });
            return null;
        } finally {
            await this.safeUnbind();
        }
    }

    /**
     * Test LDAP connection
     *
     * @returns true if connection succeeds
     */
    public async testConnection(): Promise<boolean> {
        if (!this.isEnabled() || !config.LDAP) {
            return false;
        }

        try {
            await this.client!.bind(config.LDAP.bindDN, config.LDAP.bindPassword);
            await this.client!.unbind();
            logger.info('LDAP connection test successful');
            return true;
        } catch (error: any) {
            logger.error('LDAP connection test failed', { error: error.message });
            await this.safeUnbind();
            return false;
        }
    }

    /**
     * Safely unbind LDAP connection without throwing errors
     */
    private async safeUnbind(): Promise<void> {
        try {
            if (this.client) {
                await this.client.unbind();
            }
        } catch (error) {
            // Ignore unbind errors - connection may already be closed
        }
    }

    /**
     * Sanitize input to prevent LDAP injection attacks
     *
     * @param input - Raw user input
     * @returns Sanitized input
     */
    private sanitizeInput(input: string): string {
        // Remove special LDAP characters that could be used for injection
        return input.replace(/[()\\*\x00]/g, '');
    }

    /**
     * Save LDAP profile photo to disk
     *
     * @param email - User's email for filename generation
     * @param photoBuffer - Binary photo data from LDAP
     * @returns Relative path to saved photo
     */
    private async saveLDAPPhoto(email: string, photoBuffer: Buffer): Promise<string> {
        const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');

        // Validate photo buffer
        if (!photoBuffer || photoBuffer.length === 0) {
            throw new Error('Photo buffer is empty or invalid');
        }

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

        // Verify file was written
        const stats = await fs.promises.stat(filePath);
        logger.info('LDAP profile photo saved', {
            email,
            filename,
            fileSize: stats.size,
            bufferSize: photoBuffer.length,
        });

        if (stats.size === 0) {
            logger.error('Written file has 0 bytes despite buffer having data', {
                email,
                bufferSize: photoBuffer.length,
            });
            throw new Error('Failed to write photo data to disk');
        }

        return `/uploads/profiles/${filename}`;
    }
}

// Export singleton instance
export const ldapService = new LDAPService();
