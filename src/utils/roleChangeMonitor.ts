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

    let lastConfirmedRoles: Role[] = [];

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
                // Verify this is a real change, not a temporary inconsistency
                // by checking if it's different from our last confirmed state
                if (!rolesChanged(lastConfirmedRoles, serverRoles)) {
                    // No actual change from what we last confirmed, skip
                    return;
                }

                // Stop the monitor immediately to prevent duplicate triggers
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }

                // Role change detected - show notification and redirect to login
                // This ensures the user gets a fresh token with their new roles
                await Swal.fire({
                    title: 'Role Updated',
                    text: 'Your roles have been updated. Please log in again to continue.',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false,
                });

                // Clear all stored auth data
                localStorage.clear();
                sessionStorage.clear();

                // Redirect to login
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 500);
            } else {
                // No role change detected, update our confirmed roles
                lastConfirmedRoles = serverRoles;
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
