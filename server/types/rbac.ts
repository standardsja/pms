/**
 * Type Definitions for RBAC System
 * Defines interfaces for Users, Roles, Permissions, LDAP data, and Role Resolver configuration
 */

/**
 * Permission flags - normalized permission model
 */
export interface Permission {
    [key: string]: boolean;
}

/**
 * Internal Role definition
 */
export interface Role {
    name: string;
    description: string;
    permissions: Permission;
}

/**
 * User representation with resolved roles and permissions
 */
export interface User {
    sub: number; // Internal user ID
    email: string;
    name?: string;
    roles: string[]; // Array of role names
    permissions?: Permission; // Aggregated permissions from all roles
}

/**
 * LDAP User entry from directory
 */
export interface LDAPUser {
    dn: string; // Distinguished Name
    cn: string; // Common Name
    uid?: string; // User ID
    mail?: string; // Email
    displayName?: string; // Display Name
    title?: string; // Job title
    department?: string; // Department
    memberOf?: string[]; // Array of group DNs the user belongs to
    departmentCode?: string; // Department code for attribute-based mapping
    [key: string]: any; // Allow other LDAP attributes
}

/**
 * Resolved role result from LDAP
 */
export interface ResolvedRole {
    role: string;
    source: 'ldap_group' | 'ldap_attribute' | 'database_override' | 'default';
    ldapGroup?: string; // If resolved from LDAP group
    ldapAttribute?: string; // If resolved from LDAP attribute
    overriddenByDatabase?: boolean; // If this role was overridden by database
}

/**
 * Database role override entry
 */
export interface DatabaseRoleOverride {
    userId: number;
    rolesToAdd?: string[]; // Roles to add in addition to LDAP-resolved roles
    rolesToRemove?: string[]; // Roles to remove that were resolved from LDAP
    overriddenRoles?: string[]; // Complete set of roles if overriding entirely
    expiresAt?: Date; // When this override expires
}

/**
 * Configuration for LDAP group to role mapping
 */
export interface LDAPGroupMapping {
    [ldapGroupDN: string]: string; // Maps LDAP group DN to internal role name
}

/**
 * Configuration for LDAP attribute to role mapping
 * Maps LDAP attribute names and values to internal roles
 */
export interface LDAPAttributeMapping {
    [attributeName: string]: {
        [attributeValue: string]: string; // Maps attribute value to role name
    };
}

/**
 * Configuration for role resolver
 */
export interface RoleResolverConfig {
    rolesPermissionsPath: string; // Path to roles-permissions.json config file
    ldapGroupMappings: LDAPGroupMapping;
    ldapAttributeMappings: LDAPAttributeMapping;
    cacheTTL?: number; // Cache TTL in milliseconds, default 3600000 (1 hour)
    defaultRole?: string; // Default role if no roles can be resolved (default: REQUESTER)
    enableDatabaseOverrides?: boolean; // Whether to check database for role overrides
}

/**
 * Resolved permissions result
 */
export interface ResolvedPermissions {
    userId: number;
    roles: string[];
    permissions: Permission;
    resolvedAt: Date;
    expiresAt?: Date;
    source: 'cache' | 'resolved';
}

/**
 * Role resolution result
 */
export interface RoleResolutionResult {
    userId: number;
    email: string;
    ldapUser?: LDAPUser;
    resolvedRoles: ResolvedRole[];
    finalRoles: string[];
    permissions: Permission;
    resolvedAt: Date;
    errors?: string[]; // Any warnings or errors encountered during resolution
}

/**
 * Options for resolving roles
 */
export interface RoleResolutionOptions {
    skipCache?: boolean; // Skip cache and force fresh resolution
    includeLDAPData?: boolean; // Include LDAP user data in response
    validateAttributes?: boolean; // Validate LDAP attributes
}

/**
 * Cache entry for resolved roles/permissions
 */
export interface CacheEntry<T> {
    data: T;
    createdAt: Date;
    expiresAt: Date;
}

/**
 * LDAP resolution error types
 */
export enum LDAPResolutionError {
    MALFORMED_DN = 'MALFORMED_DN',
    MISSING_MEMBERSHIP_DATA = 'MISSING_MEMBERSHIP_DATA',
    UNMAPPED_GROUP = 'UNMAPPED_GROUP',
    UNMAPPED_ATTRIBUTE = 'UNMAPPED_ATTRIBUTE',
    INVALID_LDAP_USER = 'INVALID_LDAP_USER',
    DATABASE_ERROR = 'DATABASE_ERROR',
    CONFIG_ERROR = 'CONFIG_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
}

/**
 * Structured error for LDAP/role resolution
 */
export class RoleResolutionException extends Error {
    constructor(public errorType: LDAPResolutionError, public userId: number, public details: Record<string, any> = {}) {
        super(`Role Resolution Error [${errorType}] for user ${userId}`);
        this.name = 'RoleResolutionException';
    }
}

/**
 * RBAC Policy check result
 */
export interface PolicyCheckResult {
    allowed: boolean;
    reason?: string;
    requiredPermission?: string;
    userPermissions?: string[];
}
