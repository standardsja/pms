/**
 * API Interceptor for handling JWT token refresh
 * Automatically refreshes tokens on 401 responses
 */

import { getApiUrl } from '../config/api';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh events
 * Used to retry failed requests after token is refreshed
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers of new token
 */
function onTokenRefreshed(token: string) {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
}

/**
 * Refresh the access token using the refresh token
 */
async function performTokenRefresh(): Promise<string | null> {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            return null;
        }

        const response = await fetch(getApiUrl('/api/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            // Refresh failed, clear tokens and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            return null;
        }

        const data = await response.json();

        if (data.token) {
            localStorage.setItem('token', data.token);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            if (data.user) {
                localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
            return data.token;
        }

        return null;
    } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return null;
    }
}

/**
 * Enhanced fetch wrapper that handles token refresh
 * If a request gets a 401, automatically refreshes token and retries
 */
export async function fetchWithTokenRefresh(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Add current token to request
    let token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(url, { ...options, headers });

    // If 401, attempt to refresh token
    if (response.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;

            // Perform the actual token refresh
            const newToken = await performTokenRefresh();

            if (newToken) {
                onTokenRefreshed(newToken);
            } else {
                // Refresh failed - will be handled by caller (redirect to login)
                isRefreshing = false;
                return response;
            }

            isRefreshing = false;
        }

        // Wait for token refresh to complete, then retry request
        return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken: string) => {
                const retryHeaders = new Headers(options.headers || {});
                retryHeaders.set('Authorization', `Bearer ${newToken}`);
                fetch(url, { ...options, headers: retryHeaders })
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    return response;
}

/**
 * Utility to check if token is about to expire
 * Returns true if token will expire in the next 5 minutes
 */
export function isTokenAboutToExpire(): boolean {
    try {
        const token = localStorage.getItem('token');
        if (!token) return false;

        // Parse JWT (this is safe to do without verification for expiry check)
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const payload = JSON.parse(atob(parts[1]));
        const expiresAt = payload.exp * 1000; // Convert to ms
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Return true if less than 5 minutes until expiry
        return timeUntilExpiry < 5 * 60 * 1000;
    } catch {
        return false;
    }
}

/**
 * Proactively refresh token if it's about to expire
 */
export async function refreshTokenIfNeeded(): Promise<void> {
    if (isTokenAboutToExpire()) {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await performTokenRefresh();
            }
        } catch (error) {
            console.error('Proactive token refresh failed:', error);
        }
    }
}

export default {
    fetchWithTokenRefresh,
    isTokenAboutToExpire,
    refreshTokenIfNeeded,
};
