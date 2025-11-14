import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../utils/auth';
import ModuleSelector from './ModuleSelector';

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // If not authenticated, redirect to login
        if (!isAuthenticated()) {
            navigate('/auth/login', { replace: true });
            return;
        }

        // If authenticated, check if user is Innovation Committee member
        const user = getUser();
        const userRoles = user?.roles || (user?.role ? [user.role] : []);

        // Only Innovation committee goes directly to their dashboard
        // All other users see the ModuleSelector
        if (userRoles.includes('INNOVATION_COMMITTEE')) {
            navigate('/innovation/committee/dashboard', { replace: true });
            return;
        }

        // For all other authenticated users, show the ModuleSelector
        // This includes managers, officers, suppliers, and general staff
    }, [navigate]);

    // If we get here, show the ModuleSelector for authenticated users (except committee)
    if (isAuthenticated()) {
        return <ModuleSelector />;
    }

    // Show loading state while redirecting
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-lg">Loading...</div>
        </div>
    );
};

export default LandingPage;