# RBAC System Implementation Guide

## Overview

This document provides comprehensive guidance on the new LDAP-based Role-Based Access Control (RBAC) system for the Procurement Management System (PMS). The system replaces OU-based role assignment with a more flexible approach using LDAP group memberships, user attributes, and optional database overrides.

## Architecture

### Components

1. **RoleResolver** (`server/services/roleResolver.ts`)

    - Central orchestrator for role and permission resolution
    - Manages caching with configurable TTL
    - Handles LDAP resolution and database overrides
    - Provides permission checking utilities

2. **LDAPGroupMapper** (`server/utils/ldapGroupMapper.ts`)

    - Maps LDAP groups to internal roles
    - Resolves roles from user attributes
    - Deduplicates and validates resolved roles

3. **Validation & Error Handling** (`server/utils/rbacValidation.ts`)

    - Validates LDAP data structures
    - Parses and validates DN (Distinguished Names)
    - Provides structured error classes

4. **Type Definitions** (`server/types/rbac.ts`)

    - Comprehensive TypeScript interfaces
    - Error enumerations
    - Custom exception classes

5. **Configuration** (`server/config/roles-permissions.json`)
    - Maps 9 PMS roles to normalized permissions
    - Defines LDAP group-to-role mappings
    - Specifies LDAP attribute-to-role mappings

## Supported Roles

The system supports 9 PMS roles:

| Role                        | Purpose                               | Key Permissions                       |
| --------------------------- | ------------------------------------- | ------------------------------------- |
| **Requester**               | Creates procurement requests          | Create own requests, submit           |
| **Finance Officer**         | Reviews and processes payment stage   | Approve payments, read all requests   |
| **Procurement Officer**     | Reviews requests, manages RFQs        | Approve requests, create vendors      |
| **Procurement Manager**     | Oversees procurement, reassigns tasks | Approve, reassign, manage procurement |
| **Department Head**         | Reviews departmental requests         | Approve department requests           |
| **Executive Director**      | High-value approval authority         | Approve high-value, budget approval   |
| **Senior Director**         | Highest approval authority            | All approvals, manage system          |
| **Auditor**                 | Read-only access for auditing         | Read all, audit trail access          |
| **Finance (Payment Stage)** | Handles payment processing            | Approve payments, process payments    |

## Quick Start

### 1. Initialize Global Resolver

```typescript
import { initializeGlobalRoleResolver } from './services/roleResolver';
import path from 'path';

const config = {
    rolesPermissionsPath: path.resolve(__dirname, './config/roles-permissions.json'),
    ldapGroupMappings: {
        'cn=procurement-officers,ou=roles,dc=company,dc=com': 'PROCUREMENT_OFFICER',
        // ... other mappings
    },
    ldapAttributeMappings: {
        title: {
            'Procurement Officer': 'PROCUREMENT_OFFICER',
            // ... other attribute mappings
        },
    },
    cacheTTL: 3600000, // 1 hour
    defaultRole: 'REQUESTER',
    enableDatabaseOverrides: true,
};

const resolver = initializeGlobalRoleResolver(config);
```

### 2. Resolve User Roles in Auth Middleware

```typescript
import { getGlobalRoleResolver } from './services/roleResolver';

async function resolveUserRoles(userId: number, email: string, ldapUser: LDAPUser) {
    const resolver = getGlobalRoleResolver();

    const result = await resolver.resolveRolesAndPermissions(userId, email, ldapUser, { includeLDAPData: true });

    return {
        roles: result.finalRoles,
        permissions: result.permissions,
    };
}
```

### 3. Check Permissions

```typescript
const resolver = getGlobalRoleResolver();

// Single permission check
if (resolver.hasPermission(userPermissions, 'request:approve')) {
    // User can approve requests
}

// All permissions
if (resolver.hasAllPermissions(userPermissions, ['request:read_all', 'vendor:create'])) {
    // User has both permissions
}

// Any permission
if (resolver.hasAnyPermission(userPermissions, ['request:approve', 'admin:manage_users'])) {
    // User has at least one permission
}
```

## LDAP Configuration

### Group Mappings

Map LDAP group DNs to PMS roles:

```json
{
    "ldapGroupMappings": {
        "cn=procurement-officers,ou=roles,dc=company,dc=com": "PROCUREMENT_OFFICER",
        "cn=procurement-managers,ou=roles,dc=company,dc=com": "PROCUREMENT_MANAGER",
        "cn=finance-officers,ou=roles,dc=company,dc=com": "FINANCE_OFFICER",
        "cn=department-heads,ou=roles,dc=company,dc=com": "DEPARTMENT_HEAD",
        "cn=executive-directors,ou=roles,dc=company,dc=com": "EXECUTIVE_DIRECTOR"
    }
}
```

### Attribute Mappings

Map LDAP user attributes and values to roles:

```json
{
    "ldapAttributeMappings": {
        "title": {
            "Procurement Officer": "PROCUREMENT_OFFICER",
            "Finance Officer": "FINANCE_OFFICER",
            "Department Head": "DEPARTMENT_HEAD"
        },
        "department": {
            "Finance": "FINANCE_OFFICER",
            "Procurement": "PROCUREMENT_OFFICER"
        }
    }
}
```

### Resolution Priority

Roles are resolved in this order:

1. **LDAP Group Memberships** - Primary source
2. **LDAP Attributes** - Secondary source (if no groups)
3. **Database Overrides** - Override or supplement LDAP roles
4. **Default Role** - Fallback (typically "REQUESTER")

## Role and Permission Configuration

### Structure

```json
{
    "roles": {
        "PROCUREMENT_OFFICER": {
            "description": "Officer who reviews requests",
            "permissions": {
                "request:read_all": true,
                "request:approve": true,
                "request:reject": true,
                "vendor:create": true,
                "admin:manage_users": false
            }
        }
    }
}
```

### Adding New Roles

1. Add role object to `server/config/roles-permissions.json`:

```json
{
    "roles": {
        "NEW_ROLE": {
            "description": "Role description",
            "permissions": {
                "permission:name": true,
                "another:permission": false
            }
        }
    }
}
```

2. Add LDAP mappings:

```json
{
    "ldapGroupMappings": {
        "cn=new-role-group,ou=roles,dc=company,dc=com": "NEW_ROLE"
    }
}
```

3. Clear resolver cache to reload:

```typescript
resolver.clearCache();
```

### Adding New Permissions

1. Define permission in role configuration
2. Use permission in middleware:

```typescript
app.post('/api/requests/:id/approve', authMiddleware, (req, res, next) => {
    const resolver = getGlobalRoleResolver();
    if (!resolver.hasPermission(req.user.permissions, 'request:approve')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
});
```

## Database Overrides

### Use Cases

-   Temporary role assignment
-   Role removal for specific users
-   Complete role override for special cases
-   Time-limited role grants

### API Usage

```typescript
// Add a role
resolver.setDatabaseOverride({
    userId: 123,
    rolesToAdd: ['AUDITOR'],
});

// Remove a role
resolver.setDatabaseOverride({
    userId: 123,
    rolesToRemove: ['PROCUREMENT_OFFICER'],
});

// Complete override
resolver.setDatabaseOverride({
    userId: 123,
    overriddenRoles: ['FINANCE_OFFICER'],
});

// Time-limited override
resolver.setDatabaseOverride({
    userId: 123,
    rolesToAdd: ['EXECUTIVE_DIRECTOR'],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});

// Remove override
resolver.removeDatabaseOverride(123);
```

### Persistence

Database overrides are currently stored in-memory. For production:

1. Create `RoleOverride` table in Prisma schema:

```prisma
model RoleOverride {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  rolesToAdd String?
  rolesToRemove String?
  overriddenRoles String?
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId])
}
```

2. Modify `RoleResolver` to load/save overrides to database on initialization and updates

## Caching

### Configuration

```typescript
const config: RoleResolverConfig = {
    cacheTTL: 3600000, // 1 hour in milliseconds
    // ... other config
};
```

### Cache Operations

```typescript
const resolver = getGlobalRoleResolver();

// Get cache statistics
const stats = resolver.getCacheStats();
console.log(`${stats.size} entries cached`);

// Invalidate specific user's cache
resolver.invalidateUserCache(userId);

// Clear entire cache
resolver.clearCache();

// Skip cache for resolution
const result = await resolver.resolveRolesAndPermissions(userId, email, ldapUser, { skipCache: true });
```

### Cache TTL Behavior

-   Default TTL: 1 hour
-   Expired entries automatically removed on access
-   Manual invalidation clears entry immediately
-   `clearCache()` removes all entries

## Error Handling

### Error Types

```typescript
enum LDAPResolutionError {
    MALFORMED_DN, // Invalid DN format
    MISSING_MEMBERSHIP_DATA, // No group memberships
    UNMAPPED_GROUP, // Group has no role mapping
    UNMAPPED_ATTRIBUTE, // Attribute value has no role mapping
    INVALID_LDAP_USER, // User object malformed
    DATABASE_ERROR, // Database override error
    CONFIG_ERROR, // Configuration error
    CACHE_ERROR, // Cache operation error
}
```

### Error Handling Pattern

```typescript
try {
    const result = await resolver.resolveRolesAndPermissions(userId, email, ldapUser);
} catch (error) {
    if (error instanceof RoleResolutionException) {
        console.error(`Role resolution failed: ${error.errorType}`);
        console.error(`Details:`, error.details);

        // Provide fallback: assign default role
        assignDefaultRole(userId);
    }
}
```

## Middleware Integration

### Example: Replacing Old RBAC

Old approach (OU-based):

```typescript
export function requireRole(...allowedRoles: string[]) {
    return (req, res, next) => {
        const userRoles = req.user.roles;
        if (!allowedRoles.some((role) => userRoles.includes(role))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}
```

New approach (Permission-based):

```typescript
export function requirePermission(...requiredPermissions: string[]) {
    return (req, res, next) => {
        const resolver = getGlobalRoleResolver();

        if (!resolver.hasAllPermissions(req.user.permissions, requiredPermissions)) {
            return res.status(403).json({
                error: 'Forbidden',
                required: requiredPermissions,
            });
        }
        next();
    };
}
```

### Usage

```typescript
// Check specific permissions
app.post('/api/requests/:id/approve', authMiddleware, requirePermission('request:approve'), handleApproveRequest);

// Check multiple permissions
app.post('/api/requests/:id/reassign', authMiddleware, requirePermission('request:reassign', 'request:read_all'), handleReassignRequest);
```

## Testing

### Unit Tests

Run the test suite:

```bash
npm test -- roleResolver.test.ts
```

Tests cover:

-   LDAP user validation
-   DN parsing and validation
-   Group membership resolution
-   Attribute-based role resolution
-   Permission aggregation
-   Permission checking
-   Caching behavior
-   Database overrides
-   Error handling

### Example Test

```typescript
it('should resolve multiple roles', async () => {
    const ldapUser: LDAPUser = {
        dn: 'cn=multi,ou=staff,dc=company,dc=com',
        cn: 'multi',
        memberOf: ['cn=procurement-officers,ou=roles,dc=company,dc=com', 'cn=finance-officers,ou=roles,dc=company,dc=com'],
    };

    const result = await resolver.resolveRolesAndPermissions(1, 'multi@company.com', ldapUser);

    expect(result.finalRoles).toContain('PROCUREMENT_OFFICER');
    expect(result.finalRoles).toContain('FINANCE_OFFICER');
});
```

## Debugging

### Enable Detailed Logging

```typescript
const result = await resolver.resolveRolesAndPermissions(
    userId,
    email,
    ldapUser,
    { includeLDAPData: true } // Logs resolution details
);

// Check cache
const stats = resolver.getCacheStats();
console.log('Cache stats:', stats);

// Get role info
const role = resolver.getRole('PROCUREMENT_OFFICER');
console.log('Role permissions:', role?.permissions);

// List all roles
const allRoles = resolver.getAllRoles();
console.log('Available roles:', allRoles);
```

## Performance Considerations

1. **Cache TTL**: Set based on LDAP update frequency

    - High update frequency: 5-15 minutes
    - Standard: 1 hour
    - Low update frequency: 4-8 hours

2. **Permission Aggregation**: Permissions are aggregated on-demand

    - Cached after resolution
    - Updated when override changes

3. **LDAP Queries**: Performed by calling system

    - RoleResolver doesn't query LDAP
    - LDAP user object must be provided
    - Integrate with your LDAP client

4. **Database Queries**: Only on override application
    - Minimal DB access
    - Override checked on each resolution
    - Consider caching overrides in-memory

## Migration Guide

### From Old RBAC System

1. **Stop using OU-based detection**

    - Remove any code that parses DN for role information
    - Remove OU configuration

2. **Update Auth Middleware**

    ```typescript
    // Old: OU-based
    const roles = extractRolesFromDN(user.dn);

    // New: LDAP groups
    const result = await resolver.resolveRolesAndPermissions(userId, email, ldapUser);
    const roles = result.finalRoles;
    ```

3. **Update Middleware Usage**

    ```typescript
    // Old: Role-based
    app.post('/approve', requireRole('PROCUREMENT_MANAGER'), handler);

    // New: Permission-based
    app.post('/approve', requirePermission('request:approve'), handler);
    ```

4. **Test Thoroughly**
    - Run full test suite
    - Test with actual LDAP data
    - Verify role mappings
    - Check permission grants

## Extending the System

### Adding Custom Attributes

1. Update LDAP attribute mappings in config
2. Ensure LDAP user object includes attribute
3. Validation automatically handles new attributes

### Custom Permission Checks

```typescript
// Create custom middleware
export function requireCustomLogic(checkFn: (permissions: Permission) => boolean) {
    return (req, res, next) => {
        if (!checkFn(req.user.permissions)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

// Usage
app.post(
    '/api/complex',
    requireCustomLogic((perms) => {
        return perms['request:approve'] && perms['budget:approve'];
    }),
    handler
);
```

### Custom Role Resolver

Extend `RoleResolver` for specialized logic:

```typescript
class CustomRoleResolver extends RoleResolver {
    async resolveSpecialCase(userId: number): Promise<string[]> {
        // Custom resolution logic
    }
}
```

## Troubleshooting

### Problem: User has no roles

1. Check LDAP group memberships
2. Verify group DN in mappings
3. Check attribute values
4. Review default role configuration

### Problem: Unexpected permissions

1. Verify role configuration
2. Check permission aggregation
3. Review database overrides
4. Clear cache and re-resolve

### Problem: Cache not clearing

1. Call `resolver.invalidateUserCache(userId)`
2. Or call `resolver.clearCache()`
3. Verify TTL settings
4. Check error logs

## Best Practices

1. **Use Permission Checks Over Roles**

    - Permissions are more maintainable
    - Roles can change; permissions persist

2. **Cache Intelligently**

    - Set TTL based on LDAP update frequency
    - Don't set TTL too low (performance)
    - Don't set TTL too high (stale data)

3. **Validate LDAP Data**

    - Always provide validated LDAP user objects
    - Handle malformed LDAP data gracefully
    - Log errors for debugging

4. **Use Database Overrides Sparingly**

    - Prefer LDAP group changes
    - Document all overrides
    - Set expiration dates for temporary changes

5. **Monitor Cache**

    - Track cache hit rates
    - Adjust TTL based on patterns
    - Clear cache during deployments

6. **Test Role Changes**
    - Test new mappings before deployment
    - Verify permission aggregation
    - Check for unintended permission grants

## API Reference

### RoleResolver

```typescript
// Resolve roles and permissions
resolveRolesAndPermissions(
  userId: number,
  email: string,
  ldapUser: LDAPUser,
  options?: RoleResolutionOptions
): Promise<RoleResolutionResult>

// Permission checks
hasPermission(permissions: Permission, requiredPermission: string): boolean
hasAllPermissions(permissions: Permission, requiredPermissions: string[]): boolean
hasAnyPermission(permissions: Permission, requiredPermissions: string[]): boolean

// Cache management
invalidateUserCache(userId: number): void
clearCache(): void
getCacheStats(): { size: number; entries: string[] }

// Database overrides
setDatabaseOverride(override: DatabaseRoleOverride): void
removeDatabaseOverride(userId: number): void
getDatabaseOverride(userId: number): DatabaseRoleOverride | undefined

// Role information
getRole(roleName: string): Role | undefined
getAllRoles(): string[]
getAllRolesWithPermissions(): Role[]
validateRoles(roles: string[]): { valid: boolean; invalid: string[] }
getRolePermissions(roleName: string): string[]
getGrantedPermissions(roleName: string): string[]
```

## See Also

-   `server/types/rbac.ts` - Type definitions
-   `server/config/roles-permissions.json` - Role configuration
-   `server/services/roleResolver.ts` - Main implementation
-   `server/utils/ldapGroupMapper.ts` - LDAP mapping
-   `server/__tests__/roleResolver.test.ts` - Test suite
