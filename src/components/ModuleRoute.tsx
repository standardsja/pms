import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../store/authSlice';
import { fetchModuleLocks, type LockableModuleKey } from '../utils/moduleLocks';

interface ModuleRouteProps {
    children: React.ReactNode;
    module: LockableModuleKey;
    requiredRoles?: string[];
    fallbackPath?: string;
}

/**
 * Generic route guard for any module
 * - Checks if user is authenticated
 * - Optionally checks for required roles
 * - Checks if module is locked
 * - Redirects appropriately
 */
const ModuleRoute: React.FC<ModuleRouteProps> = ({ children, module, requiredRoles = [], fallbackPath = '/' }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [isModuleLocked, setIsModuleLocked] = useState(false);
    const [checkingLock, setCheckingLock] = useState(true);

    // Check if module is locked
    useEffect(() => {
        const checkModuleLock = async () => {
            try {
                const locks = await fetchModuleLocks();
                setIsModuleLocked(locks[module]?.locked ?? false);
            } catch (error) {
                console.error('Failed to check module lock:', error);
                setIsModuleLocked(false);
            } finally {
                setCheckingLock(false);
            }
        };
        checkModuleLock();
    }, [module]);

    // Check auth from storage as fallback
    const hasToken = !!(sessionStorage.getItem('token') || localStorage.getItem('token') || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token'));

    // Check roles if required
    let hasRequiredRole = true;
    if (requiredRoles.length > 0) {
        try {
            const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            if (raw) {
                const user = JSON.parse(raw);
                const userRoles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];

                const normalizedRoles = userRoles.map((r: any) => (typeof r === 'string' ? r : r?.name || '')).map((s: string) => String(s).toUpperCase());

                hasRequiredRole = requiredRoles.some((reqRole) => normalizedRoles.some((userRole) => userRole.includes(reqRole.toUpperCase())));
            } else {
                hasRequiredRole = false;
            }
        } catch {
            hasRequiredRole = false;
        }
    }

    if (!isAuthenticated && !hasToken) {
        return <Navigate to="/auth/login" replace />;
    }

    if (requiredRoles.length > 0 && !hasRequiredRole) {
        return <Navigate to={fallbackPath} replace />;
    }

    // Show loading while checking lock status
    if (checkingLock) {
        return null;
    }

    // Redirect if module is locked
    if (isModuleLocked) {
        return <Navigate to={`/?locked=${module}`} replace />;
    }

    return <>{children}</>;
};

export default ModuleRoute;
