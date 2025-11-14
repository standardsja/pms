import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserRoles } from '../store/authSlice';

interface CommitteeRouteProps {
  children: React.ReactNode;
}

// Route guard for Innovation Committee-only pages.
// Behavior:
// - If not authenticated: redirect to /auth/login
// - If authenticated but missing INNOVATION_COMMITTEE: redirect to /innovation/dashboard
// - Else: render children
const CommitteeRoute: React.FC<CommitteeRouteProps> = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const roles = useSelector(selectUserRoles);

  // Storage fallback to avoid redirect loops before Redux hydration completes
  const { hasToken, isCommitteeFromStorage } = useMemo(() => {
    const token =
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('auth_token') ||
      localStorage.getItem('auth_token');

    let rolesRaw: any[] = [];
    try {
      const raw =
        localStorage.getItem('auth_user') ||
        sessionStorage.getItem('auth_user') ||
        localStorage.getItem('userProfile');
      if (raw) {
        const u = JSON.parse(raw);
        if (Array.isArray(u?.roles)) rolesRaw = u.roles;
        else if (u?.role) rolesRaw = [u.role];
      }
    } catch {}

    const norm = (r: any): string => (typeof r === 'string' ? r : r?.name || r?.role?.name || '');
    const flat = rolesRaw
      .map(norm)
      .filter(Boolean)
      .map((s: string) => String(s).toUpperCase());
    const isCommittee = flat.includes('INNOVATION_COMMITTEE');

    return { hasToken: !!token, isCommitteeFromStorage: isCommittee };
  }, []);

  const reduxIsCommittee = (roles || []).some((r: any) => String(r).toUpperCase() === 'INNOVATION_COMMITTEE');
  const allow = (isAuthenticated || hasToken) && (reduxIsCommittee || isCommitteeFromStorage);

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!allow) {
    return <Navigate to="/innovation/dashboard" replace />;
  }

  return <>{children}</>;
};

export default CommitteeRoute;
