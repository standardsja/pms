import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../store/authSlice';
import { fetchModuleLocks } from '../utils/moduleLocks';

interface InnovationRouteProps {
    children: React.ReactNode;
}

/**
 * Route guard for Innovation Hub pages
 * - Checks if user is authenticated
 * - Checks if innovation module is locked
 * - Redirects to module selection if locked
 */
const InnovationRoute: React.FC<InnovationRouteProps> = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [isModuleLocked, setIsModuleLocked] = useState(false);
    const [checkingLock, setCheckingLock] = useState(true);

    // Check if innovation module is locked
    useEffect(() => {
        const checkModuleLock = async () => {
            try {
                const locks = await fetchModuleLocks();
                setIsModuleLocked(locks.innovation?.locked ?? false);
            } catch (error) {
                console.error('Failed to check module lock:', error);
                setIsModuleLocked(false);
            } finally {
                setCheckingLock(false);
            }
        };
        checkModuleLock();
    }, []);

    // Check auth from storage as fallback
    const hasToken = !!(sessionStorage.getItem('token') || localStorage.getItem('token') || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token'));

    if (!isAuthenticated && !hasToken) {
        return <Navigate to="/auth/login" replace />;
    }

    // Show loading while checking lock status
    if (checkingLock) {
        return null;
    }

    // Redirect if module is locked
    if (isModuleLocked) {
        return <Navigate to="/?locked=innovation" replace />;
    }

    return <>{children}</>;
};

export default InnovationRoute;
