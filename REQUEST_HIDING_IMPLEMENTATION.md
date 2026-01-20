# Request Hiding Feature - Implementation Summary

## Overview
Implemented a comprehensive request hiding/archival system that allows admins to hide requests from normal views with reasons and audit logging.

## Components Implemented

### 1. Database Schema Updates
**File:** `server/prisma/schema.prisma`

Added four new fields to the `Request` model:
- `hidden: Boolean @default(false)` - Flag to indicate if request is hidden
- `hiddenAt: DateTime?` - Timestamp when request was hidden
- `hiddenById: Int? @relation(hiddenBy)` - User ID of admin who hid the request
- `hiddenReason: String?` - Reason for hiding the request

Added relationship to User model:
- `hiddenRequests: Request[] @relation("requestHiddenBy")` - Requests hidden by this user

Added indexes for performance:
- Index on `hidden` field
- Index on `hiddenById` field

### 2. Database Migration
**File:** `server/prisma/migrations/20260120_add_request_hiding/migration.sql`

Migration file with SQL statements to:
- Add `hidden`, `hiddenAt`, `hiddenById`, `hiddenReason` columns to `Request` table
- Add foreign key constraint from `hiddenById` to `User(id)`
- Create indexes on `hidden` and `hiddenById` for query performance

**Status:** Ready to deploy with `npx prisma migrate deploy`

### 3. Admin API Endpoints
**File:** `server/routes/admin.ts`

#### GET /api/admin/requests/hidden
Lists all hidden requests with pagination and filters.

**Query Parameters:**
- `limit` (1-500, default: 20) - Number of results per page
- `offset` (default: 0) - Pagination offset
- `department` (optional) - Filter by department ID
- `hiddenBy` (optional) - Filter by admin user ID who hid the request

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "reference": "REQ-2025-001",
      "title": "Request Title",
      "requester": { "id": 1, "email": "user@example.com", "name": "User Name" },
      "department": { "id": 1, "name": "ICT", "code": "ICT" },
      "hiddenAt": "2025-01-20T10:30:00Z",
      "hiddenBy": { "id": 5, "email": "admin@example.com", "name": "Admin Name" },
      "hiddenReason": "Duplicate request"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### POST /api/admin/requests/:id/hide
Hide a specific request.

**Request Body:**
```json
{
  "reason": "Duplicate request - see REQ-2025-001 instead"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request has been hidden successfully",
  "data": {
    "id": 123,
    "hidden": true,
    "hiddenAt": "2025-01-20T10:30:00Z",
    "hiddenById": 5,
    "hiddenReason": "Duplicate request - see REQ-2025-001 instead"
  }
}
```

**Validation:**
- Reason is required (min 1 char, max 500 chars)
- Cannot hide already hidden requests
- Request must exist

#### POST /api/admin/requests/:id/unhide
Restore a hidden request.

**Request Body (optional):**
```json
{
  "reason": "Error - was hidden by mistake"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request has been unhidden successfully",
  "data": {
    "id": 123,
    "hidden": false,
    "hiddenAt": null,
    "hiddenById": null,
    "hiddenReason": null
  }
}
```

### 4. Request Filtering Logic
**Files Updated:**
- `server/index.ts` - GET /api/requests endpoint
- `server/routes/approvals.ts` - All request queries in approval endpoints

**Changes:**
- All request queries now include `hidden: false` filter by default
- Query parameter `?includeHidden=true` available for admins only
- Admins can pass `includeHidden=true` to view both hidden and visible requests
- Non-admins cannot view hidden requests regardless of parameters

**Affected Endpoints:**
- GET /api/requests - Main request list
- GET /api/approvals - Department head approvals
- GET /api/approvals - Executive director approvals
- GET /api/approvals - Procurement officer approvals
- GET /api/approvals - Finance approvals

### 5. Audit Logging
**File:** `server/routes/admin.ts`

Every hide/unhide action is logged to the `AuditLog` table:

**Hide Action:**
```json
{
  "action": "REQUEST_HIDDEN",
  "entity": "Request",
  "entityId": 123,
  "message": "Request REQ-2025-001 hidden by admin",
  "metadata": {
    "requestId": 123,
    "referenceNumber": "REQ-2025-001",
    "reason": "Duplicate request",
    "requesterEmail": "user@example.com",
    "hiddenBy": "admin@example.com",
    "department": "ICT"
  }
}
```

**Unhide Action:**
```json
{
  "action": "REQUEST_UNHIDDEN",
  "entity": "Request",
  "entityId": 123,
  "message": "Request REQ-2025-001 unhidden by admin",
  "metadata": {
    "requestId": 123,
    "referenceNumber": "REQ-2025-001",
    "unhideReason": "Error - was hidden by mistake",
    "previousReason": "Duplicate request",
    "requesterEmail": "user@example.com",
    "unHiddenBy": "admin@example.com",
    "department": "ICT"
  }
}
```

## Deployment Steps

### 1. Apply Database Migration
```bash
cd ~/pms
npx prisma migrate deploy
```

### 2. Deploy Backend
```bash
npm run server:build
pm2 restart pms-backend
```

### 3. Verify
Check that hidden requests are properly filtered and admin endpoints work:
```bash
# Test hidden requests list (as admin)
curl -X GET "http://localhost:4000/api/admin/requests/hidden" \
  -H "x-user-id: <admin-id>"

# Test hiding a request (as admin)
curl -X POST "http://localhost:4000/api/admin/requests/123/hide" \
  -H "x-user-id: <admin-id>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test hiding"}'
```

## Frontend Integration (Todo)

### New Components Needed
1. **Admin Dashboard Section** - "Hidden Requests" tab
   - Display list of hidden requests with pagination
   - Show who hid the request, when, and why
   - Ability to unhide with optional reason
   - Filters by department and admin user

2. **Request Detail Enhancement**
   - Show if request is hidden in the UI
   - Display hiding info (by whom, when, why)
   - Unhide button for admins

3. **API Service Updates**
   - `getHiddenRequests(limit, offset, filters)` - Get hidden requests list
   - `hideRequest(id, reason)` - Hide a request
   - `unhideRequest(id, reason?)` - Unhide a request

## Security Considerations

✅ **Implemented:**
- Admin-only access to hide/unhide endpoints (`adminOnly` middleware)
- Hidden requests are excluded from normal views for all non-admin users
- Admins must provide a reason when hiding (sanitized to prevent XSS)
- All actions are audit logged with user, timestamp, and reason
- IP addresses captured in audit logs
- Input sanitization (HTML tags removed from reason text)

✅ **Request Filtering:**
- Department heads cannot see hidden requests
- Regular users cannot see hidden requests
- Only admins with `?includeHidden=true` can see hidden requests
- Filtering applied at database level (not just frontend)

## TypeScript & Code Quality

✅ **Verified:**
- No TypeScript compilation errors
- Strict type checking throughout
- Prisma types properly used
- Audit logging follows existing patterns
- Consistent error handling and response format

## Dependencies
No new dependencies added. Uses existing:
- Prisma ORM
- Express.js
- Winston (logging)
- bcryptjs (if needed for password operations)

## Notes

1. **Migration Status**: Migration file created and ready, but must be deployed to production DB
2. **Database sync issue**: Production DB still missing `DepartmentManager` table - this should be resolved first
3. **Filtering Performance**: Indexes on `hidden` and `hiddenById` ensure query performance even with large request volumes
4. **Audit Trail**: All hide/unhide actions are logged for compliance and troubleshooting
