# LDAP / Active Directory Integration

## Overview

The system now supports LDAP/Active Directory authentication alongside local database authentication. Users can log in using their corporate credentials, and user accounts are automatically created in the local database upon first LDAP login.

---

## Features

✅ **LDAP Authentication** - Authenticate users against Active Directory  
✅ **Auto User Creation** - Automatically create user accounts on first LDAP login  
✅ **User Sync** - Optionally sync user details (name, department) from LDAP  
✅ **Dual Authentication** - Supports both LDAP and local password authentication  
✅ **Role Management** - Roles still managed in local database  
✅ **Secure** - Uses service account for search, authenticates with user credentials

---

## Installation

### 1. Install Dependencies

```bash
npm install ldapts
```

The `ldapts` package provides LDAP client functionality for Node.js.

### 2. Configure Environment Variables

Add to your `.env` file or create `.env.ldap`:

```env
# LDAP Server Configuration
LDAP_URL=ldap://BOS.local:389
LDAP_BIND_DN=CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local
LDAP_BIND_PASSWORD=Password@101
LDAP_SEARCH_BASE=DC=BOS,DC=local
LDAP_SEARCH_FILTER=(userPrincipalName={email})
```

**Security Note:** Never commit `.env` files with real credentials to version control!

### 3. Verify Configuration

Test the LDAP connection:

```bash
node server/scripts/test-ldap-connection.mjs
```

(You'll need to create this test script - see below)

---

## Configuration Details

### LDAP_URL

-   **Format:** `ldap://hostname:port` or `ldaps://hostname:port`
-   **Default:** `ldap://BOS.local:389`
-   **SSL:** Use `ldaps://` and port `636` for secure connections
-   **Examples:**
    ```
    ldap://dc01.bos.local:389
    ldaps://dc01.bos.local:636
    ldap://192.168.1.10:389
    ```

### LDAP_BIND_DN

-   **Purpose:** Distinguished Name of service account used to search for users
-   **Requirements:** Must have read permission on user objects
-   **Format:** `CN=username,OU=department,DC=domain,DC=com`
-   **Example:** `CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local`

### LDAP_BIND_PASSWORD

-   **Purpose:** Password for the service account
-   **Security:** Store in environment variable, never hardcode
-   **Rotation:** Update regularly according to security policy

### LDAP_SEARCH_BASE

-   **Purpose:** The base DN where user searches begin
-   **Format:** `DC=domain,DC=com`
-   **Example:** `DC=BOS,DC=local`
-   **Tip:** Use the root of your domain or specific OU if you know where users are

### LDAP_SEARCH_FILTER

-   **Purpose:** LDAP filter to find user by email
-   **Placeholder:** Use `{email}` which will be replaced with the user's email
-   **Common Filters:**
    ```
    (userPrincipalName={email})          # Active Directory - most common
    (mail={email})                       # Email attribute
    (sAMAccountName={email})             # Username (without @domain)
    (|(mail={email})(userPrincipalName={email}))  # Either email or UPN
    ```

---

## API Usage

### LDAP Login Endpoint

**Endpoint:** `POST /api/auth/ldap-login`

**Request:**

```json
{
    "email": "user@bos.local",
    "password": "userPassword123"
}
```

**Success Response (200):**

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 42,
        "email": "user@bos.local",
        "name": "John Doe",
        "roles": ["DEPT_MANAGER", "PROCUREMENT"],
        "department": {
            "id": 5,
            "name": "IT Department",
            "code": "IT"
        },
        "ldapAuthenticated": true
    }
}
```

**Error Responses:**

| Code | Message                     | Meaning                    |
| ---- | --------------------------- | -------------------------- |
| 400  | Email and password required | Missing credentials        |
| 401  | Invalid credentials         | LDAP authentication failed |
| 500  | LDAP login failed           | Server error               |

---

## Frontend Integration

### 1. Update Login Component

Add LDAP login option to your login form:

```typescript
// src/pages/Authentication/Login.tsx

const handleLDAPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const response = await fetch('http://heron:4000/api/auth/ldap-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'LDAP login failed');
        }

        const data = await response.json();

        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id.toString());
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to dashboard
        navigate('/dashboard');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'LDAP login failed');
    } finally {
        setLoading(false);
    }
};
```

### 2. Add Login Mode Toggle

```tsx
<div className="panel">
    <h2>Login</h2>

    {/* Login Mode Selector */}
    <div className="mb-4">
        <button className={loginMode === 'ldap' ? 'btn btn-primary' : 'btn btn-outline-primary'} onClick={() => setLoginMode('ldap')}>
            Active Directory
        </button>
        <button className={loginMode === 'local' ? 'btn btn-primary' : 'btn btn-outline-primary'} onClick={() => setLoginMode('local')}>
            Local Account
        </button>
    </div>

    <form onSubmit={loginMode === 'ldap' ? handleLDAPLogin : handleLocalLogin}>{/* ... form fields ... */}</form>
</div>
```

---

## How It Works

### Authentication Flow

1. **User submits credentials** to `/api/auth/ldap-login`
2. **Server binds with service account** to LDAP server
3. **Server searches for user** using email in search filter
4. **If user found**, server unbinds service account
5. **Server authenticates user** by binding with user's DN and password
6. **If authentication successful**, check local database for user
7. **If user doesn't exist**, create new user account automatically
8. **Generate JWT token** with user ID, email, roles
9. **Return token and user details** to client

### User Lifecycle

**First Login (LDAP user not in local DB):**

```
LDAP Auth → User Created → Roles = [] → Admin assigns roles → Full access
```

**Subsequent Logins:**

```
LDAP Auth → User Exists → Roles Loaded → Access Granted
```

**Role Management:**

-   Roles are managed in the local database
-   LDAP only handles authentication
-   Admins assign roles using existing user management

---

## Testing

### Test LDAP Connection

Create `server/scripts/test-ldap-connection.mjs`:

```javascript
import { getLDAPService } from '../services/ldapService.js';

async function testConnection() {
    const ldap = getLDAPService();

    console.log('Testing LDAP connection...');
    const connected = await ldap.testConnection();

    if (connected) {
        console.log('✅ LDAP connection successful');
    } else {
        console.log('❌ LDAP connection failed');
        process.exit(1);
    }
}

testConnection();
```

Run:

```bash
node server/scripts/test-ldap-connection.mjs
```

### Test User Authentication

```bash
curl -X POST http://heron:4000/api/auth/ldap-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@bos.local",
    "password": "userPassword123"
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. "LDAP connection failed"

**Possible Causes:**

-   LDAP server unreachable
-   Wrong LDAP URL or port
-   Firewall blocking connection

**Solutions:**

```bash
# Test network connectivity
ping BOS.local

# Test LDAP port
telnet BOS.local 389

# Check LDAP service
nslookup BOS.local
```

#### 2. "User not found"

**Possible Causes:**

-   Wrong search filter
-   User not in search base
-   Service account has no read permission

**Solutions:**

-   Verify LDAP_SEARCH_FILTER matches your AD schema
-   Check user's DN is under LDAP_SEARCH_BASE
-   Try different search filters:
    ```env
    # Try these one at a time
    LDAP_SEARCH_FILTER=(userPrincipalName={email})
    LDAP_SEARCH_FILTER=(mail={email})
    LDAP_SEARCH_FILTER=(sAMAccountName={email})
    ```

#### 3. "Invalid credentials" (user exists but can't authenticate)

**Possible Causes:**

-   Incorrect password
-   Account locked/disabled in AD
-   Password expired

**Solutions:**

-   Verify password works in Windows login
-   Check AD user account status
-   Reset password if expired

#### 4. "Service account bind failed"

**Possible Causes:**

-   Wrong service account DN
-   Wrong service account password
-   Service account locked/disabled

**Solutions:**

-   Verify LDAP_BIND_DN format
-   Test service account credentials in AD
-   Ensure account has appropriate permissions

---

## Security Best Practices

### 1. Use Service Account

✅ **DO:** Create dedicated service account for LDAP binding  
❌ **DON'T:** Use personal account or admin account

### 2. Limit Permissions

The service account only needs:

-   Read permission on user objects
-   No write, delete, or admin permissions

### 3. Secure Communication

For production:

```env
# Use LDAPS (LDAP over SSL)
LDAP_URL=ldaps://BOS.local:636
```

### 4. Password Management

-   Store LDAP credentials in `.env` file
-   Add `.env` to `.gitignore`
-   Use different credentials per environment
-   Rotate service account password regularly

### 5. Rate Limiting

The LDAP login endpoint uses the same rate limiter as regular login:

-   5 attempts per 15 minutes per IP
-   Prevents brute force attacks

---

## Advanced Configuration

### Department Mapping

Automatically assign users to departments based on LDAP attributes:

```typescript
// In LDAP login endpoint
if (!user) {
    // Map LDAP department to local department
    const department = await prisma.department.findFirst({
        where: { name: ldapUser.department },
    });

    user = await prisma.user.create({
        data: {
            email: ldapUser.email,
            name: ldapUser.name,
            passwordHash: '',
            departmentId: department?.id,
        },
        // ...
    });
}
```

### Role Assignment

Auto-assign roles based on LDAP groups or attributes:

```typescript
// Check LDAP group membership
const ldapGroups = await ldapService.getUserGroups(ldapUser.dn);

// Map LDAP groups to local roles
const roleMap = {
    'CN=Procurement Officers,DC=BOS,DC=local': 'PROCUREMENT_OFFICER',
    'CN=Department Heads,DC=BOS,DC=local': 'DEPT_MANAGER',
};

for (const [groupDN, roleName] of Object.entries(roleMap)) {
    if (ldapGroups.includes(groupDN)) {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (role) {
            await prisma.userRole.create({
                data: { userId: user.id, roleId: role.id },
            });
        }
    }
}
```

---

## Migration Guide

### Migrating Existing Users to LDAP

For users who already have local accounts:

1. **Clear their password hash:**

    ```sql
    UPDATE User SET passwordHash = '' WHERE email LIKE '%@bos.local';
    ```

2. **They can now only log in via LDAP**

3. **Or keep dual authentication:**
    - Allow both LDAP and local passwords
    - LDAP takes precedence if configured

---

## Monitoring

### LDAP Login Logs

All LDAP operations are logged:

```
[LDAP] Attempting authentication for: user@bos.local
[LDAP] Service account bind successful
[LDAP] User found: CN=John Doe,OU=Staff,DC=BOS,DC=local
[LDAP] User authentication successful: user@bos.local
[LDAP Login] Creating new user in local DB: user@bos.local
[LDAP Login] Token generated for user ID: 42
```

### Monitoring Metrics

Track:

-   LDAP login attempts vs successes
-   New user creation rate
-   LDAP connection failures
-   Authentication latency

---

## Summary

✅ **Installed:** `ldapts` package for LDAP client  
✅ **Created:** `server/services/ldapService.ts` - LDAP service layer  
✅ **Added:** `/api/auth/ldap-login` endpoint  
✅ **Configured:** Environment variables for LDAP connection  
✅ **Documented:** Complete integration guide

The system now supports enterprise Active Directory authentication while maintaining backward compatibility with local authentication!
