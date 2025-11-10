// Client-side auth service: use real backend API
import { LoginCredentials, AuthResponse } from '../types/auth';
import mockAuthService from './mockAuthService';

// Use mock auth in development if VITE_USE_MOCK_AUTH is true
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Use mock service if enabled in environment
    if (USE_MOCK_AUTH) {
      console.log('[AuthService] Using mock auth');
      const result = await mockAuthService.login(credentials);
      if (result.success && result.token) {
        localStorage.setItem('token', result.token);
      }
      return result;
    }

    // Use real backend API
    console.log('[AuthService] Using real backend API at /auth/login');
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('[AuthService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AuthService] Login failed:', response.status, errorText);
        return {
          success: false,
          message: errorText || 'Login failed',
        };
      }

      const data = await response.json();
      console.log('[AuthService] Login successful:', data);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Transform backend user to frontend User type
      const user = data.user ? {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.name || data.user.email,
        status: 'active' as const,
        roles: data.user.roles || [],
        department_id: data.user.department?.id,
        department_name: data.user.department?.name,
      } : undefined;

      return {
        success: true,
        user,
        token: data.token,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('[AuthService] Network error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
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