import Swal from 'sweetalert2';
import { getApiUrl } from '../config/api';
import { getToken, getUser, setAuth, isRemembered } from './auth';
import type { Dispatch } from 'redux';
import { setUser } from '../store/authSlice';
import { detectUserRoles, getDashboardPath } from './roleDetection';

type Role = { name: string } | string;
type UserResponse = {
    id: number;
    email: string;
    name?: string;
    roles?: Role[];
    permissions?: string[];
    [key: string]: unknown;
};

type RefreshResponse = {
    token: string;
    refreshToken: string;
    user: UserResponse;
};

let intervalId: number | null = null;

function rolesChanged(a: Role[] = [], b: Role[] = []): boolean {
    const normalize = (r: Role) => (typeof r === 'string' ? r : r.name);
    const A = a.map(normalize).sort();
    const B = b.map(normalize).sort();
    if (A.length !== B.length) return true;
    for (let i = 0; i < A.length; i++) {
        if (A[i] !== B[i]) return true;
    }
    return false;
}

export function startRoleChangeMonitor(dispatch: Dispatch) {
    // Avoid duplicate monitors
    if (intervalId) return;

    const check = async () => {
        const token = getToken();
        if (!token) {
            // Stop monitoring when unauthenticated
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            return;
        }

        try {
            const res = await fetch(getApiUrl('/api/auth/me'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const serverUser: UserResponse = await res.json();
            const current = getUser();
            const currentRoles: Role[] = (current?.roles as Role[]) || (current?.role ? [current.role as Role] : []);
            const serverRoles: Role[] = (serverUser.roles as Role[]) || [];

            if (rolesChanged(currentRoles, serverRoles)) {
                // Stop the monitor immediately to prevent duplicate triggers
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }

                // User's role has changed - need to get a fresh token with new roles
                const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

                let tokenRefreshSuccess = false;

                if (refreshToken) {
                    try {
                        // Refresh token to get new access token with updated roles
                        const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refreshToken }),
                        });

                        if (refreshRes.ok) {
                            const refreshData: RefreshResponse = await refreshRes.json();
                            // Update both token and user data with fresh values including new refresh token
                            setAuth(refreshData.token, refreshData.user, isRemembered());

                            // Store new refresh token
                            if (isRemembered()) {
                                localStorage.setItem('refreshToken', refreshData.refreshToken);
                            } else {
                                sessionStorage.setItem('refreshToken', refreshData.refreshToken);
                            }

                            dispatch(setUser(refreshData.user));
                            tokenRefreshSuccess = true;
                        } else {
                            console.error('Token refresh failed with status:', refreshRes.status);
                        }
                    } catch (err) {
                        console.error('Token refresh error:', err);
                    }
                }

                // Only proceed with reload if token was successfully refreshed
                if (!tokenRefreshSuccess) {
                    console.warn('Could not refresh token after role change. User may need to re-login.');
                    // Force logout and redirect to login
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/auth/login';
                    return;
                }

                // Ensure localStorage is fully flushed before reload
                try {
                    localStorage.setItem('_auth_sync_marker', String(Date.now()));
                    localStorage.removeItem('_auth_sync_marker');
                } catch {
                    // Silently fail if localStorage is full
                }

                // Determine appropriate dashboard for new role
                const detectedRoles = detectUserRoles(serverRoles);
                const targetDashboard = getDashboardPath(detectedRoles, window.location.pathname);

                await Swal.fire({
                    title: 'Role Updated',
                    text: 'Your access has changed. Reloading now…',
                    icon: 'info',
                    timer: 1200,
                    showConfirmButton: false,
                });

                // Reload to clear all API client caches and reinitialize auth with new token
                setTimeout(() => {
                    if (targetDashboard !== window.location.pathname) {
                        window.location.href = targetDashboard;
                    } else {
                        window.location.reload();
                    }
                }, 500);
            }
        } catch {
            // Silent failure; will retry on next tick
        }
    };

    // Initial check, then poll every 10s
    check();
    intervalId = window.setInterval(check, 10_000);
}

export function stopRoleChangeMonitor() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
