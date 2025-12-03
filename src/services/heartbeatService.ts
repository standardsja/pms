/**
 * Heartbeat Service
 * Sends periodic heartbeat signals to track active user sessions per module
 */

import { getToken } from '../utils/auth';

type ModuleType = 'pms' | 'ih';

class HeartbeatService {
    private intervalId: NodeJS.Timeout | null = null;
    private currentModule: ModuleType | null = null;
    private readonly HEARTBEAT_INTERVAL = 45000; // 45 seconds

    /**
     * Start sending heartbeat signals for a specific module
     */
    startHeartbeat(module: ModuleType): void {
        // Stop existing heartbeat if any
        this.stopHeartbeat();

        this.currentModule = module;

        // Send initial heartbeat immediately
        this.sendHeartbeat(module);

        // Set up periodic heartbeat
        this.intervalId = setInterval(() => {
            this.sendHeartbeat(module);
        }, this.HEARTBEAT_INTERVAL);
    }

    /**
     * Stop sending heartbeat signals
     */
    stopHeartbeat(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Clear session on backend
        if (this.currentModule) {
            this.clearSession();
        }

        this.currentModule = null;
    }

    /**
     * Send a single heartbeat signal to the backend
     */
    private async sendHeartbeat(module: ModuleType): Promise<void> {
        try {
            const apiUrl = import.meta.env.DEV ? '/api/stats/heartbeat' : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/stats/heartbeat`;

            const token = getToken();
            console.log('[Heartbeat] Sending heartbeat for module:', module, 'URL:', apiUrl, 'Has token:', !!token);

            if (!token) {
                console.warn('[Heartbeat] No auth token available, skipping heartbeat');
                return;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ module }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn('[Heartbeat] Failed:', response.status, errorText);
            } else {
                const data = await response.json();
                console.log('[Heartbeat] Success:', data);
            }
        } catch (error) {
            console.error('[Heartbeat] Error:', error);
        }
    }

    /**
     * Get the currently tracked module
     */
    getCurrentModule(): ModuleType | null {
        return this.currentModule;
    }

    /**
     * Clear session on backend (called on logout or navigation away)
     */
    private async clearSession(): Promise<void> {
        try {
            const apiUrl = import.meta.env.DEV ? '/api/stats/heartbeat' : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/stats/heartbeat`;

            const token = getToken();

            await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
            });

            console.log('[Heartbeat] Session cleared on backend');
        } catch (error) {
            console.debug('[Heartbeat] Error clearing session:', error);
        }
    }
}

// Export singleton instance
export const heartbeatService = new HeartbeatService();
export type { ModuleType };
