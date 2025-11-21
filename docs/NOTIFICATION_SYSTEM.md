# Notification System Documentation

## Overview

The notification system provides real-time notifications to users in the header. Notifications are fetched from the database and automatically refresh every 60 seconds, matching the Innovation Hub real-time pattern.

## Architecture

### Backend (`server/index.ts`)

Three API endpoints handle notifications:

1. **GET `/api/notifications`** - Fetch user notifications (last 50)
2. **PATCH `/api/notifications/:id/read`** - Mark notification as read
3. **DELETE `/api/notifications/:id`** - Delete notification

### Database Schema (`server/prisma/schema.prisma`)

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

### Frontend Components

-   **Service**: `src/services/notificationApi.ts` - API calls for notifications
-   **Component**: `src/components/Layouts/Header.tsx` - Notification dropdown UI

## Features

✅ **Real-time updates** - 60-second polling interval  
✅ **Visibility detection** - Refreshes when tab becomes visible  
✅ **Unread badges** - Shows count of unread notifications  
✅ **Visual indicators** - Unread notifications highlighted  
✅ **Type icons** - Emoji icons for different notification types:

-   👤 MENTION
-   🔄 STAGE_CHANGED
-   ✅ IDEA_APPROVED

✅ **Relative timestamps** - "5 min ago", "2h ago", etc.  
✅ **Delete functionality** - Remove notifications  
✅ **Manual refresh** - Refresh button in dropdown

## Usage

### Creating Notifications (Backend)

```typescript
await prisma.notification.create({
    data: {
        userId: 123,
        type: 'IDEA_APPROVED',
        message: 'Your innovation idea has been approved!',
        data: { ideaId: 456 }, // Optional JSON data
    },
});
```

### Testing

Create test notifications for a user:

```bash
node --loader tsx scripts/create-test-notifications.mjs <userId>
```

Example:

```bash
node --loader tsx scripts/create-test-notifications.mjs 1
```

This creates 4 sample notifications (3 unread, 1 read).

## Integration Points

### When to Create Notifications

Create notifications for:

-   User mentioned in comments (`MENTION`)
-   Idea stage changes (`STAGE_CHANGED`)
-   Idea approved/rejected (`IDEA_APPROVED`)
-   Procurement workflow updates
-   RFQ/Quote/PO status changes

### Example: Notification on Idea Approval

```typescript
// In server/index.ts approval endpoint
const idea = await prisma.idea.update({
    where: { id: ideaId },
    data: { status: 'APPROVED' },
});

// Create notification
await prisma.notification.create({
    data: {
        userId: idea.submittedById,
        type: 'IDEA_APPROVED',
        message: `Your idea "${idea.title}" has been approved!`,
        data: { ideaId: idea.id },
    },
});
```

## Future Enhancements

-   [ ] WebSocket support for instant notifications
-   [ ] Notification preferences (email, in-app, etc.)
-   [ ] Mark all as read functionality
-   [ ] Notification grouping/categorization
-   [ ] Push notifications (browser API)
-   [ ] Notification history page
-   [ ] Search/filter notifications

## Troubleshooting

### Notifications not showing

1. Check backend is running: `curl http://heron:4000/health`
2. Check database has Notification table: `npx prisma studio`
3. Check browser console for API errors
4. Verify user is authenticated (check localStorage for auth data)

### Notifications not refreshing

1. Check browser console for polling errors
2. Ensure tab is visible (polling pauses on hidden tabs)
3. Use manual refresh button in dropdown

### Create test data

```bash
# First, find your user ID
node --loader tsx scripts/list-all-users.mjs

# Then create notifications
node --loader tsx scripts/create-test-notifications.mjs <your-user-id>
```

## Security

-   All endpoints require authentication (`authMiddleware`)
-   Users can only see their own notifications
-   Users can only delete their own notifications
-   Rate limiting recommended for production
