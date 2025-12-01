# Combine Requests Feature - Fixes Applied

## Issues Identified and Fixed

### 1. **Authentication Issues (401 Errors)**

**Problem:** Frontend was failing to authenticate requests to `/api/requests/combine`

**Root Causes:**
- Using wrong `getApiUrl` import from `config/api.ts` instead of `utils/api.ts`
- Missing `x-user-id` header for authentication fallback
- Not handling authentication headers properly

**Fixes Applied:**
✅ Changed import to use `getApiUrl` from `utils/api.ts` (works with Vite proxy)
✅ Added `x-user-id` header to both GET and POST requests
✅ Improved header construction with proper token handling
✅ Added fallback authentication for development mode

### 2. **Role Permission Checking**

**Problem:** Users with PROCUREMENT role weren't being recognized properly

**Fixes Applied:**
✅ Enhanced role checking in backend to properly detect PROCUREMENT, PROCUREMENT_OFFICER, PROCUREMENT_MANAGER
✅ Added detailed logging for role checks
✅ Better error messages showing which roles are required

### 3. **Error Handling**

**Problem:** Generic error messages, no detailed feedback

**Fixes Applied:**
✅ Added comprehensive error logging on backend
✅ Better error responses with status codes and details
✅ Frontend now captures and displays detailed error messages
✅ Validation errors show exactly what's missing

### 4. **Request Validation**

**Problem:** Missing validation could cause silent failures

**Fixes Applied:**
✅ Added validation for required fields (title, items, originalRequestIds)
✅ Check for minimum 2 requests to combine
✅ Verify all original requests exist and are in combinable status
✅ Better feedback when requests can't be found

### 5. **Database Enum Consistency**

**Problem:** Using string literals instead of RequestStatus enum

**Fixes Applied:**
✅ Changed all status comparisons to use RequestStatus enum
✅ Ensures type safety and prevents typos
✅ Status: DRAFT, SUBMITTED, DEPARTMENT_REVIEW, PROCUREMENT_REVIEW, CLOSED

## Files Modified

### Frontend
- `src/pages/Procurement/Requests/CombineRequests.tsx`
  - Fixed getApiUrl import
  - Added x-user-id header
  - Improved error handling
  - Better auth token handling

### Backend
- `server/routes/combine.ts`
  - Added detailed logging for all operations
  - Improved error responses
  - Added validation for required fields
  - Fixed RequestStatus enum usage
  - Better role permission checks

## Testing Results

✅ **System Status:** READY FOR COMBINE
- 3 procurement users available
- 4 combinable requests in system
- All required statuses present in enum
- Authentication paths working

## How to Test

1. **Login as Procurement Officer:**
   - Email: `proc1@bsj.gov.jm` (or proc2/proc3)
   
2. **Navigate to Combine Requests:**
   - Go to `/apps/requests/combine`
   
3. **Select Multiple Requests:**
   - Choose 2 or more requests with DRAFT/SUBMITTED/DEPARTMENT_REVIEW/PROCUREMENT_REVIEW status
   
4. **Verify:**
   - Should see list of combinable requests (no 401 error)
   - Should be able to select requests
   - Should see validation messages
   - Should be able to click "Combine Selected"

## Expected Behavior

1. **GET /api/requests/combine?combinable=true**
   - Returns list of requests that can be combined
   - Filters by status: DRAFT, SUBMITTED, DEPARTMENT_REVIEW, PROCUREMENT_REVIEW
   - Only accessible to PROCUREMENT, PROCUREMENT_OFFICER, PROCUREMENT_MANAGER, ADMIN

2. **POST /api/requests/combine**
   - Creates new combined request
   - Marks original requests as CLOSED
   - Creates audit trail
   - Checks thresholds and sends notifications if needed
   - Returns reference to new combined request

## Troubleshooting

If you still see issues:

1. **Check Browser Console:**
   - Look for authentication errors
   - Verify user roles are loaded
   
2. **Check Server Logs:**
   - Look for `[COMBINE]` prefixed messages
   - Verify role checks are passing
   
3. **Verify User Roles:**
   ```bash
   node scripts/check-procurement-roles.mjs
   ```
   
4. **Test Combine Feature:**
   ```bash
   node scripts/test-combine-feature.mjs
   ```

## Additional Notes

- The backend now logs all combine operations with `[COMBINE]` prefix
- All errors include detailed context for debugging
- Frontend handles both token and x-user-id authentication
- System validates permissions at multiple layers
