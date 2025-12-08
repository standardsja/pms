# LDAP Login Troubleshooting Guide

## Problem: LDAP login doesn't assign roles or department

This guide helps diagnose why your LDAP email login isn't pulling roles and department.

---

## Quick Diagnostic Steps

### 1. Test Your Login

Run this command on the server (replace with your credentials):

```bash
node server/scripts/test-ldap-user.mjs your.email@bsj.gov.jm yourpassword
```

This will show:

-   ✅ If authentication works
-   👥 What roles were assigned
-   🏢 What department was assigned

### 2. Check Server Logs

When you log in, check the server console for these log messages:

```
[INFO] LDAP authentication successful
[INFO] LDAP: Checking user group memberships
[INFO] LDAP user roles synced
[INFO] User logged in via LDAP with role sync
```

Look for warnings like:

```
[WARN] LDAP: No AD group mappings found
```

---

## Common Issues & Solutions

### Issue 1: No Groups Retrieved from LDAP

**Symptoms:**

-   Log shows: `userGroupCount: 0`
-   Log shows: `userGroupsReceived: ["(none)"]`

**Causes:**

1. LDAP user is not member of any AD groups
2. LDAP query doesn't have permission to read `memberOf` attribute
3. LDAP search base DN is incorrect

**Solutions:**

**Check 1: Verify user is in AD groups**

```powershell
# On your AD server:
Get-ADUser -Identity "username" -Properties MemberOf | Select-Object -ExpandProperty MemberOf
```

**Check 2: Verify LDAP bind DN has permission**
Your LDAP bind account needs permission to read `memberOf` attribute.

**Check 3: Update LDAP configuration**
In `.env`:

```bash
LDAP_SEARCH_DN=DC=bsj,DC=gov,DC=jm
LDAP_BIND_DN=CN=ldapbind,OU=Service Accounts,DC=bsj,DC=gov,DC=jm
```

---

### Issue 2: Groups Retrieved But Not Matched

**Symptoms:**

-   Log shows: `userGroupCount: 5` (or any number > 0)
-   Log shows: `mappingCount: 0`
-   Log shows: `No AD group mappings found`

**Cause:** Your AD group names don't match the configured mappings

**Solution:**

1. **Check what groups were retrieved:**
   Look in logs for `userGroupsReceived`

2. **Update group mappings** in `server/config/ldapGroupMapping.ts`:

    Example: If logs show user is in `CN=Finance_Team,OU=Groups,DC=bsj,DC=gov,DC=jm`, add:

    ```typescript
    {
        adGroupName: 'Finance_Team',  // Match this to your actual AD group
        roles: ['DEPT_MANAGER', 'FINANCE'],
        department: 'FIN',
        departmentName: 'Finance Department',
    }
    ```

3. **Restart the server** after updating mappings

---

### Issue 3: Department Not Assigned

**Symptoms:**

-   Roles are assigned correctly
-   Department shows as `null`

**Causes:**

1. Group mapping doesn't include department info
2. Department code doesn't exist in database

**Solutions:**

**Check 1: Verify mapping has department**

```typescript
{
    adGroupName: 'Your_Group',
    roles: ['DEPT_MANAGER'],
    department: 'FIN',  // ← Must be present
    departmentName: 'Finance',  // ← Must be present
}
```

**Check 2: Verify department exists in database**

```sql
SELECT * FROM Department WHERE code = 'FIN';
```

If department doesn't exist, create it:

```sql
INSERT INTO Department (code, name, isActive)
VALUES ('FIN', 'Finance Department', true);
```

---

### Issue 4: Using Wrong Endpoint

**Symptom:** Login works but uses local authentication instead of LDAP

**Solution:**
The frontend automatically tries LDAP if standard login fails.

Check `Login.tsx` (line ~81):

```typescript
res = await fetch(`${apiUrl}/api/auth/ldap-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});
```

---

## Configuration Checklist

### Required Environment Variables

In your `.env` file:

```bash
# LDAP Server
LDAP_URL=ldap://your-dc.bsj.gov.jm:389
LDAP_BIND_DN=CN=ldapbind,OU=Service Accounts,DC=bsj,DC=gov,DC=jm
LDAP_BIND_PASSWORD=your_bind_password
LDAP_SEARCH_DN=DC=bsj,DC=gov,DC=jm

# Optional: Base DN for user search
LDAP_USER_SEARCH_BASE=OU=Users,DC=bsj,DC=gov,DC=jm
```

### Required Database Setup

Ensure these roles exist:

```sql
SELECT name FROM Role;
```

Should include:

-   REQUESTER
-   DEPT_MANAGER
-   HEAD_OF_DIVISION
-   PROCUREMENT
-   FINANCE
-   ADMIN

---

## Manual Role Assignment (Temporary Workaround)

If LDAP group mapping isn't working yet, you can manually assign roles:

```sql
-- Find your user ID
SELECT id, email FROM User WHERE email = 'your.email@bsj.gov.jm';

-- Find role ID
SELECT id, name FROM Role WHERE name = 'DEPT_MANAGER';

-- Assign role
INSERT INTO UserRole (userId, roleId) VALUES (user_id, role_id);

-- Assign department
UPDATE User SET departmentId = department_id WHERE id = user_id;
```

---

## Debug Log Configuration

To see detailed LDAP debug logs, set:

```bash
LOG_LEVEL=debug
```

This will show:

-   LDAP bind attempts
-   LDAP search queries
-   Group membership extraction
-   Role mapping decisions
-   Department assignment logic

---

## Still Not Working?

1. **Run the diagnostic script:**

    ```bash
    node server/scripts/test-ldap-user.mjs your.email@bsj.gov.jm yourpassword
    ```

2. **Collect these details:**

    - Output from diagnostic script
    - Server log messages during login
    - Your AD group memberships (from AD admin)
    - Current `.env` LDAP configuration

3. **Check common AD group formats:**

    Your AD groups might be in one of these formats:

    ```
    CN=GroupName,OU=Groups,DC=bsj,DC=gov,DC=jm
    CN=GroupName,CN=Users,DC=bsj,DC=gov,DC=jm
    GroupName
    ```

    The code handles all these, but verify in logs what format is returned.

---

## How LDAP Login Works (Flow Diagram)

```
User Login
    ↓
1. Frontend tries /api/auth/login (standard)
    ↓
2. If fails (401), tries /api/auth/ldap-login
    ↓
3. Backend authenticates against LDAP server
    ↓
4. Backend retrieves user attributes:
   - name, email
   - department
   - memberOf (groups)
    ↓
5. Backend matches groups to role mappings
    ↓
6. Backend assigns roles:
   - If groups matched → Use mapped roles
   - If no groups matched → Use admin-assigned roles
   - If no roles at all → Assign REQUESTER
    ↓
7. Backend assigns department:
   - From group mapping (if specified)
   - From LDAP department attribute
   - From existing admin assignment
    ↓
8. Return user with token, roles, department
```

---

## Contact Support

If still having issues after following this guide, provide:

1. Output of diagnostic script
2. Relevant server logs (sanitized - remove passwords!)
3. Your AD group structure
4. Current `.env` LDAP settings (remove passwords!)
