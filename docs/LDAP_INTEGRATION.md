# LDAP Integration Documentation

## Overview

The Procurement Management System now includes enterprise-grade LDAP authentication support, allowing users to authenticate against Active Directory or any LDAP-compatible directory service.

## Architecture

The LDAP integration follows the project's strict architectural standards:

### 1. **Configuration Layer** (`server/config/environment.ts`)

-   Centralized environment variable management
-   Type-safe configuration with validation
-   Optional LDAP configuration support

### 2. **Service Layer** (`server/services/ldapService.ts`)

-   Pure business logic for LDAP operations
-   Stateless, testable, and deterministic
-   Handles authentication, user search, and connection testing
-   Built-in security features:
    -   LDAP injection prevention
    -   Secure credential handling
    -   Automatic connection cleanup
    -   Comprehensive error handling

### 3. **Route Layer** (`server/routes/auth.ts`)

-   Thin route handlers
-   Validation and response formatting
-   Integration with existing auth patterns

## Configuration

### Environment Variables

Add these variables to your `.env` file to enable LDAP authentication:

```env
# LDAP Authentication (Optional)
LDAP_URL="ldap://your-domain.local:389"
LDAP_BIND_DN="CN=ServiceAccount,OU=Users,DC=your-domain,DC=local"
LDAP_BIND_PASSWORD="your-service-account-password"
LDAP_SEARCH_DN="DC=your-domain,DC=local"
```

### Configuration Details

-   **LDAP_URL**: The LDAP server URL (e.g., `ldap://domain.local:389` or `ldaps://domain.local:636` for SSL)
-   **LDAP_BIND_DN**: Distinguished Name of a service account with read permissions
-   **LDAP_BIND_PASSWORD**: Password for the service account
-   **LDAP_SEARCH_DN**: Base DN for user searches (e.g., `DC=company,DC=local`)

**Security Notes:**

-   Use a dedicated service account with minimal read-only permissions
-   Never commit these values to version control
-   In production, use LDAPS (LDAP over SSL) on port 636
-   Rotate service account passwords regularly

## API Endpoints

### POST `/api/auth/ldap-login`

Authenticate a user against LDAP and issue a JWT token.

**Request:**

```json
{
    "email": "user@domain.local",
    "password": "userPassword"
}
```

**Response (Success):**

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "email": "user@domain.local",
        "name": "John Doe",
        "roles": ["USER", "DEPARTMENT_HEAD"],
        "department": {
            "id": 2,
            "name": "IT Department",
            "code": "IT"
        }
    }
}
```

**Response (Error):**

```json
{
    "success": false,
    "message": "Invalid credentials"
}
```

**Rate Limiting:** 5 attempts per 15 minutes per IP

### GET `/api/auth/test-ldap`

Test LDAP connection and configuration (diagnostic endpoint).

**Response (Success):**

```json
{
    "success": true,
    "message": "LDAP connection successful",
    "configured": true,
    "ldapUrl": "ldap://domain.local:389",
    "searchDN": "DC=domain,DC=local"
}
```

**Response (Not Configured):**

```json
{
    "success": false,
    "message": "LDAP is not configured",
    "configured": false
}
```

## Authentication Flow

1. **User submits credentials** to `/api/auth/ldap-login`
2. **System validates input** using Zod schemas
3. **LDAP service authenticates**:
    - Binds with service account credentials
    - Searches for user by email (userPrincipalName)
    - Unbinds service account
    - Attempts to bind as the user to verify password
    - Unbinds user connection
4. **System looks up user** in local database
5. **JWT token is issued** with user roles and permissions
6. **Token is returned** to client

## Security Features

### 1. Input Sanitization

All user input is sanitized to prevent LDAP injection attacks:

```typescript
// Removes: () \ * and null bytes
private sanitizeInput(input: string): string {
    return input.replace(/[()\\*\x00]/g, '');
}
```

### 2. Connection Management

-   Automatic connection cleanup with `finally` blocks
-   Safe unbind operations that never throw
-   Connection timeouts (5 seconds)

### 3. Error Handling

-   No sensitive information in error messages
-   Structured logging for audit trails
-   Rate limiting on authentication endpoints

### 4. Password Security

-   Passwords never logged or stored
-   LDAP bind used for password verification
-   No password transmission to local database

### 5. User Authorization

-   Users must exist in local database before LDAP login
-   Roles and permissions managed locally
-   LDAP only handles authentication, not authorization

## Integration with Existing System

### User Management

LDAP authentication requires users to be pre-created in the local database:

1. Create user accounts with matching email addresses
2. Assign roles and permissions locally
3. Users can then authenticate via LDAP

**Note:** The system does NOT auto-create users from LDAP. This is intentional to maintain control over access.

### Token Flow

LDAP authentication issues the same JWT tokens as standard authentication:

-   24-hour expiration
-   Contains user ID, email, name, and roles
-   Compatible with all existing middleware and RBAC

### Frontend Integration

Use the same login flow, but call the LDAP endpoint:

```typescript
// Standard login
const response = await api.post('/auth/login', { email, password });

// LDAP login
const response = await api.post('/auth/ldap-login', { email, password });
```

The response format is identical, so no frontend changes are needed.

## Testing

### Manual Testing

1. **Test LDAP Connection:**

    ```bash
    curl http://localhost:4000/api/auth/test-ldap
    ```

2. **Test LDAP Login:**
    ```bash
    curl -X POST http://localhost:4000/api/auth/ldap-login \
      -H "Content-Type: application/json" \
      -d '{"email":"user@domain.local","password":"password"}'
    ```

### Integration Testing

The LDAP service is designed for easy testing:

```typescript
import { ldapService } from './services/ldapService';

// Check if LDAP is enabled
if (ldapService.isEnabled()) {
    // Test connection
    const connected = await ldapService.testConnection();

    // Authenticate user
    const ldapUser = await ldapService.authenticateUser(email, password);
}
```

## Troubleshooting

### Common Issues

1. **"LDAP is not configured"**

    - Ensure all LDAP\_\* environment variables are set
    - Check that LDAP_URL is valid
    - Restart the server after updating .env

2. **"User not found in directory"**

    - Verify the email format matches userPrincipalName in AD
    - Check LDAP_SEARCH_DN includes the user's location
    - Ensure service account has read permissions

3. **"Invalid credentials"**

    - Verify user password is correct
    - Check if account is locked in AD
    - Verify LDAP_BIND_DN and LDAP_BIND_PASSWORD are correct

4. **"User account not found in system"**
    - User must be created in local database first
    - Email in local DB must match LDAP email exactly
    - Check user has appropriate roles assigned

### Debug Logging

LDAP operations are logged using Winston:

```
[INFO] LDAP admin bind successful for user search
[INFO] LDAP user found in directory - dn: CN=User,OU=Users,DC=domain,DC=local
[INFO] LDAP user authenticated successfully
[INFO] User logged in via LDAP successfully - userId: 5
```

Check server logs for detailed authentication flow.

### Network Issues

-   Verify LDAP server is reachable: `telnet domain.local 389`
-   Check firewall rules allow outbound LDAP traffic
-   For SSL: `telnet domain.local 636`
-   Verify DNS resolution: `nslookup domain.local`

## Production Deployment

### Security Checklist

-   [ ] Use LDAPS (LDAP over SSL) instead of plain LDAP
-   [ ] Create dedicated service account with minimal permissions
-   [ ] Use strong, rotated passwords for service account
-   [ ] Store credentials in secure secret management (Azure Key Vault, AWS Secrets Manager)
-   [ ] Enable audit logging for LDAP authentication events
-   [ ] Set appropriate rate limiting thresholds
-   [ ] Monitor failed authentication attempts
-   [ ] Regularly review LDAP service account permissions

### Environment Configuration

```env
# Production LDAP Configuration
LDAP_URL="ldaps://domain.local:636"
LDAP_BIND_DN="CN=SvcProcurementApp,OU=ServiceAccounts,DC=domain,DC=local"
LDAP_BIND_PASSWORD="${SECURE_LDAP_PASSWORD}"
LDAP_SEARCH_DN="OU=Users,DC=domain,DC=local"
```

### Monitoring

Monitor these metrics in production:

-   LDAP authentication success/failure rate
-   LDAP connection timeouts
-   Average authentication time
-   Rate limit violations

## Architecture Compliance

This implementation follows all enterprise-grade requirements:

✅ **Strict TypeScript** - No `any` types, full type safety  
✅ **Service Layer Pattern** - Pure business logic in services  
✅ **Centralized Configuration** - Environment variables validated  
✅ **Security First** - Input sanitization, safe error handling  
✅ **Structured Logging** - Winston, no console.log  
✅ **Deterministic & Testable** - Stateless service methods  
✅ **Production Ready** - Error handling, timeouts, cleanup

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test LDAP connection using `/api/auth/test-ldap`
4. Consult Active Directory administrator for directory-specific issues
