// Centralized app version helper for frontend
// Prefer environment variable injected at build time; fallback to package version if defined via Vite define

export function getAppVersion(): string {
    const envVersion = (import.meta as any).env?.VITE_APP_VERSION as string | undefined;
    // __APP_VERSION__ can be defined via vite.config.ts define if desired
    const definedVersion = (globalThis as any).__APP_VERSION__ as string | undefined;
    return envVersion || definedVersion || 'dev';
}
