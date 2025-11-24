# Evaluation Committee Workflow - Navigation Fixes

## Issue Summary

Users were encountering a 404 error when accessing the Evaluation Committee page:

-   Error: `Failed to load evaluation: Error: Evaluation not found`
-   Root cause: Trying to fetch evaluation with ID `0` (invalid)

## Root Causes

1. **Route misconfiguration**: Two routes existed for the committee page:

    - `/procurement/evaluation/:id/committee` (correct - with ID parameter)
    - `/procurement/evaluation/committee` (incorrect - without ID parameter)

2. **Invalid navigation**: Login flow was redirecting users to the parameterless route

    - Committee members were sent to `/procurement/evaluation/committee`
    - This caused `id` parameter to be `undefined`, which parsed to `0`

3. **Missing navigation path**: No clear way for users to access committee workflow from evaluation list

## Fixes Applied

### 1. Route Configuration (`src/router/routes.tsx`)

**BEFORE:**

```typescript
{
    path: '/procurement/evaluation/:id/committee',
    element: <EvaluationCommittee />,
},
{
    path: '/procurement/evaluation/committee',  // ❌ Problem route
    element: <EvaluationCommittee />,
},
```

**AFTER:**

```typescript
{
    path: '/procurement/evaluation/:id/committee',  // ✅ Only valid route
    element: <EvaluationCommittee />,
},
```

### 2. Login Navigation (`src/pages/Procurement/Auth/Login.tsx`)

**BEFORE:**

```typescript
if (normalizedRoles.includes('EVALUATION_COMMITTEE')) {
    navigate('/procurement/evaluation/committee'); // ❌ No ID
    return;
}
```

**AFTER:**

```typescript
if (normalizedRoles.includes('EVALUATION_COMMITTEE')) {
    navigate('/procurement/evaluation'); // ✅ Goes to list
    return;
}
```

### 3. Evaluation List Actions (`src/pages/Procurement/Evaluation/EvaluationList.tsx`)

**ADDED:**

-   Committee Workflow button for each evaluation
-   Icon: `IconUsersGroup`
-   Links to: `/procurement/evaluation/${evaluation.id}/committee`
-   Available for all evaluations regardless of status

**UI Enhancement:**

```typescript
<Link to={`/procurement/evaluation/${evaluation.id}/committee`} className="btn btn-sm btn-outline-info" title="Committee Workflow">
    <IconUsersGroup className="h-4 w-4" />
</Link>
```

### 4. Backend Endpoints Updated

Both evaluation endpoints now return complete section verification data:

-   **GET /api/evaluations** (list)

    -   Returns all 25 section verification fields
    -   Includes section verifier relations
    -   Default status: `NOT_STARTED`

-   **GET /api/evaluations/:id** (single)
    -   Returns all 25 section verification fields
    -   Includes section verifier relations
    -   Default status: `NOT_STARTED`

## User Flow (Correct Path)

### For Committee Members:

1. Login → Redirects to `/procurement/evaluation` (list page)
2. Click committee workflow button (users icon) on any evaluation
3. Navigate to `/procurement/evaluation/{id}/committee` ✅
4. Committee page loads with valid evaluation ID

### For All Users:

1. Browse evaluations at `/procurement/evaluation`
2. Click "View Details" (eye icon) to see full evaluation
3. From detail page, click "Committee Review" button
4. Navigate to `/procurement/evaluation/{id}/committee` ✅

## Testing

### Create Test Evaluation

Run the script to create a sample evaluation:

```powershell
node scripts/create-test-evaluation.mjs
```

This creates a test evaluation with:

-   Sample Section A data
-   All section statuses set to `NOT_STARTED`
-   Valid creator and timestamps
-   Ready for workflow testing

### Test the Workflow

1. **Navigate to list**: `/procurement/evaluation`
2. **Click committee button** (users icon) on test evaluation
3. **Verify page loads** with evaluation details
4. **Check section sidebar** shows Section A unlocked, B-E locked
5. **Test workflow**:
    - Fill Section A data
    - Submit for review → status changes to `SUBMITTED`
    - Committee verifies → status changes to `VERIFIED`
    - Section B unlocks automatically

## Benefits

✅ **No more 404 errors** - Users always access committee page with valid evaluation ID
✅ **Clear navigation path** - Committee button visible on all evaluations
✅ **Proper role handling** - Committee members see evaluation list first, then choose which to review
✅ **Consistent routing** - Single source of truth for committee page route
✅ **Better UX** - Users can access committee workflow from list or detail pages

## Related Files Modified

-   `src/router/routes.tsx` - Removed parameterless route
-   `src/pages/Procurement/Auth/Login.tsx` - Fixed committee redirect
-   `src/pages/Procurement/Evaluation/EvaluationList.tsx` - Added committee button
-   `server/index.ts` - Updated both GET endpoints to return section verification fields
-   `scripts/create-test-evaluation.mjs` - New test data script

## API Endpoints

### GET /api/evaluations

Returns list of evaluations with section verification fields.

### GET /api/evaluations/:id

Returns single evaluation with complete section verification data.

### POST /api/evaluations/:id/sections/:section/submit

Submit a section for committee review.

### POST /api/evaluations/:id/sections/:section/verify

Committee verifies a section (requires committee role).

### POST /api/evaluations/:id/sections/:section/return

Committee returns a section with notes (requires committee role).

## Next Steps

1. ✅ Test login flow for committee members
2. ✅ Verify committee button appears in evaluation list
3. ✅ Test complete workflow (submit → verify → unlock next)
4. ✅ Test return mechanism with feedback notes
5. ⏳ Add committee dashboard showing pending verifications
6. ⏳ Add email notifications for workflow events

---

**Status**: All navigation and routing issues resolved ✅
**Last Updated**: November 24, 2025
