// Client-side authentication service that calls backend APIs or uses mock data
import { User, LoginCredentials, AuthResponse } from '../types/auth';
import mockAuthService from './mockAuthService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

class AuthService {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        if (USE_MOCK_AUTH) {
            const result = await mockAuthService.login(credentials);
            if (result.success && result.token) {
                localStorage.setItem('token', result.token);
            }
            return result;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
            }

            return {
                success: true,
                user: data.user,
                token: data.token,
                message: 'Login successful'
            };

        } catch (error: any) {
            console.error('Login error:', error);
            // Fallback to mock service if backend is unavailable
            console.warn('Backend unavailable, falling back to mock authentication');
            const result = await mockAuthService.login(credentials);
            if (result.success && result.token) {
                localStorage.setItem('token', result.token);
            }
            return result;
        }
    }

    async verifyToken(token?: string): Promise<AuthResponse> {
        const authToken = token || localStorage.getItem('token');
        if (!authToken) {
            return {
                success: false,
                message: 'No authentication token found'
            };
        }

        if (USE_MOCK_AUTH) {
            return mockAuthService.verifyToken(authToken);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Token verification failed'
                };
            }

            return {
                success: true,
                user: data.user,
                message: 'Token verified'
            };

        } catch (error: any) {
            console.error('Token verification error:', error);
            // Fallback to mock service if backend is unavailable
            console.warn('Backend unavailable, falling back to mock authentication');
            return mockAuthService.verifyToken(authToken);
        }
    }

    async logout(): Promise<void> {
        if (USE_MOCK_AUTH) {
            return mockAuthService.logout();
        }

        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
        }
    }

    async refreshToken(): Promise<AuthResponse> {
        if (USE_MOCK_AUTH) {
            return mockAuthService.refreshToken();
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    message: 'No token available'
                };
            }

            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Token refresh failed'
                };
            }

            // Update token in localStorage
            if (data.token) {
                localStorage.setItem('token', data.token);
            }

            return {
                success: true,
                user: data.user,
                token: data.token,
                message: 'Token refreshed'
            };

        } catch (error: any) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                message: 'Token refresh failed'
            };
        }
    }

    // Utility method to get auth headers
    getAuthHeaders(): Record<string, string> {
        if (USE_MOCK_AUTH) {
            return mockAuthService.getAuthHeaders();
        }

        const token = localStorage.getItem('token');
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    }
}

export default new AuthService();