/**
 * Stats Service
 * Handles fetching system and dashboard statistics
 */

import { getApiUrl } from '../config/api';
import { getAuthHeadersSync } from '../utils/api';

export interface SystemStats {
    activeUsers: number;
    requestsThisMonth: number;
    innovationIdeas: number;
    pendingApprovals: number;
    systemUptime: number;
    totalProcessedRequests: number;
    timestamp: string;
}

export interface DashboardStats {
    activeUsers: number;
    requestsThisMonth: number;
    innovationIdeas: number;
    pendingApprovals: number;
    timestamp: string;
    pendingEvaluations?: number;
    activePOs?: number;
    activeContracts?: number;
    totalSuppliers?: number;
    catalogItems?: number;
    procurementReviews?: number;
    workflowTemplates?: number;
    monthlyReports?: number;
}

class StatsService {
    /**
     * Get system-wide statistics (public endpoint, no auth required)
     * Used for login/onboarding screens
     */
    async getSystemStats(): Promise<SystemStats> {
        try {
            // In development, use relative URL to leverage Vite proxy
            // In production, use full API URL
            const url = import.meta.env.DEV ? '/api/stats/system' : getApiUrl('/api/stats/system');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch system stats: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching system stats:', error);
            // Return fallback data if API fails
            return {
                activeUsers: 0,
                requestsThisMonth: 0,
                innovationIdeas: 0,
                pendingApprovals: 0,
                systemUptime: 99.9,
                totalProcessedRequests: 0,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Get dashboard statistics (requires authentication)
     */
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            // In development, use relative URL to leverage Vite proxy
            // In production, use full API URL
            const url = import.meta.env.DEV ? '/api/stats/dashboard' : getApiUrl('/api/stats/dashboard');

            const headers = getAuthHeadersSync();

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }
}

export const statsService = new StatsService();
