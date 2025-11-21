# Messages and Notifications - Real Database Integration

## ✅ Implementation Complete

The notification system has been fully connected to the database with real-time updates.

## What Was Changed

### Backend (`server/index.ts`)

Added three new API endpoints after line 533:

1. **GET `/api/notifications`**

    - Fetches last 50 notifications for authenticated user
    - Ordered by most recent first
    - Includes user profile data
    - Returns unread status (readAt field)

2. **PATCH `/api/notifications/:id/read`**

    - Marks a notification as read
    - Sets readAt timestamp
    - Validates notification ownership

3. **DELETE `/api/notifications/:id`**
    - Removes a notification
    - Validates notification ownership
    - Returns success confirmation

### Frontend

#### New Files Created

**`src/services/notificationApi.ts`**

-   `fetchNotifications()` - GET all notifications
-   `markNotificationAsRead(id)` - Mark as read
-   `deleteNotification(id)` - Remove notification
-   `getUnreadCount()` - Count unread notifications
-   Uses same auth pattern as Innovation Hub (x-user-id header)

**`scripts/create-test-notifications.mjs`**

-   Testing utility to create sample notifications
-   Usage: `node --loader tsx scripts/create-test-notifications.mjs <userId>`

**`docs/NOTIFICATION_SYSTEM.md`**

-   Complete documentation
-   Architecture overview
-   Usage examples
-   Testing instructions

#### Modified Files

**`src/components/Layouts/Header.tsx`**

Changes:

-   Removed hardcoded notifications array
-   Added real-time notification fetching with `fetchNotifications()`
-   Implemented 60-second polling (matches Innovation Hub pattern)
-   Added visibility detection (refreshes when tab visible)
-   Updated UI to show:
    -   Type-based emoji icons (👤 MENTION, 🔄 STAGE_CHANGED, ✅ IDEA_APPROVED)
    -   Unread badge highlighting
    -   Relative timestamps ("5 min ago", "2h ago")
    -   Loading state
    -   Empty state with proper message
-   Changed "Read All" button to "Refresh Notifications"
-   Bell icon badge now only shows when unread notifications exist

## Database Schema

Already exists in `server/prisma/schema.prisma`:

```prisma
model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  message   String
  data      Json?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId])
  @@index([createdAt])
}

enum NotificationType {
  MENTION
  STAGE_CHANGED
  IDEA_APPROVED
}
```

No migrations needed - table already exists.

## Real-Time Features

✅ **Automatic refresh every 60 seconds**  
✅ **Refresh on tab visibility change**  
✅ **Manual refresh button**  
✅ **Unread count badge**  
✅ **Visual unread indicators**  
✅ **Delete notifications**

## How to Test

### 1. Start Backend (if not already running)

```bash
npm run server:dev
```

### 2. Create Test Notifications

First find your user ID:

```bash
node --loader tsx scripts/list-all-users.mjs
```

Then create notifications:

```bash
node --loader tsx scripts/create-test-notifications.mjs 1
```

### 3. View in Browser

1. Login to the application
2. Click the bell icon in the header
3. You should see your test notifications
4. Unread notifications have highlighting and a green dot
5. Click X to delete a notification
6. Click "Refresh Notifications" to manually update

### 4. Real-Time Testing

1. Open the app in two browser tabs
2. Create a notification using the script
3. Wait up to 60 seconds or switch tabs
4. New notification appears automatically

## Integration with Other Systems

### Innovation Hub

When ideas are approved/rejected, create notifications:

```typescript
// In approval endpoint
await prisma.notification.create({
    data: {
        userId: idea.submittedById,
        type: 'IDEA_APPROVED',
        message: `Your idea "${idea.title}" has been approved!`,
        data: { ideaId: idea.id },
    },
});
```

### Procurement Workflow

When RFQs/Quotes/POs change status:

```typescript
await prisma.notification.create({
    data: {
        userId: request.createdById,
        type: 'STAGE_CHANGED',
        message: `RFQ ${request.rfqNumber} has been approved`,
        data: { requestId: request.id, type: 'RFQ' },
    },
});
```

## Messages vs Notifications

Currently:

-   **Notifications**: Connected to database ✅
-   **Messages**: Still using mock data (separate feature)

Messages dropdown can be connected later using a similar pattern with a `Message` model.

## Next Steps (Optional Enhancements)

1. Add WebSocket support for instant notifications
2. Create notification when user is mentioned in comments
3. Auto-create notifications for all workflow changes
4. Add notification preferences (email, in-app)
5. Create a full Notifications page (history view)
6. Connect Messages dropdown to database

## Performance

-   Caching: None currently (could add Redis caching)
-   Polling: 60-second intervals
-   Limit: Last 50 notifications
-   Indexes: userId and createdAt for fast queries

## Security

✅ Authentication required  
✅ Users only see their own notifications  
✅ Ownership validation on delete/update  
✅ Prepared statements (Prisma ORM)

## Files Modified/Created Summary

**Backend:**

-   ✏️ Modified: `server/index.ts` (added 3 notification endpoints)

**Frontend:**

-   ✏️ Modified: `src/components/Layouts/Header.tsx` (connected to API)
-   ➕ Created: `src/services/notificationApi.ts` (API service)

**Testing:**

-   ➕ Created: `scripts/create-test-notifications.mjs`

**Documentation:**

-   ➕ Created: `docs/NOTIFICATION_SYSTEM.md`
-   ➕ Created: `docs/NOTIFICATIONS_IMPLEMENTATION.md` (this file)

---

**Status: ✅ Ready for Testing**

Backend server needs to be running for notifications to work. Use the test script to create sample data.
