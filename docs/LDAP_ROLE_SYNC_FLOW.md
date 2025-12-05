# LDAP Role Sync - How It Works for New Users

## ✅ YES - Roles ARE Automatically Picked Up

When someone logs in with their LDAP account, the system automatically extracts their roles through this flow:

---

## Complete Login Flow with Role Sync

```
1. USER LOGS IN
   ├─ Email: jane.doe@company.com
   └─ Password: [from LDAP]

2. LDAP AUTHENTICATION
   ├─ Connect to: ldap://BOS.local:389
   ├─ Authenticate credentials
   ├─ Retrieve user details (name, email, groups)
   └─ Extract AD group memberships
      Example groups from AD:
      ├─ CN=procurement-officers,OU=roles,DC=BOS,DC=local
      ├─ CN=finance-officers,OU=roles,DC=BOS,DC=local
      └─ CN=department-heads,OU=roles,DC=BOS,DC=local

3. CHECK IF USER EXISTS IN DATABASE
   ├─ If NOT found: Create new user record
   └─ If found: Update existing record

4. ROLE SYNC SERVICE (ldapRoleSyncService.ts)

   STEP 1: Extract AD Groups → Map to Roles
   ├─ Take user's AD group memberships
   ├─ Match against ldapGroupMappings:
   │  ├─ cn=procurement-officers,... → PROCUREMENT_OFFICER
   │  ├─ cn=finance-officers,... → FINANCE_OFFICER
   │  └─ cn=department-heads,... → DEPARTMENT_HEAD
   ├─ Result: ["PROCUREMENT_OFFICER", "FINANCE_OFFICER", "DEPARTMENT_HEAD"]
   └─ Assign these roles in database

   STEP 2: Fallback - If No AD Groups Match
   ├─ Check admin-assigned roles in database
   └─ Use those if available

   STEP 3: Final Fallback - If No Roles At All
   ├─ Assign default REQUESTER role
   └─ Ensures user always has a role

5. DEPARTMENT ASSIGNMENT
   ├─ Check if AD mapping includes department
   └─ Assign department if specified in mapping

6. RETURN AUTHENTICATED SESSION
   └─ JWT token with roles:
      {
        "roles": ["PROCUREMENT_OFFICER", "FINANCE_OFFICER", "DEPARTMENT_HEAD"],
        "email": "jane.doe@company.com",
        "name": "Jane Doe"
      }

7. USER IS LOGGED IN WITH CORRECT PERMISSIONS
   └─ Sidebar updates
   └─ All role-based features enabled
   └─ Access control enforced
```

---

## Real World Example

### Scenario: Jane Doe logs in

**Step 1: LDAP Authentication**

-   Connects to BOS.local
-   Validates jane.doe@company.com password
-   Retrieves her AD profile:
    ```
    DN: CN=Jane Doe,OU=Users,DC=BOS,DC=local
    Email: jane.doe@company.com
    Title: Finance Officer
    Groups:
      - CN=finance-officers,OU=roles,DC=BOS,DC=local
      - CN=department-heads,OU=roles,DC=BOS,DC=local
      - CN=users,OU=security,DC=BOS,DC=local
    ```

**Step 2: Role Mapping**

-   Finance officers group → FINANCE_OFFICER role
-   Department heads group → DEPARTMENT_HEAD role
-   Users group → (no mapping, ignored)

**Step 3: Database Update**

-   Create/update Jane in database
-   Assign roles:
    -   FINANCE_OFFICER
    -   DEPARTMENT_HEAD

**Step 4: Session Return**

```json
{
    "token": "eyJhbGc...",
    "user": {
        "id": 42,
        "email": "jane.doe@company.com",
        "name": "Jane Doe",
        "roles": ["FINANCE_OFFICER", "DEPARTMENT_HEAD"],
        "department": "Finance"
    }
}
```

**Result**: Jane logs in with FINANCE_OFFICER and DEPARTMENT_HEAD permissions automatically!

---

## How Group Mappings Work

### Current Mappings (from roles-permissions.json)

```json
"ldapGroupMappings": {
    "cn=procurement-officers,ou=roles,dc=company,dc=com": "PROCUREMENT_OFFICER",
    "cn=procurement-managers,ou=roles,dc=company,dc=com": "PROCUREMENT_MANAGER",
    "cn=finance-officers,ou=roles,dc=company,dc=com": "FINANCE_OFFICER",
    "cn=finance-payment,ou=roles,dc=company,dc=com": "FINANCE_PAYMENT_STAGE",
    "cn=department-heads,ou=roles,dc=company,dc=com": "DEPARTMENT_HEAD",
    "cn=executive-directors,ou=roles,dc=company,dc=com": "EXECUTIVE_DIRECTOR",
    "cn=senior-directors,ou=roles,dc=company,dc=com": "SENIOR_DIRECTOR",
    "cn=auditors,ou=roles,dc=company,dc=com": "AUDITOR"
}
```

**When user logs in:**

1. System checks their AD groups
2. Finds matches in this mapping
3. Applies the corresponding roles

---

## What If User Isn't in an AD Group?

**Fallback Hierarchy:**

```
1. User has AD groups that match mappings?
   ├─ YES → Apply AD-mapped roles
   └─ NO → Go to step 2

2. User has admin-assigned roles in database?
   ├─ YES → Apply those roles
   └─ NO → Go to step 3

3. No roles at all?
   └─ Assign default REQUESTER role
```

This ensures:

-   ✅ Primary source: AD group memberships
-   ✅ Fallback: Admin panel assignments
-   ✅ Final fallback: Default REQUESTER role
-   ✅ Users never get locked out

---

## Security Benefits

✅ **Centralized Management**: Roles managed in Active Directory
✅ **Automatic Sync**: Changes in AD groups reflected on next login
✅ **No Hardcoding**: Roles in mapping file, not code
✅ **Audit Trail**: All role changes logged
✅ **Hybrid System**: Works with or without AD
✅ **Admin Override**: Can manually assign roles if needed

---

## Testing It Out

To test if LDAP role sync is working:

1. **Create an AD user** in a procurement-related group
2. **Log in** with those credentials
3. **Check logs** for:
    ```
    [INFO] LDAP authentication successful
    [INFO] LDAP user roles synced
    [INFO] Roles assigned from AD groups
    ```
4. **Verify** user has correct permissions in UI

---

## Next Steps

If roles aren't picking up correctly:

1. **Check AD group names** - Must match exactly in mapping file
2. **Verify group memberships** - User must be member of the group
3. **Review logs** - Look for "No AD group mappings found"
4. **Update mappings** - Edit roles-permissions.json if AD structure differs

---

**Status**: ✅ **LDAP Role Sync is ACTIVE and AUTOMATIC**
**Works for**: All users logging in with LDAP credentials
**Updated**: December 5, 2025
