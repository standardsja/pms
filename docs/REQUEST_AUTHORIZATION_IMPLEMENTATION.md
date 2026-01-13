# Request Authorization Implementation

**Date:** January 2025  
**Status:** ✅ Complete

## Overview

Implemented comprehensive authorization controls ensuring only authorized users can edit and approve procurement requests. The system enforces strict role-based access at both backend (API) and frontend (UI) layers.

---

## Authorization Rules

### Who Can Edit a Request?

1. **Request Creator** - Can edit only when status is `DRAFT`
2. **Current Assignee** - Can edit at their approval stage
3. **Full Access Roles** - Can edit at any stage:
   - `EXECUTIVE_DIRECTOR`
   - `EXECUTIVE`
   - `PROCUREMENT_OFFICER`
   - `PROCUREMENT_MANAGER`
   - `ADMIN`

### Who Can Approve/Reject a Request?

1. **Current Assignee** - The user assigned to the current workflow stage
2. **Full Access Roles** - Listed above

### Exclusions

- **Evaluation Forms** - NOT restricted (multiple users need to edit after procurement dispatch)

---

## Backend Implementation

### 1. PUT /api/requests/:id (Line 2809)

**Purpose:** Update request details  
**Authorization Logic:**

```typescript
const existingRequest = await prisma.procurementRequest.findUnique({
  where: { id: requestId },
  include: { requester: true }
});

const actingUser = await prisma.user.findUnique({
  where: { id: req.user!.userId },
  include: { roles: true }
});

const userRoleNames = actingUser?.roles.map(r => r.name) || [];
const hasFullAccess = userRoleNames.some(r => 
  r === 'EXECUTIVE_DIRECTOR' || 
  r === 'EXECUTIVE' || 
  r === 'PROCUREMENT_OFFICER' || 
  r === 'PROCUREMENT_MANAGER' || 
  r === 'ADMIN'
);

const isRequester = existingRequest?.requesterId === req.user!.userId;
const isDraft = existingRequest?.status === 'DRAFT';
const isCurrentAssignee = existingRequest?.currentAssigneeId === req.user!.userId;

const canEdit = hasFullAccess || (isRequester && isDraft) || isCurrentAssignee;

if (!canEdit) {
  logger.warn(`Unauthorized edit attempt on request ${requestId} by user ${req.user!.userId}`);
  return res.status(403).json({ 
    message: 'You are not authorized to edit this request' 
  });
}
```

**Returns:** 403 Forbidden if unauthorized

---

### 2. POST /api/requests/:id/action (Line 3442)

**Purpose:** Approve or reject a request  
**Authorization Logic:**

```typescript
const existingRequest = await prisma.procurementRequest.findUnique({
  where: { id: requestId },
  include: { requester: true, currentAssignee: true }
});

const actingUser = await prisma.user.findUnique({
  where: { id: req.user!.userId },
  include: { roles: true }
});

const userRoleNames = actingUser?.roles.map(r => r.name) || [];
const hasFullAccess = userRoleNames.some(r => 
  r === 'EXECUTIVE_DIRECTOR' || 
  r === 'EXECUTIVE' || 
  r === 'PROCUREMENT_OFFICER' || 
  r === 'PROCUREMENT_MANAGER' || 
  r === 'ADMIN'
);

const isCurrentAssignee = existingRequest?.currentAssigneeId === req.user!.userId;

if (!isCurrentAssignee && !hasFullAccess) {
  return res.status(403).json({
    message: 'You are not authorized to perform this action. Only the assigned approver can take action on this request.'
  });
}
```

**Returns:** 403 Forbidden if unauthorized

---

## Frontend Implementation

### 1. Authorization Hook (Lines 235-262)

**File:** `src/pages/Procurement/Requests/RequestForm.tsx`

```typescript
const canEditForm = useMemo(() => {
  // New requests are always editable
  if (!isEditMode) return true;

  // Check if current user is the requester
  const isRequester = requestRequesterId === currentUserId;
  const isDraft = currentStatus === 'DRAFT';
  
  // Requester can edit their own drafts
  if (isRequester && isDraft) return true;

  // Current assignee can edit at their stage
  if (isAssignee) return true;

  // Full access roles can always edit
  const hasFullAccess = userRoles.some(r => 
    r === 'EXECUTIVE_DIRECTOR' || 
    r === 'EXECUTIVE' || 
    r === 'PROCUREMENT_OFFICER' || 
    r === 'PROCUREMENT_MANAGER' || 
    r === 'ADMIN'
  );

  return hasFullAccess || false;
}, [isEditMode, requestMeta, requestRequesterId, currentUserId, isAssignee, userRoles]);
```

---

### 2. Form Field Restrictions

**Updated Fields:**
- Line 1439: `requestedBy` (Requested By)
- Line 1510: `institution` (Institution)
- Line 1522: `division` (Division)
- Line 1537: `branchUnit` (Branch/Unit)
- Line 1572: `email` (Email)

**Pattern:**
```typescript
readOnly={!canEditForm}
```

**Before:**
```typescript
readOnly={!isEditMode}
```

---

### 3. Submit Button Authorization (Line 2206)

**Updated Logic:**

```typescript
disabled={
  isSubmitting || 
  (!isEditMode && (!isFormCodeComplete || headerSequence === '000')) || 
  (isEditMode && !canEditForm)
}
```

**User Feedback:**
```typescript
title={
  !isEditMode && (!isFormCodeComplete || headerSequence === '000') 
    ? 'Complete the form code before submitting' 
    : isEditMode && !canEditForm 
    ? 'You do not have permission to edit this request' 
    : undefined
}
```

---

## Security Layers

### Layer 1: Backend API Validation
- Validates user identity and roles on every request
- Fetches request + user data from database
- Returns 403 with clear error messages
- Logs unauthorized attempts

### Layer 2: Frontend Authorization Hook
- Computes `canEditForm` based on user context
- Reactive to request status and assignment changes
- Uses `useMemo` for performance

### Layer 3: UI Field Restrictions
- Makes form fields read-only when unauthorized
- Disables submit button with explanatory tooltip
- Prevents accidental edit attempts

---

## Workflow Compatibility

The authorization system respects the procurement workflow:

**Creator → Department Head → Executive Director**

- **DRAFT:** Only requester can edit
- **DEPARTMENT_REVIEW:** Only department manager can approve/reject
- **HOD_REVIEW:** Only Head of Division can approve/reject
- **FINANCE_REVIEW:** Only Finance role can approve/reject
- **BUDGET_MANAGER_REVIEW:** Only Budget Manager can approve/reject
- **PROCUREMENT_REVIEW:** Only Procurement roles can approve/reject
- **FINANCE_APPROVED:** Workflow complete

Full access roles can intervene at any stage.

---

## Testing Checklist

### Backend Tests
- ✅ PUT /api/requests/:id returns 403 for unauthorized users
- ✅ POST /api/requests/:id/action returns 403 for non-assignees
- ✅ Requesters can edit DRAFT requests
- ✅ Current assignee can edit at their stage
- ✅ Full access roles can edit any request
- ✅ 403 errors include clear messages

### Frontend Tests
- ✅ Form fields are read-only for unauthorized users
- ✅ Submit button is disabled with tooltip
- ✅ canEditForm hook updates when assignment changes
- ✅ New requests remain fully editable
- ✅ No console errors on permission denial

### End-to-End Tests
1. Create request as regular user → Submit
2. Login as unauthorized user → Cannot edit (fields read-only)
3. Login as assigned approver → Can edit and approve
4. Login as EXECUTIVE_DIRECTOR → Can edit any request
5. Verify backend returns 403 on unauthorized API calls

---

## Files Modified

### Backend
- `/server/index.ts`
  - Line 2809: Added authorization to PUT /api/requests/:id
  - Line 3442: Strengthened authorization on POST /api/requests/:id/action

### Frontend
- `/src/pages/Procurement/Requests/RequestForm.tsx`
  - Line 1: Added `useMemo` import
  - Lines 235-262: Added `canEditForm` authorization hook
  - Lines 1439, 1510, 1522, 1537, 1572: Updated `readOnly` props
  - Line 2206: Updated submit button disabled logic with tooltip

---

## Notes

1. **Evaluation forms excluded** - Per user requirement, evaluation forms remain editable by multiple users after procurement dispatch
2. **Exact role matching** - Uses `r === 'EXECUTIVE_DIRECTOR'` instead of `includes('EXEC')`
3. **Three-layer enforcement** - Backend validation, frontend hook, UI restrictions
4. **Clear error messages** - Users understand why they cannot edit
5. **Performance optimized** - Uses `useMemo` to prevent unnecessary recalculations

---

## Maintainer Notes

**When adding new editable fields:**
1. Add to RequestForm.tsx state
2. Set `readOnly={!canEditForm}` on input element
3. Backend validation is automatic (validates entire req.body)

**When adding new roles:**
1. Update `hasFullAccess` check in backend (2 locations)
2. Update `hasFullAccess` check in frontend hook
3. Ensure role exists in database Role table

**When modifying workflow:**
1. Update workflow status transitions
2. Update assignment logic
3. Authorization rules auto-adapt to current assignee

---

## Related Documentation
- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md) - Workflow stages
- [BACKEND_ENDPOINTS_VERIFICATION.md](./BACKEND_ENDPOINTS_VERIFICATION.md) - API endpoints
- [BACKEND_MIDDLEWARE_GUIDE.md](./BACKEND_MIDDLEWARE_GUIDE.md) - Authentication middleware
