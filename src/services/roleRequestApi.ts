/**
 * Role Request API Service
 * Frontend API client for role requests
 */

import { getApiUrl } from '../config/api';
import authService from './authService';

export interface RoleRequest {
    id: number;
    userId: number;
    role: string;
    module: string;
    departmentId?: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    reason?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    expiresAt?: string;
    approvedBy?: {
        id: number;
        email: string;
        name: string;
    };
    department?: {
        id: number;
        name: string;
    };
    user?: {
        id: number;
        email: string;
        name: string;
    };
}

export interface CreateRoleRequestInput {
    role: string;
    module: string;
    departmentId?: number;
    reason?: string;
}

export interface ApproveRoleRequestInput {
    notes?: string;
    expiresAt?: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
        ...options.headers,
    };

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
}

export class RoleRequestService {
    private readonly baseUrl = getApiUrl('/api/role-requests');

    /**
     * Submit a role request
     */
    async submitRoleRequest(data: CreateRoleRequestInput): Promise<RoleRequest> {
        try {
            const response = await fetchWithAuth(this.baseUrl, {
                method: 'POST',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Failed to submit role request: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to submit role request:', error);
            throw error;
        }
    }

    /**
     * Get all pending role requests (admin only)
     */
    async getPendingRequests(filters?: { status?: string; module?: string; departmentId?: number }): Promise<RoleRequest[]> {
        try {
            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.module) params.append('module', filters.module);
            if (filters?.departmentId) params.append('departmentId', filters.departmentId.toString());

            const url = `${this.baseUrl}?${params.toString()}`;
            const response = await fetchWithAuth(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch pending requests: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to fetch pending requests:', error);
            throw error;
        }
    }

    /**
     * Get user's own role requests
     */
    async getMyRequests(): Promise<RoleRequest[]> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/my-requests`);

            if (!response.ok) {
                throw new Error(`Failed to fetch my requests: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to fetch my requests:', error);
            throw error;
        }
    }

    /**
     * Get a specific role request
     */
    async getRoleRequest(id: number): Promise<RoleRequest> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/${id}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch role request: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to fetch role request:', error);
            throw error;
        }
    }

    /**
     * Approve a role request (admin only)
     */
    async approveRequest(id: number, input: ApproveRoleRequestInput): Promise<RoleRequest> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/${id}/approve`, {
                method: 'PUT',
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                throw new Error(`Failed to approve role request: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to approve role request:', error);
            throw error;
        }
    }

    /**
     * Reject a role request (admin only)
     */
    async rejectRequest(id: number, notes: string): Promise<RoleRequest> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/${id}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ notes }),
            });

            if (!response.ok) {
                throw new Error(`Failed to reject role request: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to reject role request:', error);
            throw error;
        }
    }

    /**
     * Cancel a role request (user cancels their own)
     */
    async cancelRequest(id: number): Promise<RoleRequest> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/${id}/cancel`, {
                method: 'PUT',
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error(`Failed to cancel role request: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to cancel role request:', error);
            throw error;
        }
    }

    /**
     * Check if user has approved access to a role/module
     */
    async checkAccess(role: string, module: string): Promise<boolean> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/check-access/${role}/${module}`);

            if (!response.ok) {
                return false;
            }

            const result = await response.json();
            return result.hasAccess;
        } catch (error) {
            console.error('Failed to check access:', error);
            return false;
        }
    }

    /**
     * Get admin dashboard statistics
     */
    async getDashboardStats(): Promise<any> {
        try {
            const response = await fetchWithAuth(`${this.baseUrl}/stats/dashboard`);

            if (!response.ok) {
                throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            throw error;
        }
    }
}

export const roleRequestService = new RoleRequestService();
