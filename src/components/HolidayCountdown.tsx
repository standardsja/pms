import { useEffect, useState } from 'react';
import { getCurrentHolidayTheme, getUpcomingHoliday } from '../utils/holidayTheme';

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

/**
 * Holiday Countdown Component
 * Shows a live countdown to the next Jamaican holiday
 */
const HolidayCountdown = () => {
    const [currentTheme, setCurrentTheme] = useState(getCurrentHolidayTheme());
    const [upcomingHoliday, setUpcomingHoliday] = useState(getUpcomingHoliday());
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const updateCountdown = () => {
            const upcoming = getUpcomingHoliday();
            setUpcomingHoliday(upcoming);
            setCurrentTheme(getCurrentHolidayTheme());

            if (upcoming) {
                const now = new Date();
                const year = now.getFullYear();

                // Find the exact holiday to get its start date
                const holidayDate = new Date(year, 0, 1); // Default fallback

                // Calculate based on holiday name
                if (upcoming.holiday === "New Year's Day") {
                    holidayDate.setMonth(0, 1);
                } else if (upcoming.holiday === 'Emancipation Day') {
                    holidayDate.setMonth(7, 1); // August 1
                } else if (upcoming.holiday === 'Independence Day') {
                    holidayDate.setMonth(7, 6); // August 6
                } else if (upcoming.holiday === 'Christmas Season') {
                    holidayDate.setMonth(11, 15); // December 15
                } else if (upcoming.holiday === 'Boxing Day') {
                    holidayDate.setMonth(11, 26); // December 26
                } else if (upcoming.holiday === 'National Heroes Day') {
                    // Third Monday of October
                    const oct = new Date(year, 9, 1);
                    const dayOfWeek = oct.getDay();
                    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
                    holidayDate.setMonth(9, daysUntilMonday + 14);
                }

                // If date is in the past, check next year
                if (holidayDate < now) {
                    if (upcoming.holiday === "New Year's Day") {
                        holidayDate.setFullYear(year + 1, 0, 1);
                    }
                }

                const diff = holidayDate.getTime() - now.getTime();

                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                    setTimeRemaining({ days, hours, minutes, seconds });
                } else {
                    setTimeRemaining(null);
                }
            } else {
                setTimeRemaining(null);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, []);

    // Don't show if dismissed or no upcoming holiday
    if (!isVisible || (!currentTheme && !upcomingHoliday)) return null;

    // If currently in a holiday, show celebration message
    if (currentTheme) {
        return (
            <div className="panel relative overflow-hidden">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Dismiss countdown"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-center gap-4">
                    <div className="text-4xl">{currentTheme.icon}</div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{currentTheme.message}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentTheme.name}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show countdown to next holiday
    if (upcomingHoliday && timeRemaining) {
        const { days, hours, minutes, seconds } = timeRemaining;
        const isNear = days <= 7; // Show detailed countdown if within 7 days

        return (
            <div className="panel relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Dismiss countdown"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="text-3xl">{upcomingHoliday.theme.icon}</div>

                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{upcomingHoliday.holiday}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 mb-3">Upcoming celebration</p>

                        {isNear && (
                            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                                {days > 0 && (
                                    <div className="text-center min-w-[60px]">
                                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">{days}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{days === 1 ? 'Day' : 'Days'}</div>
                                    </div>
                                )}

                                <div className="text-center min-w-[60px]">
                                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{hours.toString().padStart(2, '0')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hours</div>
                                </div>

                                <div className="text-center min-w-[60px]">
                                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{minutes.toString().padStart(2, '0')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mins</div>
                                </div>

                                <div className="text-center min-w-[60px]">
                                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{seconds.toString().padStart(2, '0')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Secs</div>
                                </div>
                            </div>
                        )}

                        {!isNear && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{days} days until</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subtle decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-transparent opacity-20 rounded-full -mr-12 -mt-12 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-indigo-100 to-transparent opacity-20 rounded-full -ml-10 -mb-10 blur-2xl" />
            </div>
        );
    }

    return null;
};

export default HolidayCountdown;
