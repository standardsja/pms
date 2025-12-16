/**
 * LDAP Group Mapper Utility
 * Maps LDAP group memberships and attributes to internal role names
 */

import { LDAPUser, ResolvedRole, LDAPGroupMapping, LDAPAttributeMapping } from '../types/rbac.js';
import { validateMemberOf, validateLDAPAttribute, validateRoleName, parseDN } from './rbacValidation.js';
import { LDAPResolutionError, RoleResolutionException } from '../types/rbac.js';

/**
 * Maps LDAP groups to internal roles
 */
export class LDAPGroupMapper {
    constructor(private groupMappings: LDAPGroupMapping, private attributeMappings: LDAPAttributeMapping, private knownRoles: string[]) {}

    /**
     * Resolves roles from LDAP user's group memberships
     */
    resolveFromGroups(ldapUser: LDAPUser, userId: number): ResolvedRole[] {
        const resolvedRoles: ResolvedRole[] = [];

        if (!ldapUser.memberOf) {
            return resolvedRoles;
        }

        try {
            const groups = validateMemberOf(ldapUser.memberOf, userId);

            for (const groupDN of groups) {
                const role = this.groupMappings[groupDN];

                if (role) {
                    // Validate role name
                    if (this.knownRoles.includes(role.toUpperCase())) {
                        resolvedRoles.push({
                            role: role.toUpperCase(),
                            source: 'ldap_group',
                            ldapGroup: groupDN,
                        });
                    } else {
                        console.warn(`[RBAC] Mapped role from group ${groupDN} is not a known role: ${role}`);
                    }
                } else {
                    console.debug(`[RBAC] User ${userId} is member of unmapped group: ${groupDN}`);
                }
            }
        } catch (error) {
            if (error instanceof RoleResolutionException) {
                console.warn(`[RBAC] Error processing groups for user ${userId}: ${error.message}`);
            }
        }

        return resolvedRoles;
    }

    /**
     * Resolves roles from LDAP user attributes
     */
    resolveFromAttributes(ldapUser: LDAPUser, userId: number): ResolvedRole[] {
        const resolvedRoles: ResolvedRole[] = [];

        for (const [attributeName, mappingValues] of Object.entries(this.attributeMappings)) {
            const attributeValue = (ldapUser as Record<string, any>)[attributeName];

            if (!attributeValue) {
                continue;
            }

            const validatedValue = validateLDAPAttribute(attributeValue, attributeName, userId);

            if (!validatedValue) {
                continue;
            }

            const role = mappingValues[validatedValue];

            if (role) {
                if (this.knownRoles.includes(role.toUpperCase())) {
                    resolvedRoles.push({
                        role: role.toUpperCase(),
                        source: 'ldap_attribute',
                        ldapAttribute: `${attributeName}=${validatedValue}`,
                    });
                } else {
                    console.warn(`[RBAC] Mapped role from attribute ${attributeName}=${validatedValue} is not a known role: ${role}`);
                }
            } else {
                console.debug(`[RBAC] User ${userId} has unmapped attribute value: ${attributeName}=${validatedValue}`);
            }
        }

        return resolvedRoles;
    }

    /**
     * Resolves all roles from LDAP user
     */
    resolveAllFromLDAP(ldapUser: LDAPUser, userId: number): ResolvedRole[] {
        const rolesFromGroups = this.resolveFromGroups(ldapUser, userId);
        const rolesFromAttributes = this.resolveFromAttributes(ldapUser, userId);

        // Combine and deduplicate by role name
        const allRoles = [...rolesFromGroups, ...rolesFromAttributes];
        const uniqueRoles = new Map<string, ResolvedRole>();

        for (const resolvedRole of allRoles) {
            uniqueRoles.set(resolvedRole.role, resolvedRole);
        }

        return Array.from(uniqueRoles.values());
    }

    /**
     * Extracts role names from resolved roles
     */
    extractRoleNames(resolvedRoles: ResolvedRole[]): string[] {
        return resolvedRoles.map((r) => r.role).filter(Boolean);
    }

    /**
     * Checks if a specific role was resolved
     */
    hasRole(resolvedRoles: ResolvedRole[], roleName: string): boolean {
        return resolvedRoles.some((r) => r.role === roleName.toUpperCase());
    }

    /**
     * Gets all resolved roles from a specific source
     */
    getRolesBySource(resolvedRoles: ResolvedRole[], source: 'ldap_group' | 'ldap_attribute'): ResolvedRole[] {
        return resolvedRoles.filter((r) => r.source === source);
    }

    /**
     * Validates resolved roles against known roles
     */
    validateResolvedRoles(resolvedRoles: ResolvedRole[]): string[] {
        return resolvedRoles.filter((r) => this.knownRoles.includes(r.role.toUpperCase())).map((r) => r.role.toUpperCase());
    }

    /**
     * Logs resolved roles for debugging
     */
    logResolution(ldapUser: LDAPUser, resolvedRoles: ResolvedRole[], userId: number): void {
        const roleNames = this.extractRoleNames(resolvedRoles);

        console.log(`[RBAC] Resolution for user ${userId} (${ldapUser.mail || ldapUser.cn}):`);
        console.log(
            `  - Group-based roles: ${
                resolvedRoles
                    .filter((r) => r.source === 'ldap_group')
                    .map((r) => r.role)
                    .join(', ') || 'none'
            }`
        );
        console.log(
            `  - Attribute-based roles: ${
                resolvedRoles
                    .filter((r) => r.source === 'ldap_attribute')
                    .map((r) => r.role)
                    .join(', ') || 'none'
            }`
        );
        console.log(`  - Final roles: ${roleNames.join(', ') || 'none'}`);
    }
}

/**
 * Factory function to create a preconfigured LDAP group mapper
 */
export function createLDAPGroupMapper(groupMappings: LDAPGroupMapping, attributeMappings: LDAPAttributeMapping, knownRoles: string[]): LDAPGroupMapper {
    return new LDAPGroupMapper(groupMappings, attributeMappings, knownRoles);
}
