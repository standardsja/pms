import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import { IRootState } from '../../store';
import { detectUserRoles, getDashboardPath } from '../../utils/roleDetection';
import { getUser } from '../../utils/auth';

const NotFound = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    useEffect(() => {
        dispatch(setPageTitle('Page Not Found - 404'));
    }, [dispatch]);

    // Get user's dashboard path
    const currentUser = getUser();
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    const detectedRoles = detectUserRoles(userRoles);
    const dashboardPath = getDashboardPath(detectedRoles, window.location.pathname);

    const handleGoHome = () => {
        navigate(dashboardPath);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="px-6 py-16 text-center font-semibold">
                <div className="relative">
                    {/* Animated 404 Icon */}
                    <div className="mb-8 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping opacity-20">
                                <svg className="h-64 w-64 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <svg className="h-64 w-64 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="mb-4 text-8xl font-extrabold tracking-tight text-gray-900 dark:text-white">404</h1>
                    <h2 className="mb-4 text-3xl font-bold text-gray-700 dark:text-gray-200">Page Not Found</h2>
                    <p className="mx-auto mb-8 max-w-md text-lg text-gray-600 dark:text-gray-400">The page you're looking for doesn't exist or you don't have permission to access it.</p>

                    {/* Action Buttons */}
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <button onClick={handleGoHome} className="btn btn-primary gap-2 px-6 py-3 shadow-lg transition-all hover:scale-105">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                            </svg>
                            Go to Dashboard
                        </button>
                        <button onClick={() => window.history.back()} className="btn btn-outline-primary gap-2 px-6 py-3 transition-all hover:scale-105">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Go Back
                        </button>
                    </div>

                    {/* Helpful Links */}
                    <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
                        <Link to="/apps/requests" className="text-primary hover:underline">
                            My Requests
                        </Link>
                        <Link to="/procurement/dashboard" className="text-primary hover:underline">
                            Procurement
                        </Link>
                        {detectedRoles.isAdmin && (
                            <Link to="/procurement/admin" className="text-primary hover:underline">
                                Admin Panel
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
