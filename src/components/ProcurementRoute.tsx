import React, { useMemo, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserRoles } from '../store/authSlice';
import { UserRole } from '../types/auth';
import { fetchModuleLocks } from '../utils/moduleLocks';

interface ProcurementRouteProps {
    children: React.ReactNode;
}

// Route guard for procurement-only pages (including admin access).
// Behavior:
// - If not authenticated: redirect to /auth/login
// - If authenticated but not procurement staff/admin: redirect to /
// - If module is locked: redirect to module selection with lock message
// - Else: render children
const ProcurementRoute: React.FC<ProcurementRouteProps> = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const roles = useSelector(selectUserRoles);
    const [isModuleLocked, setIsModuleLocked] = useState(false);
    const [checkingLock, setCheckingLock] = useState(true);

    // Check if procurement module is locked
    useEffect(() => {
        const checkModuleLock = async () => {
            try {
                const locks = await fetchModuleLocks();
                setIsModuleLocked(locks.procurement?.locked ?? false);
            } catch (error) {
                console.error('Failed to check module lock:', error);
                setIsModuleLocked(false);
            } finally {
                setCheckingLock(false);
            }
        };
        checkModuleLock();
    }, []);

    // Storage fallbacks to avoid redirect loops before Redux hydration completes
    const { hasToken, rolesFromStorage, isProcurementFromStorage } = useMemo(() => {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');

        // Read user snapshot written at login
        let rolesRaw: any[] = [];
        try {
            const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user') || localStorage.getItem('userProfile');
            if (raw) {
                const u = JSON.parse(raw);
                // Support shapes: { roles: [] } or { role: 'X' }
                if (Array.isArray(u?.roles)) rolesRaw = u.roles;
                else if (u?.role) rolesRaw = [u.role];
            }
        } catch {}

        const norm = (r: any): string => (typeof r === 'string' ? r : r?.name || r?.role?.name || '');
        const rolesFlat = rolesRaw
            .map(norm)
            .filter(Boolean)
            .map((s: string) => String(s).toUpperCase());

        // Check if user has procurement or admin access
        const isProcurement = rolesFlat.some((role) => role.includes('PROCUREMENT') || role.includes('ADMIN') || role.includes('ADMINISTRATOR'));

        return { hasToken: !!token, rolesFromStorage: rolesFlat, isProcurementFromStorage: isProcurement };
    }, []);

    // Determine procurement access using Redux first, then storage fallback
    const reduxIsProcurement = roles?.some((role: any) => {
        const roleStr = String(role).toUpperCase();
        return roleStr.includes('PROCUREMENT') || roleStr.includes('ADMIN');
    });

    const allow = (isAuthenticated || hasToken) && (reduxIsProcurement || isProcurementFromStorage);

    if (!isAuthenticated && !hasToken) {
        // No auth at all -> login
        return <Navigate to="/auth/login" replace />;
    }

    if (!allow) {
        // Authenticated but not procurement staff -> home
        return <Navigate to="/" replace />;
    }

    // Show loading while checking lock status
    if (checkingLock) {
        return null;
    }

    // Redirect if module is locked
    if (isModuleLocked) {
        return <Navigate to="/?locked=procurement" replace />;
    }

    return <>{children}</>;
};

export default ProcurementRoute;
