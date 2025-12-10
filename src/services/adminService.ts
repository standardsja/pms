// src/services/adminService.ts
// Admin API client for server/index.mjs admin endpoints

export type AdminUser = {
    id: number;
    email: string;
    name?: string | null;
    department?: { id: number; name: string; code: string } | null;
    roles?: { role: { id: number; name: string; description?: string | null } }[];
    // User Security fields
    blocked?: boolean | null;
    blockedAt?: string | null;
    blockedReason?: string | null;
    blockedBy?: number | null;
    lastLogin?: string | null;
    failedLogins?: number | null;
    lastFailedLogin?: string | null;
};

export type CreateDepartmentInput = {
    name: string;
    code: string;
    managerId?: number | null;
};

export type AuditQuery = {
    startDate?: string; // ISO
    endDate?: string; // ISO
    userId?: number;
};

function getCurrentUserId(): number | null {
    try {
        // Try modern storage first
        const authRaw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
        if (authRaw) {
            const u = JSON.parse(authRaw);
            if (u?.id) return Number(u.id);
        }
        // Fallback to legacy userProfile
        const legacy = localStorage.getItem('userProfile');
        if (legacy) {
            const u = JSON.parse(legacy);
            if (u?.id) return Number(u.id);
            if (u?.userId) return Number(u.userId);
        }
    } catch {}
    return null;
}

import { getApiBaseUrl } from '../config/api';
import { getAuthHeaders } from '../utils/api';

const API_BASE = getApiBaseUrl();
// Decide whether to prefix; if API_BASE provided and path is relative, join.
function buildUrl(path: string) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (API_BASE) return API_BASE.replace(/\/$/, '') + path;
    return path; // rely on Vite proxy if no base set
}

async function apiGet<T = any>(path: string): Promise<T> {
    const url = buildUrl(path);
    const headers = getAuthHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `GET ${url} failed: ${res.status}`);
    }
    return res.json();
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
    const url = buildUrl(path);
    const headers = getAuthHeaders();
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `POST ${url} failed: ${res.status}`);
    }
    return res.json();
}

export interface RoleOption {
    id: number;
    name: string;
    description?: string;
}

const BACKEND = {
    getUsers: (): Promise<AdminUser[]> => apiGet('/api/admin/users'),
    getAllRoles: (): Promise<RoleOption[]> => apiGet('/api/admin/roles'),
    createDepartment: (input: CreateDepartmentInput) => apiPost('/api/admin/departments', input),
    // Admin load-balancing (splintering) endpoints
    getLoadBalancingSettings: () => apiGet('/api/admin/load-balancing-settings'),
    updateLoadBalancingSettings: (payload: { splinteringEnabled?: boolean }) => apiPost('/api/admin/load-balancing-settings', payload),
    updateUserRoles: (userId: number, roles: string[]) => apiPost(`/api/admin/users/${userId}/roles`, { roles }),
    updateUserDepartment: (userId: number, departmentId: number | null) => apiPost(`/api/admin/users/${userId}/department`, { departmentId }),
    // User Security endpoints
    blockUser: (userId: number, reason: string) => apiPost(`/api/admin/users/${userId}/block`, { reason }),
    unblockUser: (userId: number) => apiPost(`/api/admin/users/${userId}/unblock`, {}),
    getAuditLog: (q: AuditQuery) => {
        const params = new URLSearchParams();
        if (q.startDate) params.set('startDate', q.startDate);
        if (q.endDate) params.set('endDate', q.endDate);
        if (q.userId) params.set('userId', String(q.userId));
        const suffix = params.toString();
        return apiGet(`/api/admin/audit-log${suffix ? `?${suffix}` : ''}`);
    },
    // Reassign a request to another user (admin action)
    reassignRequest: (requestId: number, payload: { assigneeId: number | null; comment?: string; newStatus?: string }) => apiPost(`/api/admin/requests/${requestId}/reassign`, payload),
};

// Fallback hardcoded roles if API fails
export const ADMIN_ROLE_NAMES = [
    'ADMIN',
    'REQUESTER',
    'DEPT_MANAGER',
    'HEAD_OF_DIVISION',
    'PROCUREMENT_MANAGER',
    'PROCUREMENT_OFFICER',
    'PROCUREMENT',
    'FINANCE',
    'EVALUATION_COMMITTEE',
    'INNOVATION_COMMITTEE',
];

export default BACKEND;
