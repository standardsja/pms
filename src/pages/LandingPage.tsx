import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../utils/auth';

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication status
        const authenticated = isAuthenticated();
        const user = getUser();

        if (!authenticated) {
            navigate('/auth/login', { replace: true });
            return;
        }

        const userRoles = user?.roles || (user?.role ? [user.role] : []);

        if (userRoles.includes('INNOVATION_COMMITTEE')) {
            navigate('/innovation/committee/dashboard', { replace: true });
            return;
        }

        // Default path: send users through onboarding flow
        navigate('/onboarding', { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-lg">Redirecting...</div>
        </div>
    );
};

export default LandingPage;
