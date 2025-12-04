// Client-side auth service: use real backend API
import { LoginCredentials, AuthResponse } from '../types/auth';
import mockAuthService from './mockAuthService';
import { getApiUrl } from '../config/api';

// Use mock auth in development if VITE_USE_MOCK_AUTH is true
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
// Switchable auth mode (LOCAL | AAD); default LOCAL to avoid breaking current setup
const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || 'LOCAL') as 'LOCAL' | 'AAD';

class AuthService {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        // Prevent accidental password login in AAD mode (non-breaking stub)
        if (AUTH_MODE === 'AAD') {
            return {
                success: false,
                message: 'Password login disabled: Azure AD mode active (stub). Use SSO button.',
            };
        }
        // Use mock service if enabled in environment
        if (USE_MOCK_AUTH) {
            const result = await mockAuthService.login(credentials);
            if (result.success && result.token) {
                localStorage.setItem('token', result.token);
            }
            return result;
        }

        // Use real backend API
        try {
            // Normalize email to lowercase before sending
            const normalizedCredentials = {
                ...credentials,
                email: credentials.email.toLowerCase().trim(),
            };

            const response = await fetch(getApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(normalizedCredentials),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    message: errorText || 'Login failed',
                };
            }

            const data = await response.json();

            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            // Persist user snapshot for downstream services (adminService, etc.)
            try {
                if (data.user) {
                    localStorage.setItem('auth_user', JSON.stringify(data.user));
                }
            } catch {}

            // Transform backend user to frontend User type
            const user = data.user
                ? {
                      id: data.user.id,
                      email: data.user.email,
                      full_name: data.user.name || data.user.email,
                      status: 'active' as const,
                      roles: data.user.roles || [],
                      department_id: data.user.department?.id,
                      department_name: data.user.department?.name,
                  }
                : undefined;

            return {
                success: true,
                user,
                token: data.token,
                message: 'Login successful',
            };
        } catch (error) {
            // Provide user-friendly error messages for network issues
            let errorMessage = 'Network error';

            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
            } else if (error instanceof Error) {
                // Check for common network error patterns
                const msg = error.message.toLowerCase();
                if (msg.includes('failed to fetch') || msg.includes('network request failed')) {
                    errorMessage = 'Connection failed. Please check your internet connection and ensure the server is running.';
                } else if (msg.includes('timeout')) {
                    errorMessage = 'Connection timeout. Please check your internet connection and try again.';
                } else {
                    errorMessage = error.message;
                }
            }

            return {
                success: false,
                message: errorMessage,
            };
        }
    }

    async verifyToken(token?: string): Promise<AuthResponse> {
        if (USE_MOCK_AUTH) {
            const t = token || localStorage.getItem('token');
            if (!t) return { success: false, message: 'No authentication token found' };
            return mockAuthService.verifyToken(t);
        }

        // TODO: Implement real token verification endpoint
        const t = token || localStorage.getItem('token');
        if (!t) return { success: false, message: 'No authentication token found' };

        return { success: true, message: 'Token valid' };
    }

    async logout(): Promise<void> {
        if (USE_MOCK_AUTH) {
            await mockAuthService.logout();
        }
        localStorage.removeItem('token');
    }

    async refreshToken(): Promise<AuthResponse> {
        if (USE_MOCK_AUTH) {
            return mockAuthService.refreshToken();
        }
        // TODO: Implement real token refresh endpoint
        return { success: false, message: 'Token refresh not implemented' };
    }

    getAuthHeaders(): Record<string, string> {
        if (USE_MOCK_AUTH) {
            return mockAuthService.getAuthHeaders();
        }
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    isAuthenticated(): boolean {
        if (USE_MOCK_AUTH) {
            return mockAuthService.isAuthenticated();
        }
        return !!localStorage.getItem('token');
    }
}

export default new AuthService();
