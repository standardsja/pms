# Request Rejection Workflow Implementation

## Overview

This document describes the rejection workflow feature that allows managers, HODs, and other approvers to reject procurement requests and send them back to requesters with explanatory notes.

## Features

### 1. Rejection Capability

-   **Who Can Reject**: Any user at an approval stage (Department Manager, HOD, Finance Officer, Budget Manager, Procurement Officer, Executive Director)
-   **Authorization**: Users must be either the current assignee OR have the appropriate role for the current workflow stage
-   **Rejection Note**: Required field - approvers must provide a reason for rejection

### 2. Activity/Message Trail

-   All rejection actions are logged in the `RequestAction` table
-   Users can view the complete history of a request's actions
-   Each action shows:
    -   Action type (Returned, Approved, Submitted, etc.)
    -   Who performed the action
    -   When it was performed
    -   Any comments/notes provided

### 3. Workflow Behavior

When a request is rejected:

1. A `RequestAction` record is created with action type `RETURN`
2. Request status changes to `DRAFT`
3. Request is reassigned to the original requester
4. A notification is sent to the requester
5. The rejection note is visible in the activity panel

## Frontend Implementation

### Location

**File**: `src/pages/Procurement/Requests/RequestForm.tsx`

### UI Components Added

#### 1. Reject Button

-   Added to both Manager and HOD approval sections
-   Only visible when the user has edit permissions for that section
-   Opens a rejection modal when clicked

#### 2. View Messages Button

-   Added alongside the Reject button
-   Opens the activity panel showing all request actions
-   Available at all approval stages

#### 3. Rejection Modal

-   Full-screen overlay with centered dialog
-   Contains:
    -   Title: "Reject Request"
    -   Textarea for rejection note (required)
    -   Cancel button
    -   Reject button (disabled during submission)

#### 4. Messages/Activity Panel

-   Full-screen overlay with scrollable content
-   Shows all actions in reverse chronological order
-   Each action displays:
    -   Icon and action type
    -   Timestamp
    -   Performer's name
    -   Comment/note (if provided)

### State Management

```typescript
const [showRejectModal, setShowRejectModal] = useState(false);
const [rejectionNote, setRejectionNote] = useState('');
const [isRejecting, setIsRejecting] = useState(false);
const [requestActions, setRequestActions] = useState<any[]>([]);
const [showMessagesPanel, setShowMessagesPanel] = useState(false);
```

### Functions

#### `fetchRequestActions()`

-   Fetches all actions for the current request
-   Called on page load when in edit mode
-   Endpoint: `GET /api/requests/:id/actions`
-   Updates `requestActions` state

#### `handleReject()`

-   Validates rejection note is not empty
-   Posts rejection to backend
-   Endpoint: `POST /api/requests/:id/reject`
-   Payload: `{ note: rejectionNote }`
-   Re-fetches request actions to populate the Messages panel
-   Opens the Messages panel automatically to show the rejection
-   Displays success message to user
-   Reloads page after user confirms to show updated status

**User Experience Flow:**

1. User clicks "Reject" button
2. Enters rejection reason in modal
3. Clicks "Reject" to confirm
4. Messages panel opens automatically showing the new rejection action
5. Success message displays with confirmation
6. Page reloads to reflect updated status (DRAFT, reassigned to requester)

## Backend Implementation

### Location

**File**: `server/index.ts`

### Endpoints

#### 1. GET /api/requests/:id/actions

**Purpose**: Fetch all actions for a request

**Authentication**: Requires `x-user-id` header

**Response**:

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "requestId": 123,
            "action": "RETURN",
            "comment": "Missing budget justification",
            "performedById": 45,
            "performedBy": {
                "id": 45,
                "name": "John Doe",
                "email": "john@example.com"
            },
            "createdAt": "2024-01-15T10:30:00Z",
            "metadata": {
                "previousStatus": "DEPARTMENT_REVIEW",
                "rejectedAt": "2024-01-15T10:30:00Z"
            }
        }
    ]
}
```

**Error Responses**:

-   401: User ID required
-   404: Request not found
-   500: Server error

#### 2. POST /api/requests/:id/reject

**Purpose**: Reject a request and return it to the requester

**Authentication**: Requires `x-user-id` header

**Request Body**:

```json
{
    "note": "Please provide more details about the procurement justification"
}
```

**Authorization Logic**:

1. Check if user is current assignee
2. If not, check if user has the required role for current stage:
    - `DEPARTMENT_REVIEW` → `DEPT_MANAGER`
    - `HOD_REVIEW` → `HEAD_OF_DIVISION` or `HOD`
    - `FINANCE_REVIEW` → `FINANCE` or `FINANCE_OFFICER`
    - `BUDGET_MANAGER_REVIEW` → `BUDGET_MANAGER`
    - `PROCUREMENT_REVIEW` → `PROCUREMENT`, `PROCUREMENT_MANAGER`, or `PROCUREMENT_OFFICER`
    - `EXECUTIVE_REVIEW` → `EXECUTIVE_DIRECTOR` or `EXECUTIVE`

**Process**:

1. Validate rejection note is provided
2. Verify user authorization
3. Create `RequestAction` record with `RETURN` action type
4. Update request:
    - Set status to `DRAFT`
    - Assign to original requester
    - Create status history entry
5. Send notification to requester

**Response**:

```json
{
    "success": true,
    "message": "Request rejected and returned to requester",
    "data": {
        // Updated request object with includes
    }
}
```

**Error Responses**:

-   400: Rejection note required
-   401: User ID required
-   403: Not authorized to reject
-   404: Request not found
-   500: Server error

## Database Schema

### RequestAction Model

```prisma
model RequestAction {
  id            Int               @id @default(autoincrement())
  requestId     Int
  action        RequestActionType
  comment       String?
  performedById Int?
  metadata      Json?
  createdAt     DateTime          @default(now())
  performedBy   User?             @relation("actionPerformedBy", fields: [performedById], references: [id])
  request       Request           @relation(fields: [requestId], references: [id])
}

enum RequestActionType {
  SUBMIT
  APPROVE
  RETURN          // Used for rejections
  ASSIGN
  EDIT_BUDGET
  COMMENT
  SEND_TO_VENDOR
}
```

## User Flow

### Rejection Flow

1. Approver opens a request assigned to them
2. Reviews the request details
3. Decides to reject (e.g., incomplete information)
4. Clicks "Reject Request" button
5. Modal opens with textarea for rejection note
6. Enters detailed reason for rejection
7. Clicks "Reject Request" in modal
8. System:
    - Creates action record
    - Updates request status to DRAFT
    - Reassigns to requester
    - Sends notification
9. Requester receives notification
10. Requester opens request, sees status is DRAFT
11. Requester clicks "View Messages" to see rejection note
12. Requester makes necessary changes
13. Requester resubmits the request

### Viewing Message History

1. Any user with access to the request clicks "View Messages"
2. Panel opens showing all actions
3. User sees chronological history with:
    - Submission events
    - Approval events
    - Rejection/return events
    - Comments
    - Assignments
4. Each entry shows who did what and when
5. Rejection entries include the full rejection note

## UI Locations

### Manager Section (Lines ~1678-1705)

```tsx
{canEditManagerFields && (
    <div className="space-y-2">
        {/* Approval checkbox and date */}
        <div className="flex gap-2 mt-2">
            <button onClick={() => setShowRejectModal(true)} ...>
                Reject Request
            </button>
            <button onClick={() => setShowMessagesPanel(true)} ...>
                View Messages
            </button>
        </div>
    </div>
)}
```

### HOD Section (Lines ~1721-1748)

Similar layout to Manager section

## Action Type Icons

-   `RETURN` → ↩️ Returned
-   `APPROVE` → ✅ Approved
-   `SUBMIT` → 📤 Submitted
-   `ASSIGN` → 👤 Assigned
-   `COMMENT` → 💬 Comment
-   `EDIT_BUDGET` → 💰 Budget Edited
-   `SEND_TO_VENDOR` → 🚚 Sent to Vendor

## Notifications

### Rejection Notification

When a request is rejected, the requester receives:

-   **Type**: `STAGE_CHANGED`
-   **Message**: `Your request {reference} has been returned for revision: {note}`
-   **Data**: Includes requestId, status, and rejection note

## Security Considerations

1. **Authorization**: Multi-level checks (assignee + role-based)
2. **Required Note**: Cannot reject without providing a reason
3. **Audit Trail**: All rejections logged with timestamp and performer
4. **User Tracking**: `x-user-id` header required for all operations

## Testing Recommendations

1. Test rejection at each workflow stage
2. Verify unauthorized users cannot reject
3. Confirm rejection note is required
4. Check notification is sent to requester
5. Verify request status changes to DRAFT
6. Confirm requester can view rejection notes
7. Test message panel displays all action types
8. Verify resubmission workflow after rejection

## Future Enhancements

Potential improvements:

-   Email notifications for rejections
-   Reply/comment threads on actions
-   File attachments to rejection notes
-   Rejection categories/reasons dropdown
-   Analytics on rejection patterns
-   Bulk rejection handling
