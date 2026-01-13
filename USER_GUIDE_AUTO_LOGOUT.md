# 🔐 Auto-Logout Feature - User Guide

## What's New?

Your SPINX system now automatically logs out users for security. Here's what you need to know:

---

## How It Works

### 1️⃣ Stay Active = Stay Logged In

-   Just use the app normally
-   Move your mouse, type, click, scroll
-   Your session automatically extends

### 2️⃣ Get a Warning Before Logout

-   **1 minute before expiration**, you'll see a popup:

    ```
    ⚠️ Session Expiring Soon

    Your session will expire in approximately 1 minute.
    Move your mouse or interact with the page to stay active.

    [OK]  ▓▓▓▓▓░░░ 8s
    ```

### 3️⃣ Auto-Logout After 15 Minutes of Inactivity

-   If you don't use the system for **15 minutes**
-   You'll be automatically logged out
-   You'll see a confirmation popup:

    ```
    ⚠️ Session Expired

    Your session has expired. Please log in again.

    [Log In]
    ```

---

## What Triggers Activity?

Any of these actions reset your 15-minute timer:

-   ✓ Moving your mouse
-   ✓ Typing on keyboard
-   ✓ Scrolling on page
-   ✓ Touching screen (mobile)
-   ✓ Clicking buttons/links

---

## What Doesn't Trigger Activity?

These do NOT reset your session timer:

-   ✗ Just looking at screen
-   ✗ Watching video with no other interaction
-   ✗ Leaving browser open

---

## Example Scenarios

### Scenario 1: You Stay Active

```
10:00 AM - You log in
10:05 AM - You click on a request (timer resets)
10:15 AM - You scroll through list (timer resets)
10:25 AM - You type in a field (timer resets)
10:30 AM - You click Save button (timer resets)
...
Session stays active as long as you interact ✓
```

### Scenario 2: You Leave Your Desk

```
10:00 AM - You log in
10:15 AM - You stop working and leave desk
        (timer counting down: 15 minutes remaining)
10:29 AM - Warning popup appears
        "Session expiring in 1 minute - move mouse to stay active"
10:30 AM - Session expires
        Auto-logged out
        Redirected to login page
```

### Scenario 3: You See Warning and Stay Active

```
10:00 AM - You log in
10:14 AM - You get warning popup (1 minute remaining)
10:14:30 AM - You move mouse to dismiss popup
            (Activity detected! Timer resets to 15 minutes)
10:29 AM - Session still active, you keep working ✓
```

---

## For Each Role

**This applies to EVERYONE equally:**

-   ✓ Admin
-   ✓ Department Heads
-   ✓ Managers
-   ✓ Officers
-   ✓ Requesters
-   ✓ Suppliers
-   ✓ All other roles

No exceptions. Same timeout for all users.

---

## What You Need to Do

✅ **Nothing!** It works automatically.

Just remember:

-   Keep using the app → stay logged in
-   Stop using for 15 min → auto-logout
-   See warning → move mouse to extend session

---

## FAQ

### Q: Why am I getting logged out?

**A:** You haven't interacted with the system for 15 minutes. Just move your mouse or click something to extend your session.

### Q: Can I turn this off?

**A:** No, this is for security. It prevents unauthorized access if you leave your desk.

### Q: Why the warning popup?

**A:** It gives you a chance to extend your session before automatic logout. Just interact with the page.

### Q: What if I'm working but not moving mouse?

**A:** Click something - any interaction resets the timer. You don't have to move the mouse specifically.

### Q: Does this work on mobile/tablet?

**A:** Yes! The system detects touches and taps on mobile devices.

### Q: What if my token expires while I'm active?

**A:** The system will automatically refresh your token and extend your session. No action needed.

### Q: Can the timeout be changed?

**A:** Contact your system administrator. Current settings: 15 minutes inactivity, warning 1 minute before token expires.

### Q: Am I logged out from other devices?

**A:** Each device has its own session. Logging out on one device doesn't affect others.

---

## Tips for Best Experience

### 💡 Keep Session Active

-   Use the app regularly
-   Don't let browser sit idle for 15+ minutes
-   If warning appears, just move your mouse or click

### 🔒 Security Benefits

-   Your session is protected if you leave
-   Shared computers automatically secure
-   Tokens can't be misused after expiration

### 📱 Mobile Users

-   Same timeout applies on mobile/tablet
-   Taps and touches count as activity
-   Warning popup works the same way

---

## Security at Work

### How This Protects You

| Situation                          | How You're Protected             |
| ---------------------------------- | -------------------------------- |
| You leave desk without logging out | Session auto-locks after 15 min  |
| Someone tries to use your computer | Automatic logout prevents access |
| Token stolen/compromised           | Token expires automatically      |
| Shared computer (library, office)  | Auto-logout ensures security     |

### What Users Can't Do

-   ✗ Skip the warning
-   ✗ Stay logged in forever without activity
-   ✗ Use expired tokens
-   ✗ Disable auto-logout

---

## What Happens During Logout

When auto-logout occurs:

1. Session tracking stops
2. Confirmation popup appears
3. Your login tokens are deleted
4. You're redirected to login page
5. All your session data is cleared

You'll need to log in again to continue using SPINX.

---

## Keyboard Shortcuts

No special shortcuts - just use the app normally:

-   Type in fields → activity detected ✓
-   Tab between inputs → activity detected ✓
-   Click buttons → activity detected ✓
-   Scroll → activity detected ✓

---

## Getting Help

If you have questions:

1. **Check this guide** - Most answers are here
2. **Ask your manager** - They can explain company policy
3. **Contact IT support** - For technical issues

---

## Settings Overview

**Current Configuration:**

-   Inactivity Timeout: **15 minutes**
-   Warning Time: **1 minute before**
-   Warning Auto-Dismiss: **10 seconds**
-   Check Frequency: **Every 10 seconds**

These are optimal for most users. Contact your IT administrator if you need adjustments.

---

## Summary

| Feature               | Details                               |
| --------------------- | ------------------------------------- |
| **Automatic?**        | Yes - no setup needed                 |
| **Applies to all?**   | Yes - every user                      |
| **Timeout**           | 15 minutes inactivity                 |
| **Warning**           | 1 minute before logout                |
| **Mobile support**    | Yes                                   |
| **Can disable?**      | No (security feature)                 |
| **What resets timer** | Any mouse, keyboard, scroll, or touch |

---

## One More Thing

This feature is designed for **your security and convenience**:

-   ✅ Protects shared/public computers
-   ✅ Prevents unauthorized access
-   ✅ Saves you from manual logout
-   ✅ Warns you before logout
-   ✅ Works on all devices

**Just keep using the system normally - it all works automatically!**

---

**Questions? Contact IT Support or your Department Head**

System Update: January 13, 2026
