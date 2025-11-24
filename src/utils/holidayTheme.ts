/**
 * Jamaican Holiday Theme System
 * Automatically detects and applies themed styling for Jamaican holidays
 */

export interface HolidayTheme {
    id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        gradient: string;
    };
    icon: string;
    message: string;
    decorations: {
        emoji: string[];
        pattern: string;
    };
}

interface Holiday {
    name: string;
    startDate: (year: number) => Date;
    endDate: (year: number) => Date;
    theme: HolidayTheme;
}

// Jamaican Holidays with themes
const JAMAICAN_HOLIDAYS: Holiday[] = [
    {
        name: "New Year's Day",
        startDate: (year) => new Date(year, 0, 1),
        endDate: (year) => new Date(year, 0, 2),
        theme: {
            id: 'new-year',
            name: "New Year's Celebration",
            colors: {
                primary: '#1e3a8a',
                secondary: '#3b82f6',
                accent: '#60a5fa',
                gradient: 'from-blue-900 via-blue-600 to-blue-400',
            },
            icon: '🎊',
            message: 'Welcome to 2026',
            decorations: {
                emoji: ['✨', '🎯', '📈'],
                pattern: 'confetti',
            },
        },
    },
    {
        name: 'Emancipation Day',
        startDate: (year) => new Date(year, 7, 1), // August 1
        endDate: (year) => new Date(year, 7, 2),
        theme: {
            id: 'emancipation',
            name: 'Emancipation Day',
            colors: {
                primary: '#047857',
                secondary: '#fbbf24',
                accent: '#1f2937',
                gradient: 'from-emerald-700 via-amber-400 to-gray-800',
            },
            icon: '🇯🇲',
            message: 'Celebrating Freedom & Heritage',
            decorations: {
                emoji: ['🇯🇲', '🕊️', '⭐'],
                pattern: 'jamaica-flag',
            },
        },
    },
    {
        name: 'Independence Day',
        startDate: (year) => new Date(year, 7, 6), // August 6
        endDate: (year) => new Date(year, 7, 7),
        theme: {
            id: 'independence',
            name: 'Independence Day',
            colors: {
                primary: '#047857',
                secondary: '#fbbf24',
                accent: '#1f2937',
                gradient: 'from-emerald-600 via-amber-400 to-gray-800',
            },
            icon: '🇯🇲',
            message: 'Independence Day 2025',
            decorations: {
                emoji: ['🇯🇲', '⭐', '🏆'],
                pattern: 'jamaica-stars',
            },
        },
    },
    {
        name: 'National Heroes Day',
        startDate: (year) => {
            // Third Monday of October
            const oct = new Date(year, 9, 1);
            const dayOfWeek = oct.getDay();
            const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            return new Date(year, 9, daysUntilMonday + 14);
        },
        endDate: (year) => {
            const start = JAMAICAN_HOLIDAYS.find((h) => h.name === 'National Heroes Day')!.startDate(year);
            return new Date(start.getTime() + 86400000);
        },
        theme: {
            id: 'heroes',
            name: 'National Heroes Day',
            colors: {
                primary: '#b45309',
                secondary: '#047857',
                accent: '#fbbf24',
                gradient: 'from-amber-700 via-emerald-600 to-yellow-500',
            },
            icon: '🏆',
            message: 'Honoring National Heroes',
            decorations: {
                emoji: ['🇯🇲', '🏆', '⭐'],
                pattern: 'heroes-stars',
            },
        },
    },
    {
        name: 'Christmas Season',
        startDate: (year) => new Date(year, 10, 12), // November 12
        endDate: (year) => new Date(year, 11, 31, 23, 59, 59), // December 31
        theme: {
            id: 'christmas',
            name: 'Holiday Season',
            colors: {
                primary: '#dc2626',
                secondary: '#059669',
                accent: '#f59e0b',
                gradient: 'from-red-600 via-emerald-600 to-amber-500',
            },
            icon: '🎄',
            message: "Season's Greetings",
            decorations: {
                emoji: ['🎄', '✨', '🎁'],
                pattern: 'christmas-lights',
            },
        },
    },
];

/**
 * Get the current active holiday theme based on today's date
 */
export function getCurrentHolidayTheme(): HolidayTheme | null {
    const now = new Date();
    const year = now.getFullYear();

    for (const holiday of JAMAICAN_HOLIDAYS) {
        const start = holiday.startDate(year);
        const end = holiday.endDate(year);

        if (now >= start && now < end) {
            return holiday.theme;
        }
    }

    return null;
}

/**
 * Get upcoming holiday (within next 7 days)
 */
export function getUpcomingHoliday(): { holiday: string; daysUntil: number; theme: HolidayTheme } | null {
    const now = new Date();
    const year = now.getFullYear();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const holiday of JAMAICAN_HOLIDAYS) {
        const start = holiday.startDate(year);

        if (start > now && start <= sevenDaysFromNow) {
            const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                holiday: holiday.name,
                daysUntil,
                theme: holiday.theme,
            };
        }
    }

    // Check next year's holidays if near year-end
    if (now.getMonth() === 11 && now.getDate() > 25) {
        const nextYear = year + 1;
        for (const holiday of JAMAICAN_HOLIDAYS) {
            const start = holiday.startDate(nextYear);
            if (start <= sevenDaysFromNow) {
                const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return {
                    holiday: holiday.name,
                    daysUntil,
                    theme: holiday.theme,
                };
            }
        }
    }

    return null;
}

/**
 * Get all Jamaican holidays for a given year
 */
export function getAllJamaicanHolidays(year: number = new Date().getFullYear()) {
    return JAMAICAN_HOLIDAYS.map((holiday) => ({
        name: holiday.name,
        date: holiday.startDate(year),
        theme: holiday.theme,
    }));
}

/**
 * Check if today is a Jamaican holiday
 */
export function isJamaicanHoliday(): boolean {
    return getCurrentHolidayTheme() !== null;
}

/**
 * Get holiday-specific CSS classes
 */
export function getHolidayClasses(baseClasses: string = ''): string {
    const theme = getCurrentHolidayTheme();
    if (!theme) return baseClasses;

    return `${baseClasses} holiday-theme holiday-${theme.id}`;
}

/**
 * Get holiday gradient for hero headers
 */
export function getHolidayGradient(defaultGradient: string): string {
    const theme = getCurrentHolidayTheme();
    return theme ? `bg-gradient-to-r ${theme.colors.gradient}` : defaultGradient;
}

/**
 * Apply holiday theme to document
 */
export function applyHolidayTheme(): void {
    const theme = getCurrentHolidayTheme();
    const root = document.documentElement;

    if (theme) {
        root.style.setProperty('--holiday-primary', theme.colors.primary);
        root.style.setProperty('--holiday-secondary', theme.colors.secondary);
        root.style.setProperty('--holiday-accent', theme.colors.accent);
        root.classList.add('holiday-active', `holiday-${theme.id}`);
    } else {
        root.classList.remove('holiday-active');
        JAMAICAN_HOLIDAYS.forEach((h) => root.classList.remove(`holiday-${h.theme.id}`));
    }
}
