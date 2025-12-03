# Real-Time Session Tracking Implementation

## Overview

This document describes the real-time session tracking system that shows which users are actively using the Procurement Management System and Innovation Hub modules.

## Architecture

### Backend Components

#### 1. In-Memory Session Store (`server/routes/stats.ts`)

```typescript
const activeSessions = new Map<number, { module: 'pms' | 'ih'; lastSeen: Date }>();
```

-   Tracks which module each user is currently active in
-   Stores userId → {module, lastSeen timestamp}
-   Automatically cleans up stale sessions (>5 minutes old) every minute

#### 2. Heartbeat Endpoint

**POST /api/stats/heartbeat**

-   Requires authentication (`authMiddleware`)
-   Body: `{ module: 'pms' | 'ih' }`
-   Updates the user's session activity timestamp
-   Returns: `{ success: true, activeUsers: number, timestamp: string }`

#### 3. Updated Module Stats Endpoint

**GET /api/stats/modules**

-   Returns real-time statistics for both modules
-   `activeNow` now reflects actual active sessions from in-memory store
-   Response structure:

```json
{
    "procurement": {
        "totalUsers": 2,
        "activeNow": 1, // From activeSessions
        "today": 1
    },
    "innovation": {
        "totalUsers": 1,
        "activeNow": 1, // From activeSessions
        "today": 0
    },
    "timestamp": "2025-01-14T..."
}
```

### Frontend Components

#### 1. Heartbeat Service (`src/services/heartbeatService.ts`)

Singleton service that manages periodic heartbeat signals:

-   **startHeartbeat(module)**: Begins sending heartbeats every 45 seconds
-   **stopHeartbeat()**: Stops sending heartbeats
-   **getCurrentModule()**: Returns the currently tracked module

Features:

-   Automatically includes JWT token from localStorage
-   Sends initial heartbeat immediately on start
-   Silently fails to avoid disrupting user experience
-   Environment-aware URLs (relative in dev, absolute in prod)

#### 2. Integration Points

**Onboarding Page** (`src/pages/Procurement/Auth/Onboarding.tsx`)

-   Starts heartbeat when user selects and proceeds to a module
-   Triggers on module selection: `heartbeatService.startHeartbeat(selected)`

**Procurement Dashboard** (`src/pages/Procurement/Dashboard.tsx`)

```typescript
useEffect(() => {
    heartbeatService.startHeartbeat('pms');
    return () => heartbeatService.stopHeartbeat();
}, []);
```

**Innovation Hub Dashboard** (`src/pages/Innovation/InnovationDashboard.tsx`)

```typescript
useEffect(() => {
    heartbeatService.startHeartbeat('ih');
    return () => heartbeatService.stopHeartbeat();
}, []);
```

## How It Works

### Session Lifecycle

1. **User logs in** → Views onboarding/module selection
2. **User selects module** → Heartbeat starts immediately
3. **Every 45 seconds** → Frontend sends POST to /api/stats/heartbeat
4. **Backend updates** → Updates activeSessions Map with current timestamp
5. **User switches modules** → Old heartbeat stops, new one starts
6. **User closes tab/logs out** → Heartbeat stops, session expires after 5 minutes
7. **Cleanup process** → Backend removes sessions idle >5 minutes

### Real-Time Updates

-   **Module stats refresh**: Every 30 seconds on Onboarding page
-   **Heartbeat interval**: Every 45 seconds
-   **Session expiry**: 5 minutes of inactivity
-   **Cleanup interval**: Every 1 minute

## Testing Multi-User Scenarios

### Scenario 1: Two users in different modules

1. User A logs in and enters Procurement → `activeNow: {pms: 1, ih: 0}`
2. User B logs in and enters Innovation Hub → `activeNow: {pms: 1, ih: 1}`
3. User A navigates to Innovation Hub → `activeNow: {pms: 0, ih: 2}`

### Scenario 2: Session expiry

1. User enters Procurement module
2. User becomes inactive (closes tab, no heartbeat)
3. After 5 minutes, backend cleanup removes session
4. Module stats update to reflect reduced activeNow count

## Benefits

✅ **Real-time visibility**: See exactly who is using which module right now
✅ **Accurate counts**: Based on active heartbeats, not database timestamps
✅ **Automatic cleanup**: Stale sessions removed automatically
✅ **Lightweight**: In-memory storage, no database writes
✅ **Resilient**: Silent failures don't disrupt user experience
✅ **Multi-user aware**: Updates reflect all active users across modules

## Configuration

### Timing Constants

```typescript
// Frontend (heartbeatService.ts)
HEARTBEAT_INTERVAL = 45000; // 45 seconds

// Backend (stats.ts)
SESSION_EXPIRY = 5 * 60 * 1000; // 5 minutes
CLEANUP_INTERVAL = 60 * 1000; // 1 minute
STATS_REFRESH = 30000; // 30 seconds (frontend)
```

### Supported Modules

-   `'pms'` - Procurement Management System
-   `'ih'` - Innovation Hub

## Error Handling

### Frontend

-   Network errors: Logged to console.debug, does not interrupt user
-   Invalid responses: Caught and logged, heartbeat continues
-   Missing token: Authorization header not sent, backend returns 401

### Backend

-   Missing/invalid module: Returns 400 Bad Request
-   Unauthorized access: Returns 401 Unauthorized
-   Server errors: Logged and returns 500 Internal Server Error

## Future Enhancements

Potential improvements for future iterations:

1. **Redis integration**: Replace in-memory Map with Redis for multi-server support
2. **WebSocket notifications**: Push real-time updates instead of polling
3. **Activity details**: Track which specific pages users are viewing
4. **Admin dashboard**: Real-time visualization of active users
5. **Historical analytics**: Store session data for usage pattern analysis
6. **Presence indicators**: Show "User X is viewing Request Y" on collaborative pages

## Security Considerations

✅ JWT authentication required for heartbeat endpoint
✅ User ID extracted from authenticated token, not request body
✅ Module validation prevents invalid values
✅ Rate limiting via existing middleware
✅ No sensitive data exposed in session store
✅ Automatic cleanup prevents memory leaks

## Monitoring

Key metrics to track:

-   Active sessions count
-   Heartbeat failure rate
-   Average session duration
-   Peak concurrent users
-   Module preference distribution
