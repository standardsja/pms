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
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { BadRequestError, UnauthorizedError } from '../middleware/errorHandler';

export interface LDAPUser {
    dn: string;
    email: string;
    name?: string;
    department?: string;
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
                timeout: 5000, // 5 second timeout
                connectTimeout: 5000,
            });
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

        try {
            // Step 1: Bind with admin credentials to search for user
            await this.client!.bind(config.LDAP.bindDN, config.LDAP.bindPassword);

            logger.info('LDAP admin bind successful for user search', { email: sanitizedEmail });

            // Step 2: Search for the user
            const { searchEntries } = await this.client!.search(config.LDAP.searchDN, {
                filter: `(userPrincipalName=${sanitizedEmail})`,
                scope: 'sub',
                attributes: ['dn', 'userPrincipalName', 'cn', 'displayName', 'mail', 'department'],
            });

            if (searchEntries.length === 0) {
                logger.warn('LDAP user not found in directory', { email: sanitizedEmail });
                throw new BadRequestError('User not found in directory');
            }

            // Get user DN and info
            const entry = searchEntries[0];
            userDN = entry.dn as string;

            ldapUser = {
                dn: userDN,
                email: (entry.mail as string) || sanitizedEmail,
                name: (entry.displayName as string) || (entry.cn as string) || undefined,
                department: entry.department as string | undefined,
            };

            logger.info('LDAP user found in directory', {
                email: sanitizedEmail,
                dn: userDN,
                name: ldapUser.name,
            });

            // Step 3: Unbind admin connection
            await this.client!.unbind();

            // Step 4: Try to bind as the user to verify password
            await this.client!.bind(userDN, password);

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
            });

            // Always try to unbind to clean up
            await this.safeUnbind();

            // Determine error type
            if (error.code === 49 || error.message?.includes('Invalid credentials')) {
                throw new UnauthorizedError('Invalid credentials');
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
                attributes: ['dn', 'userPrincipalName', 'cn', 'displayName', 'mail', 'department'],
            });

            if (searchEntries.length === 0) {
                return null;
            }

            const entry = searchEntries[0];
            return {
                dn: entry.dn as string,
                email: (entry.mail as string) || sanitizedEmail,
                name: (entry.displayName as string) || (entry.cn as string) || undefined,
                department: entry.department as string | undefined,
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
}

// Export singleton instance
export const ldapService = new LDAPService();
