/**
 * Unit Tests for Role Resolver and RBAC System
 * Tests cover: LDAP mapping, role resolution, permission aggregation, caching, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoleResolver, createRoleResolver, initializeGlobalRoleResolver, getGlobalRoleResolver } from '../services/roleResolver';
import { LDAPGroupMapper } from '../utils/ldapGroupMapper';
import { validateLDAPUser, validateLDAPDN, validateMemberOf, validateLDAPAttribute, validateResolvedRoles, parseDN } from '../utils/rbacValidation';
import { LDAPResolutionError, RoleResolutionException, LDAPUser, RoleResolverConfig } from '../types/rbac';
import path from 'path';

// Mock LDAP Users
const mockLDAPUsers = {
    procurementOfficer: {
        dn: 'cn=john.doe,ou=procurement,dc=company,dc=com',
        cn: 'john.doe',
        uid: 'johndoe',
        mail: 'john.doe@company.com',
        displayName: 'John Doe',
        title: 'Procurement Officer',
        department: 'Procurement',
        memberOf: ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=all-staff,ou=roles,dc=company,dc=com'],
    } as LDAPUser,

    departmentHead: {
        dn: 'cn=jane.smith,ou=departments,dc=company,dc=com',
        cn: 'jane.smith',
        uid: 'janesmith',
        mail: 'jane.smith@company.com',
        displayName: 'Jane Smith',
        title: 'Department Head',
        memberOf: ['cn=department-heads,ou=roles,dc=company,dc=com', 'cn=all-staff,ou=roles,dc=company,dc=com'],
    } as LDAPUser,

    regular: {
        dn: 'cn=bob.wilson,ou=staff,dc=company,dc=com',
        cn: 'bob.wilson',
        uid: 'bobwilson',
        mail: 'bob.wilson@company.com',
        displayName: 'Bob Wilson',
        title: 'Staff Member',
        memberOf: ['cn=all-staff,ou=roles,dc=company,dc=com'],
    } as LDAPUser,

    noGroups: {
        dn: 'cn=alice.brown,ou=staff,dc=company,dc=com',
        cn: 'alice.brown',
        uid: 'alicebrown',
        mail: 'alice.brown@company.com',
        displayName: 'Alice Brown',
        title: 'New Employee',
    } as LDAPUser,
};

// Mock Configuration
const mockConfig: RoleResolverConfig = {
    rolesPermissionsPath: path.resolve(__dirname, '../../config/roles-permissions.json'),
    ldapGroupMappings: {
        'cn=procurement-officers,ou=roles,dc=company,dc=com': 'PROCUREMENT_OFFICER',
        'cn=procurement-managers,ou=roles,dc=company,dc=com': 'PROCUREMENT_MANAGER',
        'cn=finance-officers,ou=roles,dc=company,dc=com': 'FINANCE_OFFICER',
        'cn=finance-payment,ou=roles,dc=company,dc=com': 'FINANCE_PAYMENT_STAGE',
        'cn=department-heads,ou=roles,dc=company,dc=com': 'DEPARTMENT_HEAD',
        'cn=executive-directors,ou=roles,dc=company,dc=com': 'EXECUTIVE_DIRECTOR',
        'cn=senior-directors,ou=roles,dc=company,dc=com': 'SENIOR_DIRECTOR',
        'cn=auditors,ou=roles,dc=company,dc=com': 'AUDITOR',
    },
    ldapAttributeMappings: {
        title: {
            'Procurement Officer': 'PROCUREMENT_OFFICER',
            'Procurement Manager': 'PROCUREMENT_MANAGER',
            'Finance Officer': 'FINANCE_OFFICER',
            'Department Head': 'DEPARTMENT_HEAD',
            'Executive Director': 'EXECUTIVE_DIRECTOR',
            'Senior Director': 'SENIOR_DIRECTOR',
            Auditor: 'AUDITOR',
        },
    },
    cacheTTL: 60000, // 1 minute for testing
    defaultRole: 'REQUESTER',
    enableDatabaseOverrides: true,
};

describe('RoleResolver', () => {
    let resolver: RoleResolver;

    beforeEach(() => {
        resolver = createRoleResolver(mockConfig);
    });

    afterEach(() => {
        resolver.clearCache();
    });

    describe('Initialization', () => {
        it('should initialize with valid config', () => {
            expect(resolver).toBeDefined();
            expect(resolver.getAllRoles().length).toBeGreaterThan(0);
        });

        it('should load all known roles', () => {
            const roles = resolver.getAllRoles();
            expect(roles).toContain('PROCUREMENT_OFFICER');
            expect(roles).toContain('DEPARTMENT_HEAD');
            expect(roles).toContain('REQUESTER');
        });

        it('should load role permissions', () => {
            const role = resolver.getRole('PROCUREMENT_OFFICER');
            expect(role).toBeDefined();
            expect(role?.permissions).toBeDefined();
            expect(role?.permissions['request:read_all']).toBe(true);
        });
    });

    describe('LDAP User Validation', () => {
        it('should validate valid LDAP user', () => {
            expect(() => validateLDAPUser(mockLDAPUsers.procurementOfficer, 1)).not.toThrow();
        });

        it('should throw on null LDAP user', () => {
            expect(() => validateLDAPUser(null, 1)).toThrow(RoleResolutionException);
        });

        it('should throw on missing DN', () => {
            const invalid = { ...mockLDAPUsers.procurementOfficer, dn: null };
            expect(() => validateLDAPUser(invalid, 1)).toThrow(RoleResolutionException);
        });

        it('should throw on missing CN', () => {
            const invalid = { ...mockLDAPUsers.procurementOfficer, cn: null };
            expect(() => validateLDAPUser(invalid, 1)).toThrow(RoleResolutionException);
        });
    });

    describe('DN Validation and Parsing', () => {
        it('should validate valid DN', () => {
            expect(() => validateLDAPDN('cn=john.doe,ou=procurement,dc=company,dc=com', 1)).not.toThrow();
        });

        it('should throw on malformed DN', () => {
            expect(() => validateLDAPDN('invalid-dn', 1)).toThrow(RoleResolutionException);
        });

        it('should parse DN correctly', () => {
            const dn = 'cn=john.doe,ou=procurement,dc=company,dc=com';
            const parsed = parseDN(dn);
            expect(parsed.cn).toBe('john.doe');
            expect(parsed.ou).toBe('procurement');
            expect(parsed.dc).toBe('company');
        });

        it('should handle DN with multiple DC components', () => {
            const dn = 'cn=user,ou=dept,dc=company,dc=com';
            const parsed = parseDN(dn);
            expect(parsed.cn).toBe('user');
            expect(parsed.ou).toBe('dept');
        });
    });

    describe('Member Of Validation', () => {
        it('should validate valid memberOf array', () => {
            const groups = ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=all-staff,ou=roles,dc=company,dc=com'];
            const result = validateMemberOf(groups, 1);
            expect(result).toHaveLength(2);
        });

        it('should return empty array for null memberOf', () => {
            const result = validateMemberOf(null, 1);
            expect(result).toEqual([]);
        });

        it('should handle single group string', () => {
            const result = validateMemberOf('cn=procurement-officers,ou=roles,dc=company,dc=com', 1);
            expect(result).toHaveLength(1);
        });

        it('should filter invalid groups', () => {
            const groups = ['cn=valid-group,ou=roles,dc=company,dc=com', 'invalid-group'];
            expect(() => validateMemberOf(groups, 1)).toThrow();
        });
    });

    describe('Attribute Validation', () => {
        it('should validate valid LDAP attribute', () => {
            const result = validateLDAPAttribute('Procurement Officer', 'title', 1);
            expect(result).toBe('Procurement Officer');
        });

        it('should return null for null attribute', () => {
            const result = validateLDAPAttribute(null, 'title', 1);
            expect(result).toBeNull();
        });

        it('should trim whitespace', () => {
            const result = validateLDAPAttribute('  Procurement Officer  ', 'title', 1);
            expect(result).toBe('Procurement Officer');
        });

        it('should return null for empty string', () => {
            const result = validateLDAPAttribute('   ', 'title', 1);
            expect(result).toBeNull();
        });

        it('should return null for non-string attribute', () => {
            const result = validateLDAPAttribute(12345, 'title', 1);
            expect(result).toBeNull();
        });
    });

    describe('Role Resolution from LDAP', () => {
        it('should resolve role from group membership', async () => {
            const result = await resolver.resolveRolesAndPermissions(1, 'john.doe@company.com', mockLDAPUsers.procurementOfficer);

            expect(result.finalRoles).toContain('PROCUREMENT_OFFICER');
            expect(result.permissions['request:read_all']).toBe(true);
        });

        it('should resolve role from LDAP attribute', async () => {
            const ldapUser = { ...mockLDAPUsers.regular };
            ldapUser.title = 'Department Head';
            ldapUser.memberOf = [];

            const result = await resolver.resolveRolesAndPermissions(2, 'test@company.com', ldapUser);

            expect(result.finalRoles).toContain('DEPARTMENT_HEAD');
        });

        it('should assign default role when no roles resolved', async () => {
            const result = await resolver.resolveRolesAndPermissions(3, 'alice.brown@company.com', mockLDAPUsers.noGroups);

            expect(result.finalRoles).toContain('REQUESTER');
        });

        it('should resolve multiple roles', async () => {
            const ldapUser: LDAPUser = {
                ...mockLDAPUsers.procurementOfficer,
                memberOf: ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=finance-officers,ou=roles,dc=company,dc=com'],
            };

            const result = await resolver.resolveRolesAndPermissions(4, 'multi@company.com', ldapUser);

            expect(result.finalRoles).toContain('PROCUREMENT_OFFICER');
            expect(result.finalRoles).toContain('FINANCE_OFFICER');
        });

        it('should deduplicate roles', async () => {
            const ldapUser: LDAPUser = {
                ...mockLDAPUsers.procurementOfficer,
                memberOf: ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=procurement-officers,ou=roles,dc=company,dc=com'],
            };

            const result = await resolver.resolveRolesAndPermissions(5, 'dup@company.com', ldapUser);

            const procOfficerCount = result.finalRoles.filter((r) => r === 'PROCUREMENT_OFFICER').length;
            expect(procOfficerCount).toBe(1);
        });
    });

    describe('Permission Aggregation', () => {
        it('should aggregate permissions from single role', async () => {
            const result = await resolver.resolveRolesAndPermissions(6, 'procurement@company.com', mockLDAPUsers.procurementOfficer);

            // Procurement officer should have specific permissions
            expect(result.permissions['request:read_all']).toBe(true);
            expect(result.permissions['vendor:create']).toBe(true);
            expect(result.permissions['admin:manage_users']).toBe(false);
        });

        it('should aggregate permissions from multiple roles', async () => {
            const ldapUser: LDAPUser = {
                ...mockLDAPUsers.procurementOfficer,
                memberOf: ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=auditors,ou=roles,dc=company,dc=com'],
            };

            const result = await resolver.resolveRolesAndPermissions(7, 'multi-role@company.com', ldapUser);

            // Should have permissions from both roles
            expect(result.permissions['request:read_all']).toBe(true);
            expect(result.permissions['vendor:create']).toBe(true);
        });

        it('should grant permission if any role grants it', async () => {
            const ldapUser: LDAPUser = {
                ...mockLDAPUsers.procurementOfficer,
                memberOf: ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=department-heads,ou=roles,dc=company,dc=com'],
            };

            const result = await resolver.resolveRolesAndPermissions(8, 'multi@company.com', ldapUser);

            // Both roles should be able to approve
            expect(result.permissions['request:approve']).toBe(true);
        });
    });

    describe('Permission Checking', () => {
        it('should check single permission', async () => {
            const result = await resolver.resolveRolesAndPermissions(9, 'test@company.com', mockLDAPUsers.procurementOfficer);

            expect(resolver.hasPermission(result.permissions, 'request:read_all')).toBe(true);
            expect(resolver.hasPermission(result.permissions, 'admin:manage_users')).toBe(false);
        });

        it('should check all permissions', async () => {
            const result = await resolver.resolveRolesAndPermissions(10, 'test@company.com', mockLDAPUsers.procurementOfficer);

            expect(resolver.hasAllPermissions(result.permissions, ['request:read_all', 'request:approve'])).toBe(true);

            expect(resolver.hasAllPermissions(result.permissions, ['request:read_all', 'admin:manage_users'])).toBe(false);
        });

        it('should check any permission', async () => {
            const result = await resolver.resolveRolesAndPermissions(11, 'test@company.com', mockLDAPUsers.procurementOfficer);

            expect(resolver.hasAnyPermission(result.permissions, ['admin:manage_users', 'request:read_all'])).toBe(true);

            expect(resolver.hasAnyPermission(result.permissions, ['admin:manage_users', 'admin:manage_roles'])).toBe(false);
        });
    });

    describe('Caching', () => {
        it('should cache resolved permissions', async () => {
            const result1 = await resolver.resolveRolesAndPermissions(12, 'cache-test@company.com', mockLDAPUsers.procurementOfficer);
            expect(result1.resolvedAt).toBeDefined();

            const stats = resolver.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);
        });

        it('should return cached result on subsequent calls', async () => {
            const result1 = await resolver.resolveRolesAndPermissions(13, 'cache-test@company.com', mockLDAPUsers.procurementOfficer);

            const result2 = await resolver.resolveRolesAndPermissions(13, 'cache-test@company.com', mockLDAPUsers.procurementOfficer);

            // Results should be identical
            expect(result2.finalRoles).toEqual(result1.finalRoles);
            expect(result2.permissions).toEqual(result1.permissions);
        });

        it('should skip cache when requested', async () => {
            await resolver.resolveRolesAndPermissions(14, 'skip-cache@company.com', mockLDAPUsers.procurementOfficer);

            const result = await resolver.resolveRolesAndPermissions(14, 'skip-cache@company.com', mockLDAPUsers.procurementOfficer, { skipCache: true });

            expect(result).toBeDefined();
        });

        it('should invalidate cache for user', async () => {
            await resolver.resolveRolesAndPermissions(15, 'invalidate@company.com', mockLDAPUsers.procurementOfficer);

            let stats = resolver.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);

            resolver.invalidateUserCache(15);

            stats = resolver.getCacheStats();
            expect(stats.entries).not.toContain('15');
        });

        it('should clear entire cache', async () => {
            await resolver.resolveRolesAndPermissions(16, 'clear@company.com', mockLDAPUsers.procurementOfficer);

            resolver.clearCache();
            const stats = resolver.getCacheStats();
            expect(stats.size).toBe(0);
        });
    });

    describe('Database Overrides', () => {
        it('should apply database role override', async () => {
            // Set override to add ADMIN-like permissions
            resolver.setDatabaseOverride({
                userId: 17,
                rolesToAdd: ['AUDITOR'],
            });

            const result = await resolver.resolveRolesAndPermissions(17, 'override@company.com', mockLDAPUsers.procurementOfficer, { skipCache: true });

            expect(result.finalRoles).toContain('PROCUREMENT_OFFICER');
            expect(result.finalRoles).toContain('AUDITOR');
        });

        it('should remove roles via override', async () => {
            resolver.setDatabaseOverride({
                userId: 18,
                rolesToRemove: ['PROCUREMENT_OFFICER'],
            });

            const result = await resolver.resolveRolesAndPermissions(18, 'remove@company.com', mockLDAPUsers.procurementOfficer, { skipCache: true });

            expect(result.finalRoles).not.toContain('PROCUREMENT_OFFICER');
        });

        it('should completely override roles', async () => {
            resolver.setDatabaseOverride({
                userId: 19,
                overriddenRoles: ['AUDITOR'],
            });

            const result = await resolver.resolveRolesAndPermissions(19, 'complete-override@company.com', mockLDAPUsers.procurementOfficer, { skipCache: true });

            expect(result.finalRoles).toEqual(['AUDITOR']);
        });

        it('should remove database override', async () => {
            resolver.setDatabaseOverride({
                userId: 20,
                rolesToAdd: ['AUDITOR'],
            });

            resolver.removeDatabaseOverride(20);

            const result = await resolver.resolveRolesAndPermissions(20, 'removed@company.com', mockLDAPUsers.procurementOfficer, { skipCache: true });

            expect(result.finalRoles).not.toContain('AUDITOR');
        });
    });

    describe('Role Information', () => {
        it('should retrieve role object', () => {
            const role = resolver.getRole('PROCUREMENT_OFFICER');
            expect(role).toBeDefined();
            expect(role?.name).toBe('PROCUREMENT_OFFICER');
            expect(role?.permissions).toBeDefined();
        });

        it('should get all roles', () => {
            const roles = resolver.getAllRoles();
            expect(roles.length).toBeGreaterThan(0);
            expect(roles).toContain('PROCUREMENT_OFFICER');
            expect(roles).toContain('REQUESTER');
        });

        it('should get all roles with permissions', () => {
            const rolesWithPerms = resolver.getAllRolesWithPermissions();
            expect(rolesWithPerms.length).toBeGreaterThan(0);
            expect(rolesWithPerms[0]).toHaveProperty('permissions');
        });

        it('should validate role names', () => {
            const result = resolver.validateRoles(['PROCUREMENT_OFFICER', 'INVALID_ROLE']);
            expect(result.valid).toBe(false);
            expect(result.invalid).toContain('INVALID_ROLE');
        });

        it('should get role permissions', () => {
            const perms = resolver.getRolePermissions('PROCUREMENT_OFFICER');
            expect(perms.length).toBeGreaterThan(0);
            expect(perms).toContain('request:read_all');
        });

        it('should get granted permissions for role', () => {
            const granted = resolver.getGrantedPermissions('PROCUREMENT_OFFICER');
            expect(granted).toContain('request:read_all');
            expect(granted).not.toContain('admin:manage_users');
        });
    });

    describe('Error Handling', () => {
        it('should throw on invalid config', () => {
            const invalidConfig = { ...mockConfig, rolesPermissionsPath: '/invalid/path' };
            expect(() => new RoleResolver(invalidConfig)).toThrow();
        });

        it('should handle missing LDAP user gracefully', async () => {
            expect(async () => {
                await resolver.resolveRolesAndPermissions(21, 'test@company.com', null as any);
            }).rejects.toThrow();
        });
    });
});

describe('LDAPGroupMapper', () => {
    let mapper: LDAPGroupMapper;

    beforeEach(() => {
        mapper = new LDAPGroupMapper(mockConfig.ldapGroupMappings, mockConfig.ldapAttributeMappings, ['PROCUREMENT_OFFICER', 'DEPARTMENT_HEAD', 'REQUESTER']);
    });

    describe('Group Resolution', () => {
        it('should resolve roles from groups', () => {
            const resolved = mapper.resolveFromGroups(mockLDAPUsers.procurementOfficer, 1);
            expect(resolved.length).toBeGreaterThan(0);
            expect(resolved[0].role).toBe('PROCUREMENT_OFFICER');
            expect(resolved[0].source).toBe('ldap_group');
        });

        it('should return empty for no groups', () => {
            const resolved = mapper.resolveFromGroups(mockLDAPUsers.noGroups, 1);
            expect(resolved).toHaveLength(0);
        });
    });

    describe('Attribute Resolution', () => {
        it('should resolve roles from attributes', () => {
            const resolved = mapper.resolveFromAttributes(mockLDAPUsers.procurementOfficer, 1);
            expect(resolved.length).toBeGreaterThan(0);
            expect(resolved[0].role).toBe('PROCUREMENT_OFFICER');
            expect(resolved[0].source).toBe('ldap_attribute');
        });

        it('should return empty for no matching attributes', () => {
            const noAttrs: LDAPUser = {
                dn: 'cn=test,dc=company,dc=com',
                cn: 'test',
            };
            const resolved = mapper.resolveFromAttributes(noAttrs, 1);
            expect(resolved).toHaveLength(0);
        });
    });
});
