/**
 * Role Resolver Module
 * Central hub for resolving user roles from LDAP groups, attributes, and database overrides
 */

import fs from 'fs';
import path from 'path';
import {
    Role,
    Permission,
    LDAPUser,
    RoleResolverConfig,
    ResolvedPermissions,
    RoleResolutionResult,
    RoleResolutionOptions,
    CacheEntry,
    DatabaseRoleOverride,
    LDAPResolutionError,
    RoleResolutionException,
} from '../types/rbac';
import { LDAPGroupMapper } from '../utils/ldapGroupMapper';
import { validateConfig, validateLDAPUser, validateResolvedRoles, validatePermissions, handleResolutionError } from '../utils/rbacValidation';

/**
 * Main Role Resolver class
 * Coordinates role resolution from multiple sources and manages caching
 */
export class RoleResolver {
    private config: RoleResolverConfig;
    private rolesPermissionsMap: Map<string, Role> = new Map();
    private ldapGroupMapper: LDAPGroupMapper;
    private permissionCache: Map<string, CacheEntry<ResolvedPermissions>> = new Map();
    private knownRoles: string[] = [];
    private databaseOverrides: Map<number, DatabaseRoleOverride> = new Map();

    private DEFAULT_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
    private DEFAULT_ROLE = 'REQUESTER';

    constructor(config: RoleResolverConfig) {
        validateConfig(config);

        this.config = {
            cacheTTL: config.cacheTTL || this.DEFAULT_CACHE_TTL,
            defaultRole: config.defaultRole || this.DEFAULT_ROLE,
            enableDatabaseOverrides: config.enableDatabaseOverrides ?? true,
            ...config,
        };

        // Load roles and permissions configuration
        this.loadRolesPermissionsConfig();

        // Initialize LDAP group mapper
        this.ldapGroupMapper = new LDAPGroupMapper(config.ldapGroupMappings, config.ldapAttributeMappings, this.knownRoles);
    }

    /**
     * Loads roles and permissions configuration from JSON file
     */
    private loadRolesPermissionsConfig(): void {
        try {
            const configPath = this.config.rolesPermissionsPath;

            if (!fs.existsSync(configPath)) {
                throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, { reason: 'Configuration file not found', path: configPath });
            }

            const configContent = fs.readFileSync(configPath, 'utf-8');
            const configData = JSON.parse(configContent);

            if (!configData.roles || typeof configData.roles !== 'object') {
                throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, { reason: 'Configuration missing roles object' });
            }

            // Load roles and permissions
            for (const [roleName, roleData] of Object.entries(configData.roles)) {
                const role = roleData as any;

                if (!role.permissions || typeof role.permissions !== 'object') {
                    console.warn(`[RBAC] Role ${roleName} missing or invalid permissions object`);
                    continue;
                }

                this.rolesPermissionsMap.set(roleName.toUpperCase(), {
                    name: roleName.toUpperCase(),
                    description: role.description || '',
                    permissions: role.permissions as Permission,
                });

                this.knownRoles.push(roleName.toUpperCase());
            }

            console.log(`[RBAC] Loaded ${this.knownRoles.length} roles from configuration`);
        } catch (error) {
            if (error instanceof RoleResolutionException) {
                throw error;
            }

            throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, {
                reason: 'Failed to load roles and permissions configuration',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Resolves roles and permissions for a user
     */
    async resolveRolesAndPermissions(userId: number, email: string, ldapUser: LDAPUser, options: RoleResolutionOptions = {}): Promise<RoleResolutionResult> {
        try {
            // Check cache if not skipped
            if (!options.skipCache) {
                const cached = this.getFromCache(userId);
                if (cached) {
                    return this.transformCachedPermissions(cached, userId, email, ldapUser);
                }
            }

            // Validate LDAP user data
            validateLDAPUser(ldapUser, userId);

            // Resolve roles from LDAP
            const ldapResolvedRoles = this.ldapGroupMapper.resolveAllFromLDAP(ldapUser, userId);

            let finalRoles = this.ldapGroupMapper.extractRoleNames(ldapResolvedRoles);

            // Apply database overrides if enabled
            let databaseOverride = false;
            if (this.config.enableDatabaseOverrides) {
                const override = this.databaseOverrides.get(userId);
                if (override) {
                    finalRoles = this.applyDatabaseOverride(finalRoles, override);
                    databaseOverride = true;
                }
            }

            // Ensure at least default role
            if (finalRoles.length === 0) {
                const defaultRole = this.config.defaultRole || 'REQUESTER';
                console.warn(`[RBAC] No roles resolved for user ${userId}, assigning default role: ${defaultRole}`);
                finalRoles = [defaultRole];
            }

            // Aggregate permissions
            const permissions = this.aggregatePermissions(finalRoles);

            // Cache the result
            const result: ResolvedPermissions = {
                userId,
                roles: finalRoles,
                permissions,
                resolvedAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.cacheTTL!),
                source: 'resolved',
            };

            this.cachePermissions(userId, result);

            // Log resolution for debugging
            if (options.includeLDAPData) {
                this.ldapGroupMapper.logResolution(ldapUser, ldapResolvedRoles, userId);
            }

            return {
                userId,
                email,
                ldapUser: options.includeLDAPData ? ldapUser : undefined,
                resolvedRoles: ldapResolvedRoles,
                finalRoles,
                permissions,
                resolvedAt: new Date(),
                errors: [],
            };
        } catch (error) {
            handleResolutionError(error, userId, 'Role and Permission Resolution');
            throw error;
        }
    }

    /**
     * Applies database overrides to resolved roles
     */
    private applyDatabaseOverride(ldapRoles: string[], override: DatabaseRoleOverride): string[] {
        let roles = [...ldapRoles];

        // If override specifies complete role set, use that
        if (override.overriddenRoles && override.overriddenRoles.length > 0) {
            return validateResolvedRoles(override.overriddenRoles, override.userId);
        }

        // Add roles
        if (override.rolesToAdd && override.rolesToAdd.length > 0) {
            roles = [...new Set([...roles, ...override.rolesToAdd])];
        }

        // Remove roles
        if (override.rolesToRemove && override.rolesToRemove.length > 0) {
            roles = roles.filter((r) => !override.rolesToRemove!.some((toRemove) => toRemove.toUpperCase() === r.toUpperCase()));
        }

        // Check expiration
        if (override.expiresAt && new Date() > override.expiresAt) {
            console.log(`[RBAC] Database override for user ${override.userId} has expired`);
            this.databaseOverrides.delete(override.userId);
        }

        return roles;
    }

    /**
     * Aggregates permissions from multiple roles
     */
    private aggregatePermissions(roles: string[]): Permission {
        const aggregated: Permission = {};

        // Collect all unique permissions
        const allPermissions = new Set<string>();

        for (const roleName of roles) {
            const role = this.rolesPermissionsMap.get(roleName.toUpperCase());
            if (role) {
                for (const permission of Object.keys(role.permissions)) {
                    allPermissions.add(permission);
                }
            }
        }

        // Set permission to true if ANY role grants it
        for (const permission of allPermissions) {
            aggregated[permission] = roles.some((roleName) => {
                const role = this.rolesPermissionsMap.get(roleName.toUpperCase());
                return role && role.permissions[permission] === true;
            });
        }

        validatePermissions(aggregated, 0);
        return aggregated;
    }

    /**
     * Caches resolved permissions
     */
    private cachePermissions(userId: number, permissions: ResolvedPermissions): void {
        try {
            this.permissionCache.set(String(userId), {
                data: permissions,
                createdAt: new Date(),
                expiresAt: permissions.expiresAt || new Date(Date.now() + this.config.cacheTTL!),
            });
        } catch (error) {
            console.error(`[RBAC] Failed to cache permissions for user ${userId}:`, error);
        }
    }

    /**
     * Retrieves cached permissions if valid
     */
    private getFromCache(userId: number): ResolvedPermissions | null {
        try {
            const cacheKey = String(userId);
            const cached = this.permissionCache.get(cacheKey);

            if (!cached) {
                return null;
            }

            // Check expiration
            if (new Date() > cached.expiresAt) {
                this.permissionCache.delete(cacheKey);
                return null;
            }

            cached.data.source = 'cache';
            return cached.data;
        } catch (error) {
            console.error(`[RBAC] Failed to retrieve cache for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Transforms cached permissions into result format
     */
    private transformCachedPermissions(cached: ResolvedPermissions, userId: number, email: string, ldapUser: LDAPUser): RoleResolutionResult {
        return {
            userId,
            email,
            resolvedRoles: cached.roles.map((r) => ({
                role: r,
                source: 'ldap_group' as const,
            })),
            finalRoles: cached.roles,
            permissions: cached.permissions,
            resolvedAt: cached.resolvedAt,
        };
    }

    /**
     * Invalidates cache for a specific user
     */
    invalidateUserCache(userId: number): void {
        this.permissionCache.delete(String(userId));
        console.log(`[RBAC] Cache invalidated for user ${userId}`);
    }

    /**
     * Clears entire permission cache
     */
    clearCache(): void {
        this.permissionCache.clear();
        console.log('[RBAC] Permission cache cleared');
    }

    /**
     * Gets cache statistics
     */
    getCacheStats(): { size: number; entries: string[] } {
        return {
            size: this.permissionCache.size,
            entries: Array.from(this.permissionCache.keys()),
        };
    }

    /**
     * Sets database role override for a user
     */
    setDatabaseOverride(override: DatabaseRoleOverride): void {
        this.databaseOverrides.set(override.userId, override);
        this.invalidateUserCache(override.userId);
        console.log(`[RBAC] Database override set for user ${override.userId}`);
    }

    /**
     * Removes database role override for a user
     */
    removeDatabaseOverride(userId: number): void {
        this.databaseOverrides.delete(userId);
        this.invalidateUserCache(userId);
        console.log(`[RBAC] Database override removed for user ${userId}`);
    }

    /**
     * Gets database override for a user
     */
    getDatabaseOverride(userId: number): DatabaseRoleOverride | undefined {
        return this.databaseOverrides.get(userId);
    }

    /**
     * Checks if user has a specific permission
     */
    hasPermission(permissions: Permission, requiredPermission: string): boolean {
        return permissions[requiredPermission] === true;
    }

    /**
     * Checks if user has all of multiple permissions
     */
    hasAllPermissions(permissions: Permission, requiredPermissions: string[]): boolean {
        return requiredPermissions.every((p) => this.hasPermission(permissions, p));
    }

    /**
     * Checks if user has any of multiple permissions
     */
    hasAnyPermission(permissions: Permission, requiredPermissions: string[]): boolean {
        return requiredPermissions.some((p) => this.hasPermission(permissions, p));
    }

    /**
     * Gets role object from configuration
     */
    getRole(roleName: string): Role | undefined {
        return this.rolesPermissionsMap.get(roleName.toUpperCase());
    }

    /**
     * Gets all known roles
     */
    getAllRoles(): string[] {
        return [...this.knownRoles];
    }

    /**
     * Gets all roles with their permissions
     */
    getAllRolesWithPermissions(): Role[] {
        return Array.from(this.rolesPermissionsMap.values());
    }

    /**
     * Validates that roles exist in configuration
     */
    validateRoles(roles: string[]): { valid: boolean; invalid: string[] } {
        const invalid = roles.filter((r) => !this.knownRoles.includes(r.toUpperCase()));
        return {
            valid: invalid.length === 0,
            invalid,
        };
    }

    /**
     * Gets permission names for a role
     */
    getRolePermissions(roleName: string): string[] {
        const role = this.getRole(roleName);
        if (!role) {
            return [];
        }
        return Object.keys(role.permissions);
    }

    /**
     * Gets granted permissions for a role (where value is true)
     */
    getGrantedPermissions(roleName: string): string[] {
        const role = this.getRole(roleName);
        if (!role) {
            return [];
        }
        return Object.entries(role.permissions)
            .filter(([_, granted]) => granted === true)
            .map(([perm, _]) => perm);
    }
}

/**
 * Factory function to create a RoleResolver instance
 */
export function createRoleResolver(config: RoleResolverConfig): RoleResolver {
    return new RoleResolver(config);
}

// Singleton instance (optional, can be used for dependency injection)
let globalRoleResolver: RoleResolver | null = null;

/**
 * Initializes global role resolver instance
 */
export function initializeGlobalRoleResolver(config: RoleResolverConfig): RoleResolver {
    globalRoleResolver = new RoleResolver(config);
    console.log('[RBAC] Global role resolver initialized');
    return globalRoleResolver;
}

/**
 * Gets global role resolver instance
 */
export function getGlobalRoleResolver(): RoleResolver {
    if (!globalRoleResolver) {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, { reason: 'Global role resolver not initialized. Call initializeGlobalRoleResolver first.' });
    }
    return globalRoleResolver;
}
