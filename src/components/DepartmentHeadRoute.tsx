import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUserRoles, selectPrimaryUserRole } from '../store/authSlice';
import { UserRole } from '../types/auth';

interface DepartmentHeadRouteProps {
    children: React.ReactNode;
}

const DepartmentHeadRoute: React.FC<DepartmentHeadRouteProps> = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const userRoles = useSelector(selectUserRoles);
    const primaryRole = useSelector(selectPrimaryUserRole);

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }

    // If not Department Head, redirect to unauthorized or their appropriate dashboard
    if (!userRoles.includes(UserRole.DEPARTMENT_HEAD)) {
        // Redirect to appropriate dashboard based on primary role
        switch (primaryRole) {
            case UserRole.PROCUREMENT_OFFICER:
                return <Navigate to="/" replace />;
            case UserRole.PROCUREMENT_MANAGER:
                return <Navigate to="/procurement/manager" replace />;
            case UserRole.EXECUTIVE_DIRECTOR:
                return <Navigate to="/procurement/executive-director-dashboard" replace />;
            case UserRole.SUPPLIER:
                return <Navigate to="/supplier" replace />;
            case UserRole.FINANCE:
                return <Navigate to="/finance" replace />;
            default:
                return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
};

export default DepartmentHeadRoute;