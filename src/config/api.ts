/**
 * Centralized API configuration
 * Uses relative paths in development to leverage Vite proxy
 */

export function getApiBaseUrl(): string {
    // Check environment variable first
    const envUrl = import.meta.env.VITE_API_URL;

    if (envUrl) {
        // Remove trailing slash if present
        return envUrl.replace(/\/$/, '');
    }

    // Check if we're in development mode
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

    // In development, use empty string for relative paths (Vite proxy will handle it)
    if (isDev) {
        return '';
    }

    // In browsers, prefer same-origin to play nicely with reverse proxies
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(/\/$/, '');
    }

    // Last-resort production fallback
    return '';
}

/**
 * Build full API URL for a given path
 * @param path - API path (e.g., '/api/ideas')
 * @returns Full URL or relative path (in dev mode)
 */
export function getApiUrl(path?: string): string {
    const base = getApiBaseUrl();

    // If no path provided, return API root suitable for building endpoints
    if (!path) {
        // In dev, use '/api' to hit Vite proxy; in prod, append '/api' to base
        return base ? `${base}/api` : '/api';
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // If base is empty, return just the path (relative URL)
    if (!base) {
        return cleanPath;
    }

    return `${base}${cleanPath}`;
}
