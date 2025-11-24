/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
    if (!jsonString) return fallback;

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return fallback;
    }
}

/**
 * User profile type
 */
export interface UserProfile {
    id?: string | number;
    userId?: string | number;
    name?: string;
    fullName?: string;
    email?: string;
    roles?: any[];
    department?: {
        name?: string;
        code?: string;
    };
}

/**
 * Safely get user data from localStorage/sessionStorage
 */
export function getUserData(): UserProfile | null {
    const authData = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    const legacyData = localStorage.getItem('userProfile');

    if (authData) {
        return safeJsonParse<UserProfile | null>(authData, null);
    }

    if (legacyData) {
        return safeJsonParse<UserProfile | null>(legacyData, null);
    }

    return null;
}
