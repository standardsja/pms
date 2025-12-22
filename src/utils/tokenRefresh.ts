/**
 * Token Refresh Utility
 * Handles automatic token refresh using refresh tokens
 */
import { getApiUrl } from '../config/api';

let refreshPromise: Promise<string> | null = null;

/**
 * Refresh the access token using the stored refresh token
 * Returns the new access token on success, throws on failure
 */
export async function refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const url = import.meta.env.DEV ? '/api/auth/refresh' : getApiUrl('/api/auth/refresh');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();

            if (!data.token || !data.refreshToken) {
                throw new Error('Invalid refresh response');
            }

            // Update stored tokens
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);

            // Update user data if provided
            if (data.user) {
                localStorage.setItem('auth_user', JSON.stringify(data.user));
            }

            return data.token;
        } catch (error) {
            // Clear tokens on refresh failure
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth_user');
            throw error;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
        // Decode JWT (simple base64 decode, no verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() >= exp - fiveMinutes;
    } catch {
        return true;
    }
}

/**
 * Automatically refresh token if it's expiring soon
 * Can be called before API requests to ensure valid token
 */
export async function ensureValidToken(): Promise<string | null> {
    if (isTokenExpiringSoon()) {
        try {
            return await refreshAccessToken();
        } catch (error) {
            console.error('Token refresh failed:', error);
            return null;
        }
    }
    return localStorage.getItem('token');
}
