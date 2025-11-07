import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserRoles } from '../store/authSlice';
import { UserRole } from '../types/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    allowedRoles, 
    requiredRole 
}) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const userRoles = useSelector(selectUserRoles);
    const location = useLocation();

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // If no role restrictions, allow access
    if (!allowedRoles && !requiredRole) {
        return <>{children}</>;
    }

    // Check if user has required role
    if (requiredRole && !userRoles.includes(requiredRole)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Check if user has any of the allowed roles
    if (allowedRoles && !allowedRoles.some(role => userRoles.includes(role))) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;