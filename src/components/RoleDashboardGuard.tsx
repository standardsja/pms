import { Navigate } from 'react-router-dom';
import { getUser } from '../utils/auth';

interface RoleDashboardGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallbackPath?: string;
}

const RoleDashboardGuard: React.FC<RoleDashboardGuardProps> = ({ children, allowedRoles, fallbackPath = '/procurement/dashboard' }) => {
    const currentUser = getUser();
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    const normalizedRoles = userRoles.map((r) => (typeof r === 'string' ? r.toUpperCase() : ''));
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    // Check if user has at least one of the allowed roles
    const hasAccess = normalizedRoles.some((role) => normalizedAllowed.includes(role));

    if (!hasAccess) {
        console.warn(`[RoleDashboardGuard] Access denied. User roles: ${normalizedRoles.join(', ')}, Allowed: ${normalizedAllowed.join(', ')}`);
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
};

export default RoleDashboardGuard;
