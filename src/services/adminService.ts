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
import { getAuthHeadersSync } from '../utils/api';

const API_BASE = getApiBaseUrl();
// Decide whether to prefix; if API_BASE provided and path is relative, join.
function buildUrl(path: string) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (API_BASE) return API_BASE.replace(/\/$/, '') + path;
    return path; // rely on Vite proxy if no base set
}

async function apiGet<T = any>(path: string): Promise<T> {
    const url = buildUrl(path);
    const headers = getAuthHeadersSync();
    const res = await fetch(url, { headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `GET ${url} failed: ${res.status}`);
    }
    return res.json();
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
    const url = buildUrl(path);
    const headers = getAuthHeadersSync();
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) {
        const text = await res.text();
        let errorMessage = `POST ${url} failed: ${res.status}`;
        try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

async function apiPut<T = any>(path: string, body: any): Promise<T> {
    const url = buildUrl(path);
    const headers = getAuthHeadersSync();
    const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) {
        const text = await res.text();
        let errorMessage = `PUT ${url} failed: ${res.status}`;
        try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

async function apiDelete<T = any>(path: string): Promise<T> {
    const url = buildUrl(path);
    const headers = getAuthHeadersSync();
    const res = await fetch(url, {
        method: 'DELETE',
        headers,
    });
    if (!res.ok) {
        const text = await res.text();
        let errorMessage = `DELETE ${url} failed: ${res.status}`;
        try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

export interface RoleOption {
    id: number;
    name: string;
    description?: string;
}

const BACKEND = {
    // User Management
    getUsers: (): Promise<AdminUser[]> => apiGet('/api/admin/users'),
    updateUserRoles: (userId: number, roles: string[]) => apiPost(`/api/admin/users/${userId}/roles`, { roles }),
    updateUserDepartment: (userId: number, departmentId: number | null) => apiPost(`/api/admin/users/${userId}/department`, { departmentId }),

    // User Security
    blockUser: (userId: number, reason: string) => apiPost(`/api/admin/users/${userId}/block`, { reason }),
    unblockUser: (userId: number) => apiPost(`/api/admin/users/${userId}/unblock`, {}),

    // Role Management
    getAllRoles: (): Promise<RoleOption[]> => apiGet('/api/admin/roles'),
    createRole: (data: { name: string; description?: string }) => apiPost('/api/admin/roles', data),
    updateRole: (roleId: number, data: { name: string; description?: string }) => apiPut(`/api/admin/roles/${roleId}`, data),
    deleteRole: (roleId: number) => apiDelete(`/api/admin/roles/${roleId}`),
    getRolePermissions: (roleId: number) => apiGet(`/api/admin/roles/${roleId}/permissions`),
    assignPermissionsToRole: (roleId: number, permissionNames: string[]) => apiPost(`/api/admin/roles/${roleId}/permissions`, { permissionNames }),

    // Department Management
    getDepartments: () => apiGet('/api/admin/departments'),
    createDepartment: (input: CreateDepartmentInput) => apiPost('/api/admin/departments', input),

    // Permission Management
    getPermissions: () => apiGet('/api/admin/permissions'),

    // Workflow Configuration
    getWorkflowStatuses: () => apiGet('/api/admin/workflow-statuses'),
    createWorkflowStatus: (data: { statusId: string; name: string; description?: string; color?: string; icon?: string; displayOrder?: number }) => apiPost('/api/admin/workflow-statuses', data),
    updateWorkflowStatus: (id: number, data: Partial<{ name: string; description: string; color: string; icon: string; displayOrder: number; isActive: boolean }>) =>
        apiPut(`/api/admin/workflow-statuses/${id}`, data),
    deleteWorkflowStatus: (id: number) => apiDelete(`/api/admin/workflow-statuses/${id}`),

    getWorkflowSLAs: () => apiGet('/api/admin/workflow-slas'),
    createWorkflowSLA: (data: { slaId: string; name: string; description?: string; fromStatus: string; toStatus: string; slaHours: number }) => apiPost('/api/admin/workflow-slas', data),
    updateWorkflowSLA: (id: number, data: Partial<{ name: string; description: string; fromStatus: string; toStatus: string; slaHours: number; isActive: boolean }>) =>
        apiPut(`/api/admin/workflow-slas/${id}`, data),
    deleteWorkflowSLA: (id: number) => apiDelete(`/api/admin/workflow-slas/${id}`),

    // System Configuration
    getSystemConfig: () => apiGet('/api/admin/system-config'),
    updateSystemConfig: (data: any) => apiPost('/api/admin/system-config', data),

    // Module Locks
    getModuleLocks: () => apiGet('/api/admin/module-locks'),
    updateModuleLock: (moduleKey: string, data: { locked: boolean; reason?: string }) => apiPost(`/api/admin/module-locks/${moduleKey}`, data),

    // Bulk Operations
    bulkImportUsers: (csvContent: string) => apiPost('/api/admin/bulk-import', { csvContent }),
    bulkAssignRole: (userIds: number[], roleId: number) => apiPost('/api/admin/bulk-role-assignment', { userIds, roleId }),
    bulkChangeDepartment: (userIds: number[], departmentId: number) => apiPost('/api/admin/bulk-department-change', { userIds, departmentId }),
    bulkDeactivateUsers: (userIds: number[], reason?: string) => apiPost('/api/admin/bulk-deactivate', { userIds, reason }),
    bulkPasswordReset: (userIds: number[]) => apiPost('/api/admin/bulk-password-reset', { userIds }),

    // Splintering Rules
    getSplinteringRules: () => apiGet('/api/admin/splintering-rules'),
    createSplinteringRule: (data: any) => apiPost('/api/admin/splintering-rules', data),
    updateSplinteringRule: (ruleId: number, data: any) => apiPut(`/api/admin/splintering-rules/${ruleId}`, data),
    deleteSplinteringRule: (ruleId: number) => apiDelete(`/api/admin/splintering-rules/${ruleId}`),
    toggleSplinteringRule: (ruleId: number) => apiPost(`/api/admin/splintering-rules/${ruleId}/toggle`, {}),

    // Audit & Monitoring
    getAuditLog: (q: AuditQuery) => {
        const params = new URLSearchParams();
        if (q.startDate) params.set('startDate', q.startDate);
        if (q.endDate) params.set('endDate', q.endDate);
        if (q.userId) params.set('userId', String(q.userId));
        const suffix = params.toString();
        return apiGet(`/api/admin/audit-log${suffix ? `?${suffix}` : ''}`);
    },

    // Load Balancing
    getLoadBalancingSettings: () => apiGet('/api/admin/load-balancing-settings'),
    updateLoadBalancingSettings: (payload: { splinteringEnabled?: boolean }) => apiPost('/api/admin/load-balancing-settings', payload),

    // Navigation Menu Management
    getNavigationMenus: () => apiGet('/api/admin/navigation-menus'),
    createNavigationMenu: (data: any) => apiPost('/api/admin/navigation-menus', data),
    updateNavigationMenu: (id: number, data: any) => apiPut(`/api/admin/navigation-menus/${id}`, data),
    deleteNavigationMenu: (id: number) => apiDelete(`/api/admin/navigation-menus/${id}`),

    // Request Management
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
