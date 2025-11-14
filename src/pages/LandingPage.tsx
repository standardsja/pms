import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser, getToken } from '../utils/auth';
import ModuleSelector from './ModuleSelector';

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Debug authentication status
        const authenticated = isAuthenticated();
        const user = getUser();
        const token = getToken();
        
        console.log('LandingPage auth check:', { authenticated, user, token });

        // If not authenticated, redirect to login
        if (!authenticated) {
            console.log('Not authenticated, redirecting to login');
            navigate('/auth/login', { replace: true });
            return;
        }

        // If authenticated, check if user is Innovation Committee member
        const userRoles = user?.roles || (user?.role ? [user.role] : []);
        console.log('User roles:', userRoles);

        // Only Innovation committee goes directly to their dashboard
        // All other users see the ModuleSelector
        if (userRoles.includes('INNOVATION_COMMITTEE')) {
            console.log('Committee member, redirecting to committee dashboard');
            navigate('/innovation/committee/dashboard', { replace: true });
            return;
        }

        console.log('Authenticated user, showing ModuleSelector');
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