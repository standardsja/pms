// src/services/adminService.ts
// Admin API client for server/index.mjs admin endpoints

export type AdminUser = {
  id: number;
  email: string;
  name?: string | null;
  department?: { id: number; name: string; code: string } | null;
  roles?: { role: { id: number; name: string; description?: string | null } }[];
};

export type CreateDepartmentInput = {
  name: string;
  code: string;
  managerId?: number | null;
};

export type AuditQuery = {
  startDate?: string; // ISO
  endDate?: string;   // ISO
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

async function apiGet<T = any>(path: string): Promise<T> {
  const uid = getCurrentUserId();
  const res = await fetch(path, {
    headers: {
      'x-user-id': uid ? String(uid) : '',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `GET ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const uid = getCurrentUserId();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': uid ? String(uid) : '',
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

const BACKEND = {
  getUsers: (): Promise<AdminUser[]> => apiGet('/admin/users'),
  createDepartment: (input: CreateDepartmentInput) => apiPost('/admin/departments', input),
  updateUserRoles: (userId: number, roles: string[]) => apiPost(`/admin/users/${userId}/roles`, { roles }),
  getAuditLog: (q: AuditQuery) => {
    const params = new URLSearchParams();
    if (q.startDate) params.set('startDate', q.startDate);
    if (q.endDate) params.set('endDate', q.endDate);
    if (q.userId) params.set('userId', String(q.userId));
    return apiGet(`/admin/audit-log?${params.toString()}`);
  },
};

export const ADMIN_ROLE_NAMES = [
  'ADMIN',
  'REQUESTER',
  'DEPT_MANAGER',
  'HEAD_OF_DIVISION',
  'PROCUREMENT',
  'FINANCE',
];

export default BACKEND;
