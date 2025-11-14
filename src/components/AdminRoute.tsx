import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserRoles } from '../store/authSlice';
import { UserRole } from '../types/auth';

interface AdminRouteProps {
  children: React.ReactNode;
}

// Simple route guard for admin-only pages.
// Behavior:
// - If not authenticated: redirect to /auth/login
// - If authenticated but missing ADMIN: redirect to /
// - Else: render children
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const roles = useSelector(selectUserRoles);

  // Storage fallbacks to avoid redirect loops before Redux hydration completes
  const { hasToken, rolesFromStorage, isAdminFromStorage } = useMemo(() => {
    const token =
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('auth_token') ||
      localStorage.getItem('auth_token');

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
    const rolesFlat = rolesRaw.map(norm).filter(Boolean).map((s: string) => String(s).toUpperCase());
    const isAdmin = rolesFlat.includes('ADMIN') || rolesFlat.includes('ADMINISTRATOR');

    return { hasToken: !!token, rolesFromStorage: rolesFlat, isAdminFromStorage: isAdmin };
  }, []);

  // Determine admin access using Redux first, then storage fallback
  const reduxIsAdmin = (roles?.includes('ADMIN' as any)) || (roles?.includes(UserRole.ADMIN as any));
  const allow = (isAuthenticated || hasToken) && (reduxIsAdmin || isAdminFromStorage);

  if (!isAuthenticated && !hasToken) {
    // No auth at all -> login
    return <Navigate to="/auth/login" replace />;
  }

  if (!allow) {
    // Authenticated but not admin -> home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
