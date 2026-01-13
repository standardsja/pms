import Swal from 'sweetalert2';
import { getApiUrl } from '../config/api';
import { getToken, getUser, setAuth, isRemembered } from './auth';
import type { Dispatch } from 'redux';
import { setUser } from '../store/authSlice';

type Role = { name: string } | string;
type UserResponse = {
    id: number;
    email: string;
    name?: string;
    roles?: Role[];
    [key: string]: unknown;
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
                // Persist updated user locally and in store
                const updated = { ...(current || {}), ...serverUser } as any;
                // Persist updated user in appropriate storage
                setAuth(token, updated, isRemembered());
                dispatch(setUser(updated));

                await Swal.fire({
                    title: 'Role Updated',
                    text: 'Your access has changed. Refreshing now…',
                    icon: 'info',
                    timer: 1200,
                    showConfirmButton: false,
                });
                // Full refresh to ensure all guards & menus re-evaluate
                window.location.reload();
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
