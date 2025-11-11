import { PublicClientApplication, type AuthenticationResult } from '@azure/msal-browser';

export const isMsalConfigured = !!(
  import.meta.env.VITE_AZURE_CLIENT_ID && 
  import.meta.env.VITE_AZURE_TENANT_ID
);

let msalInstance: PublicClientApplication | null = null;

function getMsalInstance(): PublicClientApplication {
  if (!isMsalConfigured) {
    throw new Error('MSAL is not configured');
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication({
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
    });
  }

  return msalInstance;
}

export async function initializeMsal(): Promise<void> {
  if (!isMsalConfigured) return;
  
  const instance = getMsalInstance();
  await instance.initialize();
  await instance.handleRedirectPromise();
}

export async function loginWithMicrosoft(): Promise<AuthenticationResult> {
  const instance = getMsalInstance();
  
  try {
    return await instance.loginPopup({
      scopes: ['openid', 'profile', 'email'],
    });
  } catch (error) {
    console.warn('Popup blocked, redirecting...', error);
    await instance.loginRedirect({
      scopes: ['openid', 'profile', 'email'],
    });
    throw new Error('Redirecting to Microsoft login...');
  }
}
