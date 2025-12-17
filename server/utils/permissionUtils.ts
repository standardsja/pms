import { Prisma } from '@prisma/client';

type UserWithRolesAndDepartment = {
    id: number;
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    failedLogins?: number | null;
    lastFailedLogin?: Date | null;
    lastLogin?: Date | null;
    blocked?: boolean | null;
    blockedAt?: Date | null;
    blockedReason?: string | null;
    department?: { id: number; name: string; code: string | null } | null;
    roles: Array<{ role: { id: number; name: string } }> | Array<{ name: string }>;
};

// Minimal, additive mapping from role names to permission strings.
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
    ADMIN: ['ADMIN'],
    REQUESTER: ['CREATE_REQUEST', 'VIEW_REQUESTS'],
    FINANCE: ['VIEW_FINANCE', 'VIEW_REQUESTS'],
    FINANCE_OFFICER: ['VIEW_FINANCE', 'VIEW_REQUESTS'],
    FINANCE_MANAGER: ['VIEW_FINANCE', 'APPROVE_PAYMENTS'],
    PROCUREMENT: ['VIEW_PROCUREMENT', 'VIEW_REQUESTS'],
    PROCUREMENT_MANAGER: ['VIEW_PROCUREMENT', 'APPROVE_REQUESTS'],
    DEPARTMENT_MANAGER: ['APPROVE_REQUESTS'],
    HOD: ['APPROVE_REQUESTS'],
};

export function computePermissionsForUser(user: UserWithRolesAndDepartment) {
    const perms = new Set<string>();

    // Basic authenticated permission
    perms.add('AUTHENTICATED');

    const roleNames: string[] = (user.roles || []).map((r: any) => (r.role ? r.role.name : r.name));

    for (const rn of roleNames) {
        if (!rn) continue;

        // Direct mapping
        const mapped = ROLE_PERMISSION_MAP[rn];
        if (mapped) mapped.forEach((p) => perms.add(p));

        // Generic matches
        if (rn === 'ADMIN') perms.add('ADMIN');

        // Any role that includes 'MANAGER' should get approve perms
        if (/MANAGER/.test(rn) || /DEPT_MANAGER/.test(rn)) {
            perms.add('APPROVE_REQUESTS');
        }

        // Finance detection
        if (/FINANCE/.test(rn)) {
            perms.add('VIEW_FINANCE');
        }

        // Procurement detection
        if (/PROCURE|PROCUREMENT/.test(rn)) {
            perms.add('VIEW_PROCUREMENT');
        }
    }

    return Array.from(perms);
}

export function computeDeptManagerForUser(user: UserWithRolesAndDepartment) {
    const roleNames: string[] = (user.roles || []).map((r: any) => (r.role ? r.role.name : r.name));
    const managed: string[] = [];

    for (const rn of roleNames) {
        if (!rn) continue;

        // Match patterns like PROCUREMENT_DEPT_MANAGER -> procurement
        const m = rn.match(/^([A-Z]+)_DEPT_MANAGER$/);
        if (m) {
            managed.push(m[1].toLowerCase());
            continue;
        }

        // If generic DEPARTMENT_MANAGER and user has department, include that department code
        if (rn === 'DEPARTMENT_MANAGER' || rn === 'DEPT_MANAGER' || rn === 'HOD') {
            if (user.department && user.department.code) {
                managed.push(user.department.code.toLowerCase());
            }
        }
    }

    // Deduplicate
    return Array.from(new Set(managed));
}

export default {
    computePermissionsForUser,
    computeDeptManagerForUser,
};
