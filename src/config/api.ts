/**
 * Centralized API configuration
 * Reads from VITE_API_URL environment variable, falls back to heron:4000
 */

export function getApiBaseUrl(): string {
    // Check environment variable first
    const envUrl = import.meta.env.VITE_API_URL;

    if (envUrl) {
        // Remove trailing slash if present
        return envUrl.replace(/\/$/, '');
    }

    // Fallback to heron:4000 for production/development server
    return 'http://heron:4000';
}

/**
 * Build full API URL for a given path
 * @param path - API path (e.g., '/api/ideas')
 * @returns Full URL
 */
export function getApiUrl(path: string): string {
    const base = getApiBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
}
