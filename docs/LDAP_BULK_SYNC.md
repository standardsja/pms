# LDAP Bulk User Synchronization Guide

## Overview

The PMS system can now **automatically import all users from Active Directory** and assign them roles based on their AD group memberships. This eliminates the need for users to log in individually before being provisioned in the system.

## How It Works

### 1. **Automatic Role Assignment**

-   The system searches Active Directory for all users
-   For each user, it reads their `memberOf` attribute (AD group memberships)
-   AD groups are mapped to PMS roles using `server/config/ldapGroupMapping.ts`
-   Users are created/updated in the database with their assigned roles

### 2. **AD Group to Role Mapping**

Current mappings (configurable in `ldapGroupMapping.ts`):

| AD Group                   | PMS Roles                        | Department  |
| -------------------------- | -------------------------------- | ----------- |
| `PMS_Finance_Managers`     | DEPT_MANAGER, FINANCE            | Finance     |
| `PMS_Procurement_Officers` | PROCUREMENT_OFFICER, PROCUREMENT | Procurement |
| `PMS_Innovation_Committee` | INNOVATION_COMMITTEE             | -           |
| `PMS_Evaluation_Committee` | EVALUATION_COMMITTEE             | -           |
| `PMS_Admins`               | ADMIN, REQUESTER                 | -           |
| `PMS_IT_Managers`          | DEPT_MANAGER                     | ICT         |
| `PMS_HR_Staff`             | REQUESTER                        | HR          |

**Note:** Users without any AD groups get the default `REQUESTER` role.

---

## Usage

### Method 1: PowerShell Script (Recommended)

Run the provided script to sync all users:

```powershell
# Make sure the server is running first
cd server
npm start

# In another terminal, run the sync script
cd ..
.\sync-ldap-users.ps1
```

The script will:

1. Ask for your admin credentials
2. Show current sync statistics
3. Ask for confirmation
4. Import all AD users with their roles
5. Display detailed results

### Method 2: API Endpoint

**Admin users** can call the API directly:

#### Get Sync Statistics

```bash
GET /api/auth/ldap/sync-stats
Authorization: Bearer <admin-token>
```

Response:

```json
{
    "success": true,
    "statistics": {
        "ldapConfigured": true,
        "totalADUsers": 150,
        "usersInDatabase": 120,
        "usersWithLDAPDN": 80,
        "syncPercentage": 53
    }
}
```

#### Perform Bulk Sync

```bash
POST /api/auth/ldap/bulk-sync
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "filter": "(optional custom LDAP filter)"
}
```

Response:

```json
{
    "success": true,
    "message": "Bulk synchronization completed",
    "result": {
        "totalUsersFound": 150,
        "usersImported": 30,
        "usersUpdated": 50,
        "usersFailed": 2,
        "duration": "12.5s",
        "errors": [{ "email": "user@example.com", "error": "reason" }]
    }
}
```

---

## What Gets Synced

For each AD user, the system imports:

-   ✅ **Email** (from `mail` or `userPrincipalName`)
-   ✅ **Name** (from `displayName` or `cn`)
-   ✅ **Department** (from `department` attribute)
-   ✅ **Profile Photo** (from `thumbnailPhoto` if available)
-   ✅ **Roles** (mapped from `memberOf` AD groups)
-   ✅ **LDAP DN** (for authentication)

---

## Configuration

### Customize AD Group Mappings

Edit `server/config/ldapGroupMapping.ts`:

```typescript
export const DEFAULT_GROUP_MAPPINGS: GroupRoleMapping[] = [
    {
        adGroupName: 'YourADGroup',
        roles: ['ROLE1', 'ROLE2'],
        department: 'DEPT_CODE',
        departmentName: 'Department Full Name',
    },
    // ... more mappings
];
```

### LDAP Filter (Advanced)

By default, the sync uses this filter:

```
(&(objectClass=user)(userPrincipalName=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

This means:

-   ✅ User objects only (not computers)
-   ✅ Must have a userPrincipalName (email)
-   ✅ Excludes disabled accounts

To customize, pass a `filter` parameter in the API request.

---

## Security

-   🔒 **Admin Only**: Only users with ADMIN role can trigger bulk sync
-   🔒 **Secure Binding**: Uses service account credentials from environment
-   🔒 **No Password Storage**: User passwords stay in AD, never stored in PMS
-   🔒 **Audit Logging**: All sync operations are logged with details

---

## Scheduling Automatic Syncs

### Option 1: Windows Task Scheduler

Create a scheduled task to run the sync script daily:

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., daily at 2 AM)
4. Action: Start a program
    - Program: `powershell.exe`
    - Arguments: `-File "C:\path\to\sync-ldap-users.ps1"`
5. Save credentials for task to run

### Option 2: Cron Job (Linux/macOS)

```bash
# Run daily at 2 AM
0 2 * * * /usr/bin/curl -X POST http://localhost:3000/api/auth/ldap/bulk-sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Troubleshooting

### "LDAP is not configured"

-   Check `.env` file has all LDAP\_\* variables set
-   Verify LDAP_URL is reachable
-   Test connection: `GET /api/auth/ldap/test`

### "Authentication failed"

-   Ensure you're using an admin account
-   Admin account must have the ADMIN role in database

### "Failed to sync user"

-   Check server logs for specific errors
-   Verify AD group mappings are correct
-   Ensure service account has read permissions

### Partial Sync Results

-   Users without email addresses are skipped
-   Disabled AD accounts are excluded by default
-   Check `errors` array in response for details

---

## Best Practices

1. **Initial Sync**: Run manually first to verify mappings
2. **Regular Syncs**: Schedule daily syncs to keep roles updated
3. **Monitor Logs**: Check server logs after each sync
4. **Update Mappings**: Keep AD group mappings current with org changes
5. **Test First**: Test with a filtered subset before full sync

---

## Example Workflow

1. **Configure LDAP** in `.env`:

    ```env
    LDAP_URL=ldap://dc.company.local:389
    LDAP_BIND_DN=CN=PMSService,OU=ServiceAccounts,DC=company,DC=local
    LDAP_BIND_PASSWORD=SecurePassword123
    LDAP_SEARCH_DN=DC=company,DC=local
    ```

2. **Customize AD Group Mappings** in `ldapGroupMapping.ts` to match your AD structure

3. **Run Initial Sync**:

    ```powershell
    .\sync-ldap-users.ps1
    ```

4. **Verify Results**:

    - Check Users admin panel
    - Verify roles are assigned correctly
    - Test user login

5. **Schedule Regular Syncs** (optional)

---

## API Reference

### GET `/api/auth/ldap/sync-stats`

-   **Auth**: Admin required
-   **Returns**: Current sync statistics

### POST `/api/auth/ldap/bulk-sync`

-   **Auth**: Admin required
-   **Body**: `{ "filter": "optional LDAP filter" }`
-   **Returns**: Sync results with counts and errors

---

## Support

For issues or questions:

1. Check server logs: `server/logs/`
2. Review LDAP configuration: `server/config/environment.ts`
3. Verify AD group mappings: `server/config/ldapGroupMapping.ts`
4. Test LDAP connection: `GET /api/auth/ldap/test`
