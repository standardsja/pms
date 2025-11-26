# Executive Forward Feature Documentation

## Overview

This document describes the implementation of the "Forward to Executive Director" feature, which allows procurement managers to escalate threshold-exceeding requests directly to the Executive Director for approval.

---

## Business Requirements

### User Story

**As a** Procurement Manager  
**I want to** forward high-value requests to the Executive Director  
**So that** requests exceeding procurement thresholds can be properly approved

### Thresholds

-   **Goods/Services**: JMD $3,000,000
-   **Works**: JMD $5,000,000

Requests exceeding these thresholds require Executive Director approval.

---

## Implementation Details

### Backend Implementation

#### Endpoint

-   **Route**: `POST /requests/:id/forward-to-executive`
-   **Authentication**: Required (JWT)
-   **Authorization**: Procurement Manager or Admin only

#### Request Body

```json
{
    "comment": "Optional comment for the Executive Director"
}
```

#### Response

**Success (200)**:

```json
{
    "success": true,
    "message": "Request forwarded to Executive Director successfully",
    "request": {
        /* updated request object */
    }
}
```

**Error (400/403/404/500)**:

```json
{
    "success": false,
    "error": "Error message",
    "details": {}
}
```

#### Validation Logic

1. **Role Validation**: User must be Procurement Manager or Admin
2. **Threshold Validation**: Request must exceed procurement thresholds
3. **Executive Director Lookup**: System finds active Executive Director
4. **Status Update**: Request status changes to `EXECUTIVE_REVIEW`
5. **Assignment**: Request assigned to Executive Director
6. **Audit Log**: Action recorded with user ID, timestamp, and comment
7. **Notification**: Executive Director receives notification

#### Code Location

`server/index.ts` lines 2353-2480

---

### Frontend Implementation

#### UI Components

##### Forward Button

-   **Icon**: IconSend (green)
-   **Location**: Actions column in Requests table
-   **Visibility Conditions**:
    -   User is Procurement Manager
    -   Request exceeds threshold
    -   Request is NOT already in `EXECUTIVE_REVIEW` status

##### Forward Modal

-   **Title**: "Forward to Executive Director?"
-   **Content**:
    -   Request title
    -   Request value with currency
    -   Threshold category explanation
    -   Optional comment textarea
-   **Actions**: "Forward to Executive" (confirm) or "Cancel"

#### User Flow

1. Procurement Manager views requests list
2. Green forward icon appears on high-value requests
3. Manager clicks forward icon
4. Confirmation modal appears showing:
    - Request details
    - Threshold information
    - Optional comment field
5. Manager confirms or cancels
6. If confirmed:
    - API call to backend
    - Success/error feedback
    - Page refreshes to show updated status

#### Code Locations

-   **Forward Function**: `src/pages/Procurement/Requests/Requests.tsx` lines 176-273
-   **Forward Button**: `src/pages/Procurement/Requests/Requests.tsx` lines 461-488
-   **Icon Import**: `src/pages/Procurement/Requests/Requests.tsx` line 7

---

## Security Features

### Authorization

-   **Role-Based Access Control**: Only Procurement Managers and Admins can forward
-   **Token Validation**: JWT required for all API calls
-   **Database Validation**: Executive Director lookup ensures valid assignment

### Input Validation

-   **Request ID**: Validated as existing request
-   **Threshold Check**: Prevents forwarding of below-threshold requests
-   **Comment Sanitization**: Optional comment field (no required validation)

### Audit Trail

All forward actions create audit log entries with:

-   User ID (who forwarded)
-   Timestamp
-   Action type
-   Optional comment
-   Request ID

---

## Database Changes

### Request Status Update

When forwarded, the request record is updated:

```typescript
{
  status: 'EXECUTIVE_REVIEW',
  currentAssigneeId: executiveDirectorId,
  assignedToExecutiveAt: new Date()
}
```

### Audit Log Entry

```typescript
{
  requestId: number,
  userId: number,
  action: 'FORWARDED_TO_EXECUTIVE',
  details: 'Request forwarded to Executive Director',
  comment?: string,
  timestamp: Date
}
```

### Notification Creation

```typescript
{
  userId: executiveDirectorId,
  type: 'REQUEST_FORWARDED',
  title: 'High-Value Request Requires Approval',
  message: 'A [category] request exceeding [threshold] has been forwarded for your review',
  requestId: number,
  createdAt: Date,
  read: false
}
```

---

## Testing Checklist

### Functional Testing

-   [ ] Procurement Manager can see forward button on high-value requests
-   [ ] Procurement Manager can successfully forward request
-   [ ] Executive Director receives notification
-   [ ] Request status changes to EXECUTIVE_REVIEW
-   [ ] Request is assigned to Executive Director
-   [ ] Audit log is created
-   [ ] Optional comment is saved and visible

### Authorization Testing

-   [ ] Non-procurement users cannot see forward button
-   [ ] API rejects requests from non-authorized users
-   [ ] Below-threshold requests cannot be forwarded
-   [ ] Already-forwarded requests don't show forward button

### Error Handling

-   [ ] Graceful handling if no Executive Director exists
-   [ ] Network error handling with user feedback
-   [ ] Invalid request ID handling
-   [ ] Token expiration handling

### UI/UX Testing

-   [ ] Forward button appears only when appropriate
-   [ ] Modal displays correct request information
-   [ ] Success message confirms action
-   [ ] Page updates after forward
-   [ ] Mobile responsiveness

---

## Dependencies

### Backend

-   `prisma`: Database ORM
-   `checkProcurementThresholds`: Threshold validation service
-   `checkUserRoles`: Role validation utility
-   `createThresholdNotifications`: Notification creation service

### Frontend

-   `IconSend`: Forward button icon
-   `checkExecutiveThreshold`: Client-side threshold checking
-   `MySwal`: Modal/alert library
-   React Router: Navigation

---

## Related Features

### Threshold Notification System

When requests are created or combined, procurement officers/managers receive notifications if thresholds are exceeded. This forward feature is the action taken in response to those notifications.

**Documentation**: `docs/PROCUREMENT_OFFICER_DASHBOARD.md`

### Workflow Status Management

Request statuses follow the procurement workflow:

1. DRAFT
2. SUBMITTED
3. DEPARTMENT_REVIEW
4. **EXECUTIVE_REVIEW** (new status added by forward action)
5. APPROVED
6. REJECTED

---

## Future Enhancements

### Potential Improvements

1. **Bulk Forward**: Allow forwarding multiple requests at once
2. **Comment History**: Track all comments in a timeline
3. **Reminder System**: Automated reminders for pending executive reviews
4. **Delegation**: Executive Director can delegate to Deputy
5. **Analytics**: Dashboard showing forward frequency and approval rates
6. **Email Notifications**: Send email in addition to in-app notification

---

## Support & Troubleshooting

### Common Issues

#### Forward Button Not Appearing

-   **Check**: User role includes "PROCUREMENT" AND "MANAGER"
-   **Check**: Request exceeds threshold for its category
-   **Check**: Request status is not already EXECUTIVE_REVIEW

#### API Call Fails

-   **Check**: JWT token is valid and not expired
-   **Check**: Backend server is running
-   **Check**: Database has active Executive Director user

#### No Executive Director Found

-   **Check**: Database has user with role containing "EXECUTIVE" AND "DIRECTOR"
-   **Check**: Executive Director account is active (not disabled)

---

## Changelog

### Version 1.0 (January 2025)

-   Initial implementation of forward-to-executive feature
-   Backend endpoint with full validation
-   Frontend UI with conditional button display
-   Confirmation modal with optional comment
-   Audit logging and notification system
-   Integration with existing threshold notification system

---

## References

-   **Procurement Thresholds**: `server/services/thresholdService.ts`
-   **Role Utilities**: `server/utils/roleUtils.ts`
-   **Notification Service**: `server/services/notificationService.ts`
-   **Request Types**: `src/types/request.types.ts`
-   **Threshold Utils**: `src/utils/thresholdUtils.ts`
