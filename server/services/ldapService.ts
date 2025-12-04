import { Client } from 'ldapts';
import type { SearchResult } from 'ldapts';

/**
 * LDAP Configuration
 */
export const LDAP_CONFIG = {
    url: process.env.LDAP_URL || 'ldap://BOS.local:389',
    bindDN: process.env.LDAP_BIND_DN || 'CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local',
    bindPassword: process.env.LDAP_BIND_PASSWORD || 'Password@101',
    searchBase: process.env.LDAP_SEARCH_BASE || 'DC=BOS,DC=local',
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(userPrincipalName={email})',
    timeout: 5000, // 5 seconds
};

/**
 * LDAP User Interface
 */
export interface LDAPUser {
    dn: string;
    email: string;
    name?: string;
    displayName?: string;
    department?: string;
    title?: string;
    telephoneNumber?: string;
    employeeId?: string;
}

/**
 * LDAP Service for authentication and user lookup
 */
export class LDAPService {
    private client: Client;

    constructor() {
        this.client = new Client({
            url: LDAP_CONFIG.url,
            timeout: LDAP_CONFIG.timeout,
        });
    }

    /**
     * Authenticate user against LDAP
     * @param email User's email (userPrincipalName)
     * @param password User's password
     * @returns LDAP user details if authenticated
     */
    async authenticate(email: string, password: string): Promise<LDAPUser | null> {
        try {
            console.log(`[LDAP] Attempting authentication for: ${email}`);

            // Step 1: Bind with service account
            await this.client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword);
            console.log('[LDAP] Service account bind successful');

            // Step 2: Search for user
            const filter = LDAP_CONFIG.searchFilter.replace('{email}', email);
            const searchResult: SearchResult = await this.client.search(LDAP_CONFIG.searchBase, {
                filter,
                scope: 'sub',
                attributes: ['dn', 'userPrincipalName', 'mail', 'displayName', 'cn', 'sn', 'givenName', 'department', 'title', 'telephoneNumber', 'employeeID', 'employeeNumber'],
            });

            if (!searchResult.searchEntries || searchResult.searchEntries.length === 0) {
                console.log(`[LDAP] User not found: ${email}`);
                await this.client.unbind();
                return null;
            }

            const entry = searchResult.searchEntries[0];
            console.log(`[LDAP] User found: ${entry.dn}`);

            // Step 3: Unbind service account
            await this.client.unbind();

            // Step 4: Authenticate with user's credentials
            try {
                await this.client.bind(entry.dn as string, password);
                console.log(`[LDAP] User authentication successful: ${email}`);

                // Extract user details
                const ldapUser: LDAPUser = {
                    dn: entry.dn as string,
                    email: (entry.mail as string) || (entry.userPrincipalName as string) || email,
                    name: (entry.displayName as string) || (entry.cn as string) || email.split('@')[0],
                    displayName: entry.displayName as string,
                    department: entry.department as string,
                    title: entry.title as string,
                    telephoneNumber: entry.telephoneNumber as string,
                    employeeId: (entry.employeeID as string) || (entry.employeeNumber as string),
                };

                await this.client.unbind();
                return ldapUser;
            } catch (bindError: any) {
                console.log(`[LDAP] User authentication failed: ${email}`, bindError.message);
                await this.client.unbind();
                return null;
            }
        } catch (error: any) {
            console.error('[LDAP] Authentication error:', error.message);
            try {
                await this.client.unbind();
            } catch (unbindError) {
                // Ignore unbind errors
            }
            return null;
        }
    }

    /**
     * Search for user by email (without authentication)
     * @param email User's email
     * @returns LDAP user details if found
     */
    async searchUser(email: string): Promise<LDAPUser | null> {
        try {
            await this.client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword);

            const filter = LDAP_CONFIG.searchFilter.replace('{email}', email);
            const searchResult: SearchResult = await this.client.search(LDAP_CONFIG.searchBase, {
                filter,
                scope: 'sub',
                attributes: ['dn', 'userPrincipalName', 'mail', 'displayName', 'cn', 'department', 'title', 'telephoneNumber', 'employeeID', 'employeeNumber'],
            });

            await this.client.unbind();

            if (!searchResult.searchEntries || searchResult.searchEntries.length === 0) {
                return null;
            }

            const entry = searchResult.searchEntries[0];
            return {
                dn: entry.dn as string,
                email: (entry.mail as string) || (entry.userPrincipalName as string) || email,
                name: (entry.displayName as string) || (entry.cn as string) || email.split('@')[0],
                displayName: entry.displayName as string,
                department: entry.department as string,
                title: entry.title as string,
                telephoneNumber: entry.telephoneNumber as string,
                employeeId: (entry.employeeID as string) || (entry.employeeNumber as string),
            };
        } catch (error: any) {
            console.error('[LDAP] User search error:', error.message);
            try {
                await this.client.unbind();
            } catch {
                // Ignore
            }
            return null;
        }
    }

    /**
     * Test LDAP connection
     * @returns true if connection successful
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword);
            await this.client.unbind();
            console.log('[LDAP] Connection test successful');
            return true;
        } catch (error: any) {
            console.error('[LDAP] Connection test failed:', error.message);
            return false;
        }
    }
}

// Singleton instance
let ldapService: LDAPService | null = null;

/**
 * Get LDAP service instance
 */
export function getLDAPService(): LDAPService {
    if (!ldapService) {
        ldapService = new LDAPService();
    }
    return ldapService;
}
