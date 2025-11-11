// src/auth/msalConfig.ts
// MSAL configuration scaffold (not imported anywhere by default)

export const AAD_CONFIG = {
  clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID,
  authority: import.meta.env.VITE_AZURE_AD_AUTHORITY,
  redirectUri: window.location.origin + '/auth/callback',
  scopes: (import.meta.env.VITE_AZURE_AD_SCOPES || 'openid profile email').split(/[ ,]+/).filter(Boolean),
};

export const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || 'LOCAL') as 'LOCAL' | 'AAD';
