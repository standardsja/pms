/**
 * Heartbeat Service
 * Sends periodic heartbeat signals to track active user sessions per module
 */

import { getToken } from '../utils/auth';
import { getApiUrl } from '../config/api';

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
            const apiUrl = getApiUrl('/api/stats/heartbeat');

            const token = getToken();

            if (!token) {
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
            }
        } catch (error) {
            // Silent fail
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
            const apiUrl = getApiUrl('/api/stats/heartbeat');

            const token = getToken();

            await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
            });
        } catch (error) {
            // Silent fail
        }
    }
}

// Export singleton instance
export const heartbeatService = new HeartbeatService();
export type { ModuleType };
