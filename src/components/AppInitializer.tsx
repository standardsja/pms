import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../store';
import { toggleRTL, toggleTheme, toggleLocale, toggleMenu, toggleLayout, toggleAnimation, toggleNavbar, toggleSemidark, toggleAccent } from '../store/themeConfigSlice';
import { verifyToken } from '../store/authSlice';
import { applyHolidayTheme } from '../utils/holidayTheme';
import { startInactivityTracking, stopInactivityTracking } from '../utils/inactivityTracker';
import { isAuthenticated } from '../utils/auth';

/**
 * AppInitializer - Handles global app initialization without rendering anything
 * This component runs theme initialization, token verification, and holiday theme setup
 */
export function AppInitializer() {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(toggleTheme(localStorage.getItem('theme') || themeConfig.theme));
        dispatch(toggleMenu(localStorage.getItem('menu') || themeConfig.menu));
        dispatch(toggleLayout(localStorage.getItem('layout') || themeConfig.layout));
        dispatch(toggleRTL(localStorage.getItem('rtlClass') || themeConfig.rtlClass));
        dispatch(toggleAnimation(localStorage.getItem('animation') || themeConfig.animation));
        dispatch(toggleNavbar(localStorage.getItem('navbar') || themeConfig.navbar));
        dispatch(toggleLocale(localStorage.getItem('i18nextLng') || themeConfig.locale));
        dispatch(toggleSemidark(localStorage.getItem('semidark') || themeConfig.semidark));
        dispatch(toggleAccent(localStorage.getItem('accent') || (themeConfig as any).accent || 'blue'));

        // Verify existing token on app load
        const token = localStorage.getItem('token');
        if (token) {
            dispatch(verifyToken() as any);
        }

        // Start inactivity tracking for authenticated users
        if (isAuthenticated()) {
            startInactivityTracking();
        }

        // Apply holiday theme
        applyHolidayTheme();

        // Check for theme changes daily
        const holidayInterval = setInterval(() => {
            applyHolidayTheme();
        }, 1000 * 60 * 60 * 24); // Check daily

        return () => {
            clearInterval(holidayInterval);
            stopInactivityTracking();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    return null; // This component doesn't render anything
}
