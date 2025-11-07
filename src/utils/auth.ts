// Centralized auth helpers for token/user storage with optional "remember me"

export type AuthUser = { 
  id: string; 
  email: string; 
  name?: string | null; 
  role?: string;
  roles?: string[];
};

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const REMEMBER_KEY = 'remember_me';

export function setAuth(token: string, user: AuthUser, remember: boolean) {
  try {
    // Persist remember flag in localStorage only
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);

    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));

    // Ensure the other store is cleared to avoid stale reads
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  } catch {
    // ignore storage errors
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch {}
}

export function getToken(): string | null {
  try {
    // Prefer sessionStorage (active login) over localStorage to avoid stale remembered sessions
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;
    const remembered = localStorage.getItem(REMEMBER_KEY) === '1';
    if (remembered) return localStorage.getItem(TOKEN_KEY);
    // fallback if flag missing but token present
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getUser(): AuthUser | null {
  try {
    // Prefer sessionStorage (active login)
    const sessionRaw = sessionStorage.getItem(USER_KEY);
    if (sessionRaw) return JSON.parse(sessionRaw) as AuthUser;
    const remembered = localStorage.getItem(REMEMBER_KEY) === '1';
    if (remembered) {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    }
    // fallback: if remember flag missing but local user exists
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isRemembered(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
}
