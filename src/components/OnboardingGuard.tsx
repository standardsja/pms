import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Route guard to prevent returning to Onboarding after selection/completion.
 * - Allows access when query contains force=1/reset=1/clear=1
 * - Allows access when user is not authenticated (will be handled by auth guard)
 * - Otherwise, if selectedModule exists or onboardingComplete is true, redirects away with replace
 */
export default function OnboardingGuard({ children }: PropsWithChildren) {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const fromSidebar = (location.state as any)?.from === 'sidebar' || params.get('from') === 'sidebar';

    const force = params.get('force') === '1';
    const reset = params.get('reset') === '1';
    const clear = params.get('clear') === '1';

    // Allow access with explicit overrides or when navigated from sidebar entrypoint
    if (force || reset || clear || fromSidebar) {
        return <>{children}</>;
    }

    try {
        // Check if user is authenticated
        const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

        // If not authenticated, allow (will be redirected by auth guard)
        if (!authToken) {
            return <>{children}</>;
        }

        // Check onboarding completion status
        const selectedModule = localStorage.getItem('selectedModule');
        const lastModule = localStorage.getItem('lastModule');
        const done = localStorage.getItem('onboardingComplete') === 'true';

        // Only redirect if both conditions are met:
        // 1. User has completed onboarding OR selected a module
        // 2. User has a valid redirect target (lastModule or selectedModule)
        if ((done || selectedModule) && (lastModule || selectedModule)) {
            // Redirect to the appropriate module path
            const redirectModule = selectedModule || lastModule;

            // Map modules to their default paths
            const modulePaths: Record<string, string> = {
                pms: '/procurement/dashboard',
                ih: '/innovation/dashboard',
                committee: '/innovation/committee/dashboard',
                budgeting: '/budgeting/dashboard',
                audit: '/audit/dashboard',
            };

            if (redirectModule) {
                const redirectPath = modulePaths[redirectModule] || '/';
                return <Navigate to={redirectPath} replace />;
            }
            // If we somehow have no redirect module, fall through and allow onboarding
        }
    } catch (err) {
        // If localStorage is unavailable or error occurs, allow access
        console.error('[OnboardingGuard] Error:', err);
    }

    return <>{children}</>;
}
