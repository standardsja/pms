# LDAP Quick Start Guide

## For System Administrators

### Quick Status Check

✅ **LDAP Integration Status:** Complete and Tested  
✅ **LDAP Server:** BOS.local (ldap://BOS.local:389)  
✅ **Connection Test:** Successful  
✅ **Service Account:** CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local

---

## How Users Login

### Option 1: Active Directory (LDAP)

1. Go to login page
2. Click **"Active Directory"** tab
3. Enter: `username@bos.local`
4. Enter: Windows/AD password
5. Click Sign In

### Option 2: Local Account

1. Go to login page
2. Click **"Local Account"** tab (default)
3. Enter: email address
4. Enter: local password
5. Click Sign In

---

## First-Time LDAP User Flow

When a BOS employee logs in with LDAP for the first time:

1. ✅ System authenticates against Active Directory
2. ✅ System creates local user account automatically
3. ⚠️ User has **NO ROLES** initially
4. 👨‍💼 Admin must assign roles manually
5. ✅ User can then access system features

**Important:** New LDAP users need role assignment before they can do anything meaningful!

---

## Assigning Roles to LDAP Users

### As an Administrator:

1. Wait for user to complete first login
2. Go to **Admin Settings** → **User Management**
3. Find the new user (search by email)
4. Click **Edit** or **Assign Roles**
5. Select appropriate roles:
    - `PROCUREMENT_OFFICER` - For procurement staff
    - `DEPT_MANAGER` - For department heads
    - `PROCUREMENT_MANAGER` - For procurement managers
    - `EXECUTIVE_DIRECTOR` - For executives
    - `FINANCE` - For finance team
    - `EVALUATION_COMMITTEE` - For evaluation members
6. Click **Save**
7. User now has full access!

---

## Testing LDAP Connection

### Quick Test (1 minute)

```powershell
cd c:\Users\srobinson\Documents\GitHub\pms\server
node test-ldap-simple.mjs
```

**Expected Output:**

```
✅ LDAP connection successful!
✅ Service account bind successful!
```

### If Test Fails:

1. Check server can reach BOS.local:

    ```powershell
    ping BOS.local
    ```

2. Check LDAP port is open:

    ```powershell
    Test-NetConnection -ComputerName BOS.local -Port 389
    ```

3. Check `.env` file has correct settings:
    ```
    LDAP_URL=ldap://BOS.local:389
    LDAP_BIND_DN=CN=Policy Test,OU=MIS_STAFF,OU=MIS,DC=BOS,DC=local
    LDAP_BIND_PASSWORD=Password@101
    ```

---

## Common Admin Tasks

### View LDAP Configuration

```powershell
cd c:\Users\srobinson\Documents\GitHub\pms\server
cat .env | Select-String "LDAP"
```

### Update Service Account Password

1. Change password in Active Directory
2. Update `.env` file:
    ```env
    LDAP_BIND_PASSWORD=NewPassword123
    ```
3. Restart server:
    ```powershell
    pm2 restart spinx-pms-server
    ```

### Check LDAP Login Logs

```powershell
pm2 logs spinx-pms-server | Select-String "LDAP"
```

Look for:

-   `[LDAP] Attempting authentication for: user@bos.local`
-   `[LDAP] User authentication successful`
-   `[LDAP Login] Creating new user in local DB`

---

## Troubleshooting

### User Can't Login with LDAP

**Check:**

1. User entered correct email format (`username@bos.local`)
2. User entered correct AD password
3. User account exists and is active in AD
4. User account is not locked in AD
5. Server can connect to BOS.local

**Test:**

-   Try logging in with local account instead
-   Check server logs for error details

### User Logged In But Can't Do Anything

**Reason:** User has no roles assigned yet

**Solution:**

1. Go to Admin Settings → User Management
2. Find user by email
3. Assign appropriate roles
4. Ask user to refresh page or logout/login

### LDAP Connection Fails After Working Before

**Common Causes:**

1. Service account password expired
2. Service account disabled
3. Network/firewall issue
4. AD server maintenance

**Quick Fix:**

```powershell
# Test connection
cd c:\Users\srobinson\Documents\GitHub\pms\server
node test-ldap-simple.mjs

# Check network
ping BOS.local

# Check service account in AD Users and Computers
```

---

## Security Checklist

✅ Service account has **read-only** permissions  
✅ Service account password is **strong and unique**  
✅ LDAP credentials stored in `.env` (not in code)  
✅ `.env` file is **not committed to git**  
✅ Rate limiting enabled (5 login attempts per 15 min)  
⏳ Consider upgrading to LDAPS (port 636) for encryption  
⏳ Set up password rotation schedule for service account

---

## Quick Reference

### LDAP Settings Location

```
File: c:\Users\srobinson\Documents\GitHub\pms\server\.env
Variables: LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD, LDAP_SEARCH_BASE, LDAP_SEARCH_FILTER
```

### Login Endpoint

```
POST http://heron:4000/api/auth/ldap-login
Body: { "email": "user@bos.local", "password": "..." }
```

### Test Script

```
c:\Users\srobinson\Documents\GitHub\pms\server\test-ldap-simple.mjs
```

### Logs

```powershell
pm2 logs spinx-pms-server --lines 100 | Select-String "LDAP"
```

---

## Need Help?

### Documentation

-   Full Guide: `docs/LDAP_INTEGRATION.md`
-   Implementation Summary: `docs/LDAP_IMPLEMENTATION_SUMMARY.md`
-   This Quick Start: `docs/LDAP_QUICKSTART_ADMIN.md`

### Configuration Examples

-   Template: `server/.env.ldap.example`
-   Active Config: `server/.env`

### Testing

-   Simple Test: `server/test-ldap-simple.mjs`
-   Full Test: `server/scripts/test-ldap-connection.mjs`

---

**Last Updated:** December 4, 2025  
**Status:** Production Ready ✅  
**LDAP Server:** BOS.local Active Directory
