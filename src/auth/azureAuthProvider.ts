// src/auth/azureAuthProvider.ts
// Placeholder Azure AD provider (non-breaking). Real MSAL logic can be added later.
import { LoginCredentials, AuthResponse } from '../types/auth';
import { AuthProvider } from './authProvider';

class AzureAuthProvider implements AuthProvider {
  mode: 'AAD' = 'AAD';
  async login(_credentials: LoginCredentials): Promise<AuthResponse> {
    // Non-breaking stub: instruct user to use SSO button (to be implemented)
    return {
      success: false,
      message: 'Azure AD mode stub: initiate SSO via dedicated button (not yet implemented).',
    };
  }
  async logout(): Promise<void> {
    // Future: msalInstance.logoutRedirect()
    localStorage.removeItem('token');
  }
  isAuthenticated(): boolean {
    // Future: check msal account length
    return false;
  }
  getToken(): string | null {
    // Placeholder: real implementation would return access token
    return null;
  }
  getUserSnapshot(): any {
    return null;
  }
}

export const azureAuthProvider = new AzureAuthProvider();
