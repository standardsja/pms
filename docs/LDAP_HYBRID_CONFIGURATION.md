# Hybrid LDAP Configuration Guide

## Overview

The PMS now supports a **hybrid LDAP approach** that combines automatic role assignment from Active Directory groups with a fallback to admin panel configuration.

### How It Works

**Authentication Flow:**
```
User Login
    ↓
Try LDAP Authentication (if enabled)
    ↓
    If LDAP succeeds:
        ├─ Extract user's AD group memberships (memberOf attribute)
        ├─ Match groups against configured mappings
        ├─ If groups found → Assign roles from AD group mapping
        ├─ If no groups → Use admin-panel-assigned roles (fallback)
        └─ If still no roles → Assign REQUESTER as default
    ↓
Fall back to database auth (if LDAP fails or disabled)
```

## Configuration

### Step 1: Configure Environment Variables

Add these to your `.env.production`:

```bash
# LDAP Configuration (existing)
LDAP_URL=ldap://172.17.20.21:389
LDAP_BIND_DN=CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local
LDAP_BIND_PASSWORD=Password@101
LDAP_SEARCH_DN=DC=BOS,DC=local

# Optional: Custom AD group-to-role mapping
# Leave unset to use default mapping in server/config/ldapGroupMapping.ts
# LDAP_GROUP_MAPPINGS='[{"adGroupName":"PMS_Finance_Managers","roles":["DEPT_MANAGER","FINANCE"],"department":"FIN"}]'
```

### Step 2: Configure AD Group Mappings

Edit `/server/config/ldapGroupMapping.ts` to map your AD groups to PMS roles and departments:

```typescript
export const DEFAULT_GROUP_MAPPINGS: GroupRoleMapping[] = [
    {
        adGroupName: 'PMS_Finance_Managers',        // AD group name (CN=...)
        roles: ['DEPT_MANAGER', 'FINANCE'],         // Roles to assign
        department: 'FIN',                           // Department code
        departmentName: 'Finance Department',        // Full department name
    },
    // ... more mappings
];
```

**Example AD Group Names:**
- `CN=PMS_Finance_Managers,OU=Groups,DC=bos,DC=local`
- `CN=PMS_IT_Staff,OU=Groups,DC=bos,DC=local`
- `CN=PMS_Procurement_Officers,OU=Groups,DC=bos,DC=local`

The system will match groups by their CN (Common Name) part, so the configuration can use simpler names.

### Step 3: Create AD Groups (Optional)

Create these groups in Active Directory (or customize based on your needs):

| Group Name | Recommended Roles | Department | Purpose |
|---|---|---|---|
| PMS_Finance_Managers | DEPT_MANAGER, FINANCE | FIN | Finance department managers |
| PMS_Finance_Staff | REQUESTER, FINANCE | FIN | Finance staff who make requests |
| PMS_Finance_HOD | HEAD_OF_DIVISION, FINANCE | FIN | Finance HOD for approvals |
| PMS_IT_Managers | DEPT_MANAGER | ICT | IT department managers |
| PMS_IT_Staff | REQUESTER | ICT | IT staff who make requests |
| PMS_Procurement_Officers | PROCUREMENT_OFFICER, PROCUREMENT | PROC | Procurement officers |
| PMS_Admins | ADMIN, REQUESTER | - | System administrators |
| PMS_Innovation_Committee | INNOVATION_COMMITTEE | - | Innovation committee members |
| PMS_Evaluation_Committee | EVALUATION_COMMITTEE | - | Evaluation committee members |

### Step 4: Configure Fallback (Admin Panel)

If users are not yet assigned to AD groups, use the Admin Panel to manually assign:
1. Go to **Admin Settings → User Management**
2. Select a user
3. Assign roles from the dropdown
4. (Optional) Assign a department

This fallback works for users with no AD group memberships.

## Role Assignment Priority

When a user logs in via LDAP, roles are assigned in this order:

1. **AD Groups (Primary)** - If user belongs to mapped AD groups, roles are taken from the group mappings
2. **Admin Panel (Fallback)** - If no AD groups found, use manually-assigned roles from the admin panel
3. **REQUESTER (Default)** - If neither AD groups nor admin assignments exist, assign REQUESTER

## Logging and Debugging

The system logs detailed information about the sync process. Check logs for:

```bash
# View recent LDAP activity
pm2 logs pms-backend | grep "LDAP"
```

Look for messages like:
- `LDAP: User belongs to AD groups, applying mapped roles` - User roles from AD groups
- `LDAP: No AD group mappings found, using admin-assigned roles` - Falling back to admin panel
- `LDAP: No roles found, assigning REQUESTER as default` - Final fallback

### Example Log Output

```json
{
  "level": "info",
  "message": "LDAP user roles synced",
  "email": "john.doe@bos.local",
  "syncSummary": "Roles from AD groups: DEPT_MANAGER, FINANCE | Department: Finance Department"
}
```

## Testing the Configuration

### 1. Test LDAP Connection

```bash
cd /Users/ictdevmac/Documents/GitHub/pms
node server/scripts/test-ldap-connection.mjs
```

### 2. Test Login via API

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@bos.local","password":"password123"}'
```

Check the response to see:
- User ID and email
- Assigned roles
- Assigned department

### 3. Verify AD Group Membership

If user isn't getting expected roles:
1. Check that user belongs to correct AD group in Active Directory
2. Verify group name matches configuration in `ldapGroupMapping.ts`
3. Confirm role exists in database (Admin Settings → view roles)

## Environment-Based Override

For different environments (dev, staging, production), you can override the mapping:

```bash
# Production with different group names
export LDAP_GROUP_MAPPINGS='[
  {"adGroupName":"PROD_FinanceManagers","roles":["DEPT_MANAGER","FINANCE"],"department":"FIN","departmentName":"Finance"},
  {"adGroupName":"PROD_ITManagers","roles":["DEPT_MANAGER"],"department":"ICT","departmentName":"IT"}
]'
```

## Troubleshooting

### Issue: User not getting expected roles after AD group assignment

**Solution:**
1. Verify AD groups in `ldapGroupMapping.ts` match actual AD group names
2. Check if role name exists in database (Admin Settings page)
3. Review logs: `pm2 logs pms-backend | grep "LDAP"`
4. Temporarily assign role via Admin Panel to confirm system works

### Issue: Users can't login because no roles assigned

**Solution:**
1. Ensure REQUESTER role exists in database
2. Check logs for sync errors
3. Manually assign role via Admin Panel as temporary workaround
4. Report issue with logs to system administrator

### Issue: Department not auto-assigning from AD

**Solution:**
1. Verify `department` field in mapping configuration
2. Confirm department code matches database (e.g., 'FIN', 'ICT')
3. Use Admin Panel to manually assign if AD sync fails

## Best Practices

1. **Start Simple** - Create just a few AD groups and test before deploying widely
2. **Document Mappings** - Keep `ldapGroupMapping.ts` updated as org structure changes
3. **Monitor Logs** - Set up log aggregation to catch sync issues early
4. **Test Fallback** - Periodically test admin panel role assignment as backup
5. **Group Naming** - Use consistent naming convention (e.g., `PMS_` prefix) for easy identification
6. **Permissions** - Ensure LDAP bind account can read `memberOf` attribute

## Hybrid Approach Benefits

✅ **Automatic** - AD group membership drives role assignment  
✅ **Flexible** - Admin panel provides fallback for edge cases  
✅ **Scalable** - Large organizations can manage via AD groups  
✅ **Gradual** - Can transition users incrementally from admin panel to AD groups  
✅ **Safe** - Admin panel override always available for troubleshooting  

## Contact & Support

For LDAP configuration questions, contact your IT/Systems Administrator with:
- Current LDAP server settings
- AD group structure
- Desired role mappings
- Any sync issues from logs
