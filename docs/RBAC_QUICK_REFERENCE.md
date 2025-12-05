# RBAC System Quick Reference

## File Locations

```
server/
├── config/
│   └── roles-permissions.json          # Role and permission configuration
├── middleware/
│   └── auth.ts                         # Updated with RoleResolver integration
├── services/
│   └── roleResolver.ts                 # Main RoleResolver service
├── types/
│   └── rbac.ts                         # Type definitions
├── utils/
│   ├── rbacValidation.ts              # Validation utilities
│   └── ldapGroupMapper.ts             # LDAP group mapping
└── __tests__/
    └── roleResolver.test.ts            # 50+ unit tests

docs/
├── RBAC_IMPLEMENTATION_GUIDE.md        # Complete implementation guide
├── RBAC_REFACTORING_COMPLETION.md      # Summary and status
└── RBAC_BEFORE_AFTER.md               # Comparison and improvements
```

## Quick Start

### 1. Initialize (on app startup)

```typescript
import { initializeGlobalRoleResolver } from './services/roleResolver';
import path from 'path';

const config = {
    rolesPermissionsPath: path.resolve(__dirname, './config/roles-permissions.json'),
    ldapGroupMappings: {
        'cn=procurement-officers,ou=roles,dc=company,dc=com': 'PROCUREMENT_OFFICER',
        // ... add your mappings
    },
    ldapAttributeMappings: {
        title: {
            'Procurement Officer': 'PROCUREMENT_OFFICER',
            // ... add your mappings
        },
    },
    cacheTTL: 3600000, // 1 hour
    defaultRole: 'REQUESTER',
    enableDatabaseOverrides: true,
};

initializeGlobalRoleResolver(config);
```

### 2. Use in Middleware

```typescript
// Auth middleware automatically enriches user with permissions
// User object now has:
// - roles: string[]
// - permissions: Permission

// Check permissions
app.post('/approve', authMiddleware, requirePermission('request:approve'), handler);
```

### 3. Check Permissions in Code

```typescript
const resolver = getGlobalRoleResolver();

// Single permission
if (resolver.hasPermission(user.permissions, 'request:approve')) {
}

// All permissions
if (resolver.hasAllPermissions(user.permissions, ['request:read_all', 'vendor:create'])) {
}

// Any permission
if (resolver.hasAnyPermission(user.permissions, ['admin:manage_users', 'request:approve'])) {
}
```

## 9 PMS Roles

| Role                      | Description                     |
| ------------------------- | ------------------------------- |
| **REQUESTER**             | Employee creating requests      |
| **FINANCE_OFFICER**       | Reviews payment stage           |
| **PROCUREMENT_OFFICER**   | Reviews requests, manages RFQs  |
| **PROCUREMENT_MANAGER**   | Oversees procurement, reassigns |
| **DEPARTMENT_HEAD**       | Reviews department requests     |
| **EXECUTIVE_DIRECTOR**    | High-value approvals            |
| **SENIOR_DIRECTOR**       | Highest authority               |
| **AUDITOR**               | Read-only audit access          |
| **FINANCE_PAYMENT_STAGE** | Payment processing              |

## Permission Prefixes

-   `request:` - Request workflow
-   `vendor:` - Vendor management
-   `budget:` - Budget operations
-   `payment:` - Payment operations
-   `audit:` - Audit access
-   `admin:` - System administration

## Key Permissions

| Permission           | Purpose             |
| -------------------- | ------------------- |
| `request:create`     | Create new requests |
| `request:read_own`   | Read own requests   |
| `request:read_all`   | Read all requests   |
| `request:approve`    | Approve requests    |
| `request:reject`     | Reject requests     |
| `request:reassign`   | Reassign requests   |
| `vendor:create`      | Create vendors      |
| `budget:approve`     | Approve budgets     |
| `payment:approve`    | Approve payments    |
| `audit:read`         | View audit logs     |
| `admin:manage_users` | Manage users        |
| `admin:manage_roles` | Manage roles        |

## Middleware

### Permission-Based (NEW, PREFERRED)

```typescript
// Single permission required
requirePermission('request:approve');

// Any permission required
requireAnyPermission('request:approve', 'admin:manage_users');

// Pre-configured
requireRequestApproval;
requireRequestCreation;
requireProcurementAccess;
requireFinanceAccess;
requireAuditAccess;
requireAdminAccess;
```

### Role-Based (LEGACY, BACKWARD COMPATIBLE)

```typescript
// Single role required
requireRole('PROCUREMENT_MANAGER');

// Pre-configured
requireCommittee;
requireAdmin;
requireProcurement;
```

## Cache Management

```typescript
const resolver = getGlobalRoleResolver();

// Get statistics
const stats = resolver.getCacheStats();
console.log(`${stats.size} entries cached`);

// Invalidate user
resolver.invalidateUserCache(userId);

// Clear all
resolver.clearCache();

// Skip cache for one resolution
await resolver.resolveRolesAndPermissions(userId, email, ldapData, { skipCache: true });
```

## Database Overrides

```typescript
// Add roles
resolver.setDatabaseOverride({
    userId: 123,
    rolesToAdd: ['AUDITOR'],
});

// Remove roles
resolver.setDatabaseOverride({
    userId: 123,
    rolesToRemove: ['PROCUREMENT_OFFICER'],
});

// Replace all roles
resolver.setDatabaseOverride({
    userId: 123,
    overriddenRoles: ['AUDITOR'],
});

// Time-limited override
resolver.setDatabaseOverride({
    userId: 123,
    rolesToAdd: ['EXECUTIVE_DIRECTOR'],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});

// Remove override
resolver.removeDatabaseOverride(123);

// Get override
const override = resolver.getDatabaseOverride(123);
```

## Role Information

```typescript
const resolver = getGlobalRoleResolver();

// Get role details
const role = resolver.getRole('PROCUREMENT_OFFICER');
// { name, description, permissions }

// List all roles
const roles = resolver.getAllRoles();
// ['PROCUREMENT_OFFICER', 'FINANCE_OFFICER', ...]

// Get permissions for role
const perms = resolver.getRolePermissions('PROCUREMENT_OFFICER');
// ['request:read_all', 'request:approve', ...]

// Get granted permissions
const granted = resolver.getGrantedPermissions('PROCUREMENT_OFFICER');
// ['request:read_all', 'request:approve', ...] (only true values)

// Validate roles
const validation = resolver.validateRoles(['PROCUREMENT_OFFICER', 'INVALID']);
// { valid: false, invalid: ['INVALID'] }
```

## Error Types

```typescript
enum LDAPResolutionError {
    MALFORMED_DN, // Invalid DN format
    MISSING_MEMBERSHIP_DATA, // No group memberships
    UNMAPPED_GROUP, // Group not mapped
    UNMAPPED_ATTRIBUTE, // Attribute not mapped
    INVALID_LDAP_USER, // User object invalid
    DATABASE_ERROR, // Database operation failed
    CONFIG_ERROR, // Configuration problem
    CACHE_ERROR, // Cache operation failed
}

// Catch errors
try {
    const result = await resolver.resolveRolesAndPermissions(userId, email, ldapData);
} catch (error) {
    if (error instanceof RoleResolutionException) {
        console.error(`Error: ${error.errorType}`);
        console.error(`Details:`, error.details);
    }
}
```

## Testing

```bash
# Run all tests
npm test -- roleResolver.test.ts

# Run specific test
npm test -- roleResolver.test.ts -t "should resolve role from group"

# Watch mode
npm test -- roleResolver.test.ts --watch
```

## Common Tasks

### Add New Role

1. Update `server/config/roles-permissions.json`:

```json
{
  "roles": {
    "NEW_ROLE": {
      "description": "Description",
      "permissions": { "request:read_all": true, ... }
    }
  }
}
```

2. Update mappings in same file:

```json
{
    "ldapGroupMappings": {
        "cn=new-role,ou=roles,dc=company,dc=com": "NEW_ROLE"
    }
}
```

3. Clear cache:

```typescript
resolver.clearCache();
```

### Add New Permission

1. Add to roles in `roles-permissions.json`:

```json
{
  "roles": {
    "PROCUREMENT_OFFICER": {
      "permissions": {
        "new:permission": true,
        ...
      }
    }
  }
}
```

2. Use in middleware:

```typescript
app.post('/endpoint', requirePermission('new:permission'), handler);
```

### Update LDAP Mappings

Edit `server/config/roles-permissions.json`:

```json
{
    "ldapGroupMappings": {
        "cn=your-group-name,ou=roles,dc=your,dc=com": "ROLE_NAME"
    },
    "ldapAttributeMappings": {
        "title": {
            "Your Job Title": "ROLE_NAME"
        }
    }
}
```

### Debug Role Resolution

```typescript
const result = await resolver.resolveRolesAndPermissions(userId, email, ldapData, {
    includeLDAPData: true, // Log LDAP resolution details
});

console.log('Resolved roles:', result.finalRoles);
console.log('Permissions:', result.permissions);
console.log('Resolution errors:', result.errors);
```

## Performance Tips

1. **Cache TTL**:

    - High LDAP change frequency: 5-15 minutes
    - Normal: 1 hour (default)
    - Low frequency: 4-8 hours

2. **Override Performance**:

    - Store in-memory (current)
    - For persistence, cache in-memory after loading from DB

3. **Permission Checks**:

    - Fast: <1ms (in-memory)
    - Use to control access

4. **Role Changes**:
    - Immediate: Manual `invalidateUserCache()`
    - Auto: After TTL expiration

## Troubleshooting

### User has no roles

-   Check LDAP group memberships
-   Verify group DN in mappings
-   Check attribute values
-   Verify default role config

### Wrong permissions granted

-   Check role configuration
-   Verify permission aggregation
-   Check database overrides
-   Look at resolution errors

### Cache not updating

-   Call `invalidateUserCache(userId)`
-   Or call `clearCache()`
-   Check cache TTL settings
-   Review logs for errors

### Slow permission checks

-   Check cache hit rate
-   Reduce cache TTL
-   Profile resolution time
-   Check LDAP query time

## See Also

-   Full Guide: `docs/RBAC_IMPLEMENTATION_GUIDE.md`
-   Completion Report: `docs/RBAC_REFACTORING_COMPLETION.md`
-   Before/After: `docs/RBAC_BEFORE_AFTER.md`
-   Tests: `server/__tests__/roleResolver.test.ts`
-   Config: `server/config/roles-permissions.json`
