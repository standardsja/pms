// src/auth/localAuthProvider.ts
// Wrap existing authService logic to fulfil AuthProvider without changing current behavior
import { LoginCredentials, AuthResponse } from '../types/auth';
import authService from '../services/authService';
import { AuthProvider } from './authProvider';

class LocalAuthProvider implements AuthProvider {
  mode: 'LOCAL' = 'LOCAL';
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return authService.login(credentials);
  }
  async logout(): Promise<void> {
    return authService.logout();
  }
  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  getUserSnapshot(): any {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
}

export const localAuthProvider = new LocalAuthProvider();
