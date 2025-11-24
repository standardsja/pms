# Evaluation Committee Dashboard

## Overview

The Committee Dashboard provides a centralized interface for evaluation committee members to review, verify, and manage evaluation sections submitted for their approval.

## Features

### 1. Statistics Overview

-   **Pending Review**: Total sections awaiting committee action
-   **Submitted**: Sections ready for verification
-   **Verified**: Successfully approved sections
-   **Returned**: Sections sent back for revision

### 2. Section Review Queue

Displays all evaluation sections with their current status:

-   Evaluation number and RFQ details
-   Section identifier (A-E) with description
-   Creator information
-   Current status (Submitted, Verified, Returned)
-   Due dates
-   Quick action buttons

### 3. Status Filtering

Filter sections by status:

-   **Submitted**: Ready for your review (default view)
-   **Returned**: Sections awaiting revision
-   **Verified**: Already approved sections
-   **All**: Complete overview

### 4. Workflow Actions

-   **Review & Verify**: Click to navigate to detailed section review
-   **Verify**: Approve the section to unlock next section for creator
-   **Return**: Send back with feedback if changes needed

## User Flow

### For Committee Members

1. **Login** → Automatically redirected to Committee Dashboard
2. **View pending sections** in the "Submitted" tab
3. **Click review button** to open detailed evaluation
4. **Take action**:
    - Verify → Approves section, unlocks next
    - Return → Sends back with notes
5. **Section unlocked** for creator to continue

### Sequential Workflow

Sections must be completed in order:

-   Section A → Section B → Section C → Section D → Section E
-   Each section must be verified before the next can be submitted
-   Returned sections must be resubmitted before proceeding

## Navigation

### Access Points

1. **Direct Login**: Committee members land on dashboard
2. **From Evaluation List**: "Committee Dashboard" button (committee members only)
3. **From Committee Review**: "Dashboard" button in header

### Routes

-   **Dashboard**: `/procurement/evaluation/committee/dashboard`
-   **Section Review**: `/procurement/evaluation/{id}/committee`
-   **Evaluation List**: `/procurement/evaluation`

## Permissions

### Committee Members Only

-   Must have `EVALUATION_COMMITTEE` role
-   Can verify and return sections
-   See all sections across all evaluations

### Non-Committee Users

-   Redirected to evaluation list
-   Cannot access dashboard
-   Cannot verify sections

## Section Status Workflow

```
NOT_STARTED → IN_PROGRESS → SUBMITTED → VERIFIED
                               ↓
                          RETURNED → IN_PROGRESS (cycle)
```

### Status Meanings

| Status      | Description            | Available Actions       |
| ----------- | ---------------------- | ----------------------- |
| NOT_STARTED | Section not yet opened | None                    |
| IN_PROGRESS | Creator is working     | None                    |
| SUBMITTED   | Ready for committee    | Verify, Return          |
| VERIFIED    | Approved by committee  | View only               |
| RETURNED    | Needs revision         | None (creator must fix) |

## Dashboard Sections

### 1. Header

-   Title: "Evaluation Committee Dashboard"
-   Description: Review and verify evaluation sections
-   Action: Link to full evaluation list

### 2. Statistics Cards

Four metric cards showing:

-   Pending Review (warning badge)
-   Submitted (info badge)
-   Verified (success badge)
-   Returned (danger badge)

### 3. Section Review Queue

Table columns:

-   **Evaluation**: Clickable evaluation number
-   **RFQ**: Reference number and title
-   **Section**: ID and name
-   **Creator**: Who submitted it
-   **Status**: Current state badge
-   **Due Date**: Evaluation deadline
-   **Actions**: Review button

### 4. Help Section

Workflow guide explaining:

-   What each status means
-   Available actions
-   Sequential requirement

## Empty States

### No Submitted Sections

Shows success icon with message:

-   "No sections awaiting review"
-   "All submitted sections have been processed"

### Filtered View Empty

Shows message:

-   "No sections found with status: {filter}"

## Technical Details

### Component

`src/pages/Procurement/Evaluation/CommitteeDashboard.tsx`

### Dependencies

-   `evaluationService`: Fetch evaluations
-   `getUser`: Check committee role
-   React Router: Navigation
-   Redux: Page title

### Data Flow

1. Load all evaluations from backend
2. Extract section-level tasks
3. Filter by status (default: SUBMITTED)
4. Display in table with actions
5. Navigate to committee review on click

### Performance

-   Memoized task extraction
-   Memoized filtering
-   Memoized statistics calculation
-   Only re-computes on evaluation changes

## Benefits

✅ **Centralized View**: All pending verifications in one place
✅ **Status Transparency**: Clear visibility of workflow state
✅ **Quick Actions**: One-click navigation to reviews
✅ **Prioritization**: Filter by status to focus on urgent items
✅ **Role Enforcement**: Committee-only access with guards
✅ **Sequential Integrity**: Cannot skip sections
✅ **Audit Trail**: All actions tracked with timestamps

## Related Files

-   `src/pages/Procurement/Evaluation/CommitteeDashboard.tsx` - Dashboard component
-   `src/pages/Procurement/Evaluation/EvaluationCommittee.tsx` - Section review page
-   `src/pages/Procurement/Evaluation/EvaluationList.tsx` - All evaluations list
-   `src/services/evaluationService.ts` - API integration
-   `src/router/routes.tsx` - Route configuration
-   `src/pages/Procurement/Auth/Login.tsx` - Role-based redirect

## API Endpoints Used

-   `GET /api/evaluations` - Fetch all evaluations with section statuses
-   `POST /api/evaluations/:id/sections/:section/verify` - Approve section
-   `POST /api/evaluations/:id/sections/:section/return` - Return with notes

## Future Enhancements

⏳ **Notifications**: Email alerts for new submissions
⏳ **Bulk Actions**: Verify multiple sections at once
⏳ **Comments**: Discussion threads on sections
⏳ **History**: View past verification decisions
⏳ **Analytics**: Committee performance metrics
⏳ **Deadlines**: Highlight overdue sections
⏳ **Assignment**: Assign specific sections to committee members

---

**Status**: Fully implemented and tested ✅
**Last Updated**: November 24, 2025
