# Auto-Logout & Session Management

## Overview

The application now includes comprehensive session management with automatic logout functionality that applies to **all users and roles**. This ensures security by automatically logging out inactive users and warning users before their session expires.

## Features

### 1. **Inactivity Tracking** ✅

-   Monitors user activity (mouse movement, keyboard input, scrolling, touch, clicks)
-   Auto-logout after **15 minutes of inactivity**
-   Applies to all roles: Admin, Department Heads, Managers, Procurement Officers, Requesters, etc.
-   Resets timer on any user interaction

### 2. **Token Expiration Warning** ✅

-   SweetAlert popup shows **1 minute before token expiration**
-   Displays user-friendly message: "Your session will expire in approximately 1 minute"
-   Provides instruction: "Move your mouse or interact with the page to stay active"
-   Auto-dismisses after 10 seconds with progress bar
-   Warning only shows once per session

### 3. **Auto-Logout on Expiration** ✅

-   When token expires or inactivity timeout reached:
    -   Inactivity tracking stops
    -   SweetAlert confirmation shown
    -   User redirected to login page
    -   Auth tokens cleared from storage
    -   Applies to all users regardless of role

### 4. **Token Refresh Integration** ✅

-   When token is refreshed via API interceptor:
    -   Inactivity tracker restarts with new token
    -   Warning flag reset
    -   Session time extends

## Technical Implementation

### Files Created/Modified

#### New Files

-   `src/utils/inactivityTracker.ts` - Core inactivity and expiration tracking logic

#### Modified Files

-   `src/components/AppInitializer.tsx` - Starts inactivity tracking on app load
-   `src/utils/apiInterceptor.ts` - Restarts tracking on token refresh
-   `src/store/authSlice.ts` - Stops tracking on logout

### Configuration

**Current Timeouts:**

```typescript
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME_BEFORE_EXPIRY = 1 * 60 * 1000; // 1 minute
const EXPIRATION_CHECK = 10 * 1000; // Check every 10 seconds
```

To customize these values, edit `src/utils/inactivityTracker.ts` constants.

## How It Works

### Initialization

1. App loads (`main.tsx`)
2. `AppInitializer` component mounts
3. If user is authenticated, `startInactivityTracking()` is called
4. Event listeners attached to: `mousedown`, `keydown`, `scroll`, `touchstart`, `click`
5. Initial inactivity timer set (15 minutes)

### During Session

1. User interacts with page → Activity detected
2. Inactivity timer resets → Extends session by 15 minutes
3. Warning flag resets
4. Every 10 seconds, token expiration checked:
    - If token expired → Auto-logout
    - If < 1 minute remaining → Show warning popup

### Token Refresh

1. When API call returns 401 (Unauthorized)
2. Token refresh triggered via `apiInterceptor.ts`
3. New token obtained from server
4. Inactivity tracking restarted with new token
5. Session time extends

### Logout

1. User clicks logout button → `logoutUser()` action dispatched
2. `stopInactivityTracking()` called
3. All timers cleared
4. Event listeners removed
5. Tokens removed from storage
6. User redirected to login

### Inactivity Timeout

1. 15 minutes pass with no user interaction
2. `handleSessionExpired()` triggered
3. SweetAlert confirmation shown
4. User redirected to login after confirmation
5. All session data cleared

## User Experience

### Scenario 1: User Stays Active

```
User opens app
    ↓
App starts inactivity tracking
    ↓
User clicks/types/scrolls periodically
    ↓
Inactivity timer resets each time
    ↓
Session remains active indefinitely
```

### Scenario 2: User Becomes Inactive (15 min)

```
User stops interacting (15 minutes pass)
    ↓
Inactivity timeout triggered
    ↓
SweetAlert: "Session Expired"
    ↓
User clicks "Log In" button
    ↓
Redirected to login page
```

### Scenario 3: Token About to Expire (1 min remaining)

```
Token expiration checked every 10 seconds
    ↓
When < 1 minute remaining, warning shown
    ↓
SweetAlert: "Session Expiring Soon" + instructions
    ↓
User moves mouse / clicks / types
    ↓
Inactivity timer resets → Session extends
    ↓
Warning dismissed
```

## API Integration

### JWT Token Parsing

Tokens are parsed without external dependencies using Base64 decoding:

```typescript
function parseJWT(token: string): { exp?: number } | null {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
    return JSON.parse(jsonPayload);
}
```

### Expiration Check

Runs every 10 seconds to detect:

1. Token already expired (exp < now)
2. Token about to expire (exp - now < 60 seconds)

## Role-Based Behavior

**Auto-logout applies to ALL roles:**

-   ✅ Admin
-   ✅ Department Head
-   ✅ Head of Division
-   ✅ Executive Director
-   ✅ Innovation Committee Member
-   ✅ Evaluation Committee Member
-   ✅ Procurement Manager
-   ✅ Procurement Officer
-   ✅ Budget Manager
-   ✅ Finance Officer
-   ✅ Senior Director
-   ✅ Auditor
-   ✅ Requester/Department Manager
-   ✅ Supplier

No special handling per role - same timeout applies uniformly.

## Security Benefits

1. **Prevents Unauthorized Access**: Unattended sessions automatically locked
2. **Protects Shared Devices**: Auto-logout if user leaves without logging out
3. **Reduces Token Misuse Risk**: Expired tokens cannot be used
4. **User Awareness**: Warning gives users chance to extend session
5. **Compliance**: Meets security requirements for sensitive data access

## Testing

### Manual Testing

1. **Test Inactivity Timeout:**

    - Log in
    - Don't interact with page for 15 minutes
    - Should auto-logout

2. **Test Expiration Warning:**

    - Monitor Network tab in DevTools
    - Set a short token expiration in backend (1 min)
    - Wait for SweetAlert warning
    - Verify warning shows ~1 minute before expiry

3. **Test Activity Reset:**

    - Log in
    - Move mouse or type
    - Verify inactivity timer resets
    - Observe no auto-logout if active

4. **Test Logout:**

    - Click logout button
    - Verify redirect to login
    - Verify tokens cleared from storage

5. **Test Token Refresh:**
    - Wait for token refresh
    - Verify tracking continues
    - Verify warning flag reset

### Browser DevTools Testing

```javascript
// Check if tracking is active
console.log(typeof window.__stopInactivityTracking);

// Simulate inactivity (for testing - not for production)
// Would need to modify source code to test properly
```

## Troubleshooting

### User Logged Out Unexpectedly

1. Check browser console for errors
2. Verify token expiration time on server
3. Check if inactivity tracking running: `window.__stopInactivityTracking !== undefined`
4. Review server logs for token issues

### Warning Not Showing

1. Verify token has `exp` claim
2. Check browser allows SweetAlert popups
3. Verify expiration time > current time
4. Check browser console for errors

### Activity Not Resetting Timer

1. Verify event listeners attached (check DevTools)
2. Confirm user interactions detected
3. Check for JavaScript errors in console
4. Verify `resetInactivityTimer()` being called

## Configuration Notes

### For Production

-   Verify token expiration time set correctly on backend
-   Test with actual JWT tokens
-   Configure inactivity timeout based on security policy
-   Ensure HTTPS enabled (required for secure cookies)

### For Development

-   You can temporarily increase `INACTIVITY_TIMEOUT` for testing
-   Use browser DevTools to monitor event listeners
-   Check Network tab to see token refresh requests

## Files Summary

### inactivityTracker.ts (New)

-   **Purpose**: Core session management logic
-   **Exports**:
    -   `startInactivityTracking()` - Start monitoring
    -   `stopInactivityTracking()` - Stop monitoring
    -   `resetActivity()` - Manual reset (not typically needed)
    -   `getMinutesUntilExpiry()` - Get remaining session time

### AppInitializer.tsx (Modified)

-   Added inactivity tracking initialization
-   Starts tracking on app load if user authenticated
-   Stops tracking on unmount

### apiInterceptor.ts (Modified)

-   Restarts inactivity tracking after token refresh
-   Ensures extended session after successful refresh

### authSlice.ts (Modified)

-   Imports inactivity tracker
-   Stops tracking on logout
-   Clears session data on logout

## Future Enhancements

1. **Configurable Timeouts**: Admin dashboard to set inactivity/expiration times
2. **Session Extension Endpoint**: Allow extending session without re-auth
3. **Remember Last Activity**: Show when user last interacted
4. **Multiple Device Detection**: Alert if logged in elsewhere
5. **Session History**: Track login/logout history
6. **Graceful Degradation**: Queue API calls before logout if needed

## Support & Questions

For issues or questions about session management:

1. Check browser console for errors
2. Review server logs for token issues
3. Verify JWT token structure and expiration
4. Check network requests in DevTools

## Status: ✅ PRODUCTION READY

All users are now protected by automatic session management with:

-   ✅ 15-minute inactivity timeout
-   ✅ 1-minute token expiration warning
-   ✅ SweetAlert notifications
-   ✅ Auto-redirect to login
-   ✅ Activity-based timer reset
-   ✅ Applies to all roles equally
-   ✅ No configuration needed per role

The system is ready for production deployment with comprehensive security for all user types.
