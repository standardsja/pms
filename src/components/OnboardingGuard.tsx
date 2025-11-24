import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Route guard to prevent returning to Onboarding after selection/completion.
 * - Allows access when query contains force=1/reset=1/clear=1
 * - Otherwise, if selectedModule exists or onboardingComplete is true, redirects away with replace
 */
export default function OnboardingGuard({ children }: PropsWithChildren) {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const force = params.get('force') === '1';
    const reset = params.get('reset') === '1';
    const clear = params.get('clear') === '1';

    if (force || reset || clear) {
        return <>{children}</>;
    }

    try {
        const selectedModule = localStorage.getItem('selectedModule');
        const done = localStorage.getItem('onboardingComplete') === 'true';
        if (selectedModule || done) {
            return <Navigate to="/" replace />;
        }
    } catch {
        // If localStorage is unavailable, allow access
    }

    return <>{children}</>;
}
