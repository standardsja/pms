import { PropsWithChildren, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from './store';
import { toggleRTL, toggleTheme, toggleLocale, toggleMenu, toggleLayout, toggleAnimation, toggleNavbar, toggleSemidark, toggleAccent } from './store/themeConfigSlice';
import { verifyToken } from './store/authSlice';
import store from './store';
import { applyHolidayTheme } from './utils/holidayTheme';
import { refreshTokenIfNeeded } from './utils/apiInterceptor';

function App({ children }: PropsWithChildren) {
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

        // Verify and restore existing token on app load
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refreshToken');

        if (token || refreshToken) {
            // First, check if token is about to expire and refresh if needed
            refreshTokenIfNeeded();
            // Then verify the token
            dispatch(verifyToken() as any);
        }

        // Apply holiday theme
        applyHolidayTheme();

        // Check for theme changes daily
        const holidayInterval = setInterval(() => {
            applyHolidayTheme();
        }, 1000 * 60 * 60 * 24); // Check daily

        // Proactively refresh token every 20 minutes to maintain session
        const tokenRefreshInterval = setInterval(async () => {
            await refreshTokenIfNeeded();
        }, 20 * 60 * 1000);

        return () => {
            clearInterval(holidayInterval);
            clearInterval(tokenRefreshInterval);
        };
    }, [dispatch, themeConfig.theme, themeConfig.menu, themeConfig.layout, themeConfig.rtlClass, themeConfig.animation, themeConfig.navbar, themeConfig.locale, themeConfig.semidark]);

    return (
        <div
            className={`${(store.getState().themeConfig.sidebar && 'toggle-sidebar') || ''} ${themeConfig.menu} ${themeConfig.layout} ${
                themeConfig.rtlClass
            } main-section antialiased relative font-nunito text-sm font-normal`}
        >
            {children}
        </div>
    );
}

export default App;
