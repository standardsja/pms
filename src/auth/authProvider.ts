// src/auth/authProvider.ts
// Common interface for pluggable auth strategies (LOCAL, AAD)

import { LoginCredentials, AuthResponse } from '../types/auth';

export interface AuthProvider {
  mode: 'LOCAL' | 'AAD';
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getToken(): string | null; // access or legacy token
  getUserSnapshot(): any; // raw user info (shape depends on mode)
}
