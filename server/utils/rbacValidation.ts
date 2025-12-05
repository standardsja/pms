/**
 * Error handling and validation utilities for RBAC system
 */

import { LDAPResolutionError, RoleResolutionException, LDAPUser } from '../types/rbac';

/**
 * Validates LDAP user data structure
 * @throws RoleResolutionException if validation fails
 */
export function validateLDAPUser(ldapUser: any, userId: number): void {
    if (!ldapUser) {
        throw new RoleResolutionException(LDAPResolutionError.INVALID_LDAP_USER, userId, { reason: 'LDAP user object is null or undefined' });
    }

    if (typeof ldapUser !== 'object') {
        throw new RoleResolutionException(LDAPResolutionError.INVALID_LDAP_USER, userId, { reason: 'LDAP user must be an object', actualType: typeof ldapUser });
    }

    if (!ldapUser.dn || typeof ldapUser.dn !== 'string') {
        throw new RoleResolutionException(LDAPResolutionError.INVALID_LDAP_USER, userId, { reason: 'LDAP user missing or invalid DN', dn: ldapUser.dn });
    }

    if (!ldapUser.cn || typeof ldapUser.cn !== 'string') {
        throw new RoleResolutionException(LDAPResolutionError.INVALID_LDAP_USER, userId, { reason: 'LDAP user missing or invalid CN', cn: ldapUser.cn });
    }
}

/**
 * Validates LDAP distinguished name format
 * @throws RoleResolutionException if DN is malformed
 */
export function validateLDAPDN(dn: string, userId: number): void {
    if (!dn || typeof dn !== 'string') {
        throw new RoleResolutionException(LDAPResolutionError.MALFORMED_DN, userId, { reason: 'DN is null, undefined, or not a string' });
    }

    // Basic DN validation: should contain at least one '=' and one ','
    if (!dn.includes('=') || !dn.includes(',')) {
        throw new RoleResolutionException(LDAPResolutionError.MALFORMED_DN, userId, { reason: 'DN does not follow standard format (cn=value,ou=...)', dn });
    }

    // Check for common DN component format
    const dnRegex = /^[a-zA-Z]{1,3}=[^,]+(?:,[a-zA-Z]{1,3}=[^,]+)*$/;
    if (!dnRegex.test(dn)) {
        throw new RoleResolutionException(LDAPResolutionError.MALFORMED_DN, userId, { reason: 'DN does not match expected format pattern', dn });
    }
}

/**
 * Parses LDAP DN into components
 * Example: cn=admin,ou=users,dc=company,dc=com
 * Returns: { cn: 'admin', ou: 'users', dc: 'company' }
 */
export function parseDN(dn: string): Record<string, string> {
    const components: Record<string, string> = {};
    const parts = dn.split(',');

    for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key && value) {
            components[key.toLowerCase()] = value;
        }
    }

    return components;
}

/**
 * Validates LDAP group membership data
 */
export function validateMemberOf(memberOf: any, userId: number): string[] {
    if (!memberOf) {
        return [];
    }

    // Handle both single group and array of groups
    const groupArray = Array.isArray(memberOf) ? memberOf : [memberOf];

    const validGroups: string[] = [];

    for (const group of groupArray) {
        try {
            if (typeof group !== 'string') {
                console.warn(`[RBAC] Invalid memberOf entry for user ${userId}: not a string`, group);
                continue;
            }

            validateLDAPDN(group, userId);
            validGroups.push(group);
        } catch (error) {
            if (error instanceof RoleResolutionException) {
                console.warn(`[RBAC] Invalid group DN for user ${userId}: ${error.message}`);
            }
        }
    }

    if (validGroups.length === 0 && groupArray.length > 0) {
        throw new RoleResolutionException(LDAPResolutionError.MISSING_MEMBERSHIP_DATA, userId, {
            reason: 'No valid groups found in memberOf',
            originalCount: groupArray.length,
        });
    }

    return validGroups;
}

/**
 * Validates LDAP attribute value
 */
export function validateLDAPAttribute(attributeValue: any, attributeName: string, userId: number): string | null {
    if (!attributeValue) {
        return null;
    }

    if (typeof attributeValue !== 'string') {
        console.warn(`[RBAC] Invalid LDAP attribute ${attributeName} for user ${userId}: not a string`, attributeValue);
        return null;
    }

    if (attributeValue.trim().length === 0) {
        return null;
    }

    return attributeValue.trim();
}

/**
 * Validates resolved roles array
 */
export function validateResolvedRoles(roles: string[], userId: number): string[] {
    if (!Array.isArray(roles)) {
        throw new RoleResolutionException(LDAPResolutionError.INVALID_LDAP_USER, userId, { reason: 'Resolved roles is not an array', type: typeof roles });
    }

    const validRoles = roles.filter((role) => {
        if (typeof role !== 'string') {
            console.warn(`[RBAC] Invalid role type for user ${userId}: expected string, got ${typeof role}`);
            return false;
        }

        if (role.trim().length === 0) {
            console.warn(`[RBAC] Empty role string for user ${userId}`);
            return false;
        }

        return true;
    });

    return validRoles.map((r) => r.trim().toUpperCase());
}

/**
 * Validates permissions object
 */
export function validatePermissions(permissions: any, userId: number): boolean {
    if (!permissions || typeof permissions !== 'object') {
        throw new RoleResolutionException(LDAPResolutionError.INVALID_LDAP_USER, userId, {
            reason: 'Permissions must be an object',
            type: typeof permissions,
        });
    }

    // Validate all values are booleans
    for (const [key, value] of Object.entries(permissions)) {
        if (typeof value !== 'boolean') {
            console.warn(`[RBAC] Invalid permission type for user ${userId}, permission ${key}: expected boolean, got ${typeof value}`);
        }
    }

    return true;
}

/**
 * Validates role name against known roles
 */
export function validateRoleName(roleName: string, knownRoles: string[], userId: number, throwOnMissing: boolean = false): boolean {
    const normalizedRole = roleName.toUpperCase();

    if (!knownRoles.includes(normalizedRole)) {
        const error = new RoleResolutionException(LDAPResolutionError.UNMAPPED_GROUP, userId, { reason: 'Role not found in known roles', roleName: normalizedRole });

        if (throwOnMissing) {
            throw error;
        } else {
            console.warn(`[RBAC] ${error.message}`);
            return false;
        }
    }

    return true;
}

/**
 * Validates configuration object
 */
export function validateConfig(config: any): void {
    if (!config || typeof config !== 'object') {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, { reason: 'Config must be an object', type: typeof config });
    }

    if (!config.rolesPermissionsPath || typeof config.rolesPermissionsPath !== 'string') {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, {
            reason: 'Config must include rolesPermissionsPath as string',
            provided: config.rolesPermissionsPath,
        });
    }

    if (!config.ldapGroupMappings || typeof config.ldapGroupMappings !== 'object') {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, {
            reason: 'Config must include ldapGroupMappings as object',
            provided: typeof config.ldapGroupMappings,
        });
    }

    if (!config.ldapAttributeMappings || typeof config.ldapAttributeMappings !== 'object') {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, {
            reason: 'Config must include ldapAttributeMappings as object',
            provided: typeof config.ldapAttributeMappings,
        });
    }

    if (config.cacheTTL !== undefined && typeof config.cacheTTL !== 'number') {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, {
            reason: 'Config cacheTTL must be a number (milliseconds)',
            provided: typeof config.cacheTTL,
        });
    }

    if (config.cacheTTL !== undefined && config.cacheTTL < 0) {
        throw new RoleResolutionException(LDAPResolutionError.CONFIG_ERROR, 0, {
            reason: 'Config cacheTTL must be a positive number',
            provided: config.cacheTTL,
        });
    }
}

/**
 * Handles and logs resolution errors
 */
export function handleResolutionError(error: unknown, userId: number, context: string = 'Role Resolution'): void {
    if (error instanceof RoleResolutionException) {
        console.error(`[RBAC] ${context} failed for user ${userId}:`, error.errorType, error.details);
    } else if (error instanceof Error) {
        console.error(`[RBAC] ${context} error for user ${userId}:`, error.message);
    } else {
        console.error(`[RBAC] ${context} unknown error for user ${userId}:`, error);
    }
}

/**
 * Sanitizes role name for logging
 */
export function sanitizeRoleName(roleName: string): string {
    return (roleName || '')
        .trim()
        .substring(0, 100)
        .replace(/[^a-zA-Z0-9_-]/g, '_');
}
