import { useEffect, useState } from 'react';
import { getCurrentHolidayTheme, getUpcomingHoliday } from '../utils/holidayTheme';

/**
 * Holiday Banner Component
 * Displays a festive banner during Jamaican holidays with themed styling
 */
const HolidayBanner = () => {
    const [currentTheme, setCurrentTheme] = useState(getCurrentHolidayTheme());
    const [upcomingHoliday, setUpcomingHoliday] = useState(getUpcomingHoliday());
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Check for theme updates daily
        const checkTheme = () => {
            setCurrentTheme(getCurrentHolidayTheme());
            setUpcomingHoliday(getUpcomingHoliday());
        };

        const interval = setInterval(checkTheme, 1000 * 60 * 60 * 24); // Check daily
        return () => clearInterval(interval);
    }, []);

    // Don't render if no holiday and banner was dismissed
    if (!currentTheme && !upcomingHoliday) return null;
    if (!isVisible) return null;

    // Show current holiday banner
    if (currentTheme) {
        return (
            <div
                className={`relative overflow-hidden bg-gradient-to-r ${currentTheme.colors.gradient} text-white py-4 px-6 shadow-md`}
                role="banner"
                aria-label={`${currentTheme.name} celebration banner`}
            >
                <div className="container mx-auto">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{currentTheme.icon}</span>
                            <div>
                                <div className="font-semibold text-lg">{currentTheme.message}</div>
                                <div className="text-sm text-white/80 mt-0.5">{currentTheme.name}</div>
                            </div>
                        </div>
                        <button onClick={() => setIsVisible(false)} className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg" aria-label="Dismiss banner">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Subtle decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16 blur-2xl" />
            </div>
        );
    }

    // Show upcoming holiday teaser (only if within 3 days)
    if (upcomingHoliday && upcomingHoliday.daysUntil <= 3) {
        return (
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 px-6 text-center shadow-sm" role="banner">
                <div className="inline-flex items-center gap-2.5">
                    <span className="text-lg">{upcomingHoliday.theme.icon}</span>
                    <span className="font-medium">
                        {upcomingHoliday.holiday} in {upcomingHoliday.daysUntil} day{upcomingHoliday.daysUntil !== 1 ? 's' : ''}
                    </span>
                </div>
                <button onClick={() => setIsVisible(false)} className="ml-4 text-white/70 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Dismiss">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        );
    }

    return null;
};

export default HolidayBanner;
