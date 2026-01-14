/**
 * Global Inactivity & Session Expiration Tracker
 * Monitors user activity and manages auto-logout
 */

import Swal from 'sweetalert2';
import { clearAuth, getToken } from './auth';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes (increased from 15 for procurement workflows)
const WARNING_TIME_BEFORE_EXPIRY = 2 * 60 * 1000; // Show warning 2 minutes before expiry
let inactivityTimer: NodeJS.Timeout | null = null;
let expirationCheckTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();
let warningShown = false;

/**
 * Parse JWT token without external dependency
 */
function parseJWT(token: string): { exp?: number } | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

/**
 * Get token expiration time
 */
function getTokenExpirationTime(): number | null {
    try {
        const token = getToken();
        if (!token) return null;

        const decoded = parseJWT(token);
        return decoded?.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch (e) {
        return null;
    }
}

/**
 * Handle session logout
 */
async function handleSessionExpired() {
    // Stop all timers
    stopInactivityTracking();

    await Swal.fire({
        title: 'Session Expired',
        text: 'Your session has expired. Please log in again.',
        icon: 'warning',
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: 'Log In',
    });

    clearAuth();
    window.location.href = '/auth/login';
}

/**
 * Show token expiration warning
 */
async function showExpirationWarning() {
    if (warningShown) return; // Only show once per session
    warningShown = true;

    const result = await Swal.fire({
        title: 'Session Expiring Soon',
        html: `
      <div style="text-align: left;">
        <p>Your session will expire in approximately <strong>2 minutes</strong>.</p>
        <p style="margin-top: 10px; color: #666;">
          Move your mouse or interact with the page to stay active.
        </p>
      </div>
    `,
        icon: 'warning',
        confirmButtonText: 'OK',
        timer: 15000, // Auto-close after 15 seconds (increased from 10)
        timerProgressBar: true,
        didOpen: () => {
            // Reset warning flag if user dismisses or timer completes
            const closeBtn = document.querySelector('.swal2-confirm') as HTMLElement;
            if (closeBtn) {
                closeBtn.focus();
            }
        },
    });

    // If dismissed, reset warning flag to show again if needed
    if (!result.isConfirmed) {
        warningShown = false;
    }
}

/**
 * Reset inactivity timer on user activity
 */
function resetInactivityTimer() {
    lastActivityTime = Date.now();
    warningShown = false; // Reset warning flag on activity

    // Clear existing timer
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }

    // Set new timer
    inactivityTimer = setTimeout(() => {
        handleSessionExpired();
    }, INACTIVITY_TIMEOUT);
}

/**
 * Check token expiration periodically
 */
function startExpirationCheck() {
    expirationCheckTimer = setInterval(() => {
        const token = getToken();
        if (!token) {
            stopInactivityTracking();
            return;
        }

        const expirationTime = getTokenExpirationTime();
        if (!expirationTime) return;

        const now = Date.now();
        const timeUntilExpiry = expirationTime - now;

        // If token has expired
        if (timeUntilExpiry <= 0) {
            handleSessionExpired();
            return;
        }

        // Show warning if expiry is within WARNING_TIME_BEFORE_EXPIRY and not yet shown
        if (timeUntilExpiry <= WARNING_TIME_BEFORE_EXPIRY && !warningShown) {
            showExpirationWarning();
        }
    }, 10000); // Check every 10 seconds
}

/**
 * Start tracking inactivity and session expiration
 */
export function startInactivityTracking() {
    const token = getToken();
    if (!token) return;

    lastActivityTime = Date.now();
    warningShown = false;

    // Add activity listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
        resetInactivityTimer();
    };

    activityEvents.forEach((event) => {
        document.addEventListener(event, handleActivity, { passive: true });
    });

    // Reset initial timer
    resetInactivityTimer();

    // Start expiration check
    startExpirationCheck();

    // Store cleanup function
    (window as any).__stopInactivityTracking = () => {
        activityEvents.forEach((event) => {
            document.removeEventListener(event, handleActivity);
        });
    };
}

/**
 * Stop tracking inactivity
 */
export function stopInactivityTracking() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    if (expirationCheckTimer) {
        clearInterval(expirationCheckTimer);
        expirationCheckTimer = null;
    }

    // Remove event listeners
    const cleanup = (window as any).__stopInactivityTracking;
    if (cleanup) cleanup();

    warningShown = false;
}

/**
 * Reset activity (call when user performs an action)
 */
export function resetActivity() {
    resetInactivityTimer();
}

/**
 * Get minutes until session expires
 */
export function getMinutesUntilExpiry(): number {
    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return 0;

    const timeUntilExpiry = expirationTime - Date.now();
    return Math.max(0, Math.ceil(timeUntilExpiry / 1000 / 60));
}
