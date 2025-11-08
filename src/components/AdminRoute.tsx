import React from 'react';
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

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const isAdmin = roles?.includes('ADMIN' as any) || roles?.includes(UserRole.ADMIN as any);
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
