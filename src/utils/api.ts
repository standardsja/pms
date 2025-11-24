/**
 * Utility functions for API requests
 */

/**
 * Get the API base URL for development vs production
 * In development: uses relative URLs for Vite proxy
 * In production: uses VITE_API_URL environment variable
 */
export function getApiUrl(path: string): string {
    // Remove leading slash if present to normalize path
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    if (import.meta.env.DEV) {
        // Development: use relative URL for Vite proxy
        return `/${normalizedPath}`;
    } else {
        // Production: use absolute URL
        const apiBase = import.meta.env.VITE_API_URL || '';
        return `${apiBase}/${normalizedPath}`;
    }
}

/**
 * Get user auth headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Get user data from auth storage
    const userProfile = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    const user = userProfile ? JSON.parse(userProfile) : null;
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

    if (user?.id) {
        headers['x-user-id'] = String(user.id);
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}
