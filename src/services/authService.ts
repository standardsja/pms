// Client-side auth service: use mock service only (no DB/backend integration)
import { LoginCredentials, AuthResponse } from '../types/auth';
import mockAuthService from './mockAuthService';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const result = await mockAuthService.login(credentials);
    if (result.success && result.token) {
      localStorage.setItem('token', result.token);
    }
    return result;
  }

  async verifyToken(token?: string): Promise<AuthResponse> {
    const t = token || localStorage.getItem('token');
    if (!t) return { success: false, message: 'No authentication token found' };
    return mockAuthService.verifyToken(t);
  }

  async logout(): Promise<void> {
    await mockAuthService.logout();
    localStorage.removeItem('token');
  }

  async refreshToken(): Promise<AuthResponse> {
    return mockAuthService.refreshToken();
  }

  getAuthHeaders(): Record<string, string> {
    return mockAuthService.getAuthHeaders();
  }

  isAuthenticated(): boolean {
    return mockAuthService.isAuthenticated();
  }
}

export default new AuthService();