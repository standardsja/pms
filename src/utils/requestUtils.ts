/**
 * requestUtils - Domain utilities for procurement requests
 *
 * Purpose:
 * - Centralize common helpers used across Requests list and Request form
 * - Keep code DRY and typed
 */

import { Request, RequestItem } from '../types/request.types';

/**
 * Format a number as currency using Intl API
 */
export const formatCurrency = (amount: number, currency = 'USD', locale = 'en-US'): string => {
    if (!isFinite(amount)) return '$0.00';
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    } catch {
        // Fallback
        return `$${amount.toFixed(2)}`;
    }
};

/**
 * Calculate the total estimated cost from items
 */
export const calculateTotalEstimated = (items: RequestItem[]): number => {
    return items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice || 0), 0);
};

/**
 * Basic email validation
 */
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string): boolean => emailRegex.test(email);

/**
 * Format a file size in B/KB/MB
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Format a date string for display
 */
export const formatDate = (dateStr: string, locale = 'en-US', options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' }): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // fallback to raw if invalid
    return new Intl.DateTimeFormat(locale, options).format(d);
};

/**
 * Safely parse localStorage JSON value
 */
export const getLocalStorageJSON = <T = any>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

/**
 * Normalize status casing (e.g., convert to Title Case)
 */
export const normalizeStatus = (status: string): string => {
    if (!status) return status;
    const s = String(status)
        .replace(/[_-]+/g, ' ') // handle ENUM_STYLE and kebab-case
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim()
        .toLowerCase();
    return s
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(' ');
};

/**
 * Search requests by several fields
 */
export const searchRequests = (requests: Request[], query: string): Request[] => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.department.toLowerCase().includes(q));
};

/**
 * Apply status/department filters
 */
export const filterRequests = (requests: Request[], opts: { status?: string; department?: string }): Request[] => {
    const { status, department } = opts;
    const wanted = normalizeStatus(status || '');
    const wantDept = (department || '').trim();
    return requests.filter((r) => {
        const rs = normalizeStatus(r.status);
        const rd = (r.department || '').trim();
        return (!wanted || rs === wanted) && (!wantDept || rd === wantDept);
    });
};

/**
 * Limit results to current user
 */
export const onlyMine = (requests: Request[], currentUserName?: string): Request[] => {
    if (!currentUserName) return requests;
    return requests.filter((r) => r.requester === currentUserName);
};

/**
 * Simple client-side pagination
 */
export const paginate = <T>(data: T[], page: number, pageSize: number): T[] => {
    const start = Math.max(0, (page - 1) * pageSize);
    return data.slice(start, start + pageSize);
};

/**
 * Sort requests by date descending (newest first). Falls back gracefully if date is invalid.
 */
export const sortRequestsByDateDesc = (requests: Request[]): Request[] => {
    return [...requests].sort((a, b) => {
        const ta = new Date(a.date).getTime();
        const tb = new Date(b.date).getTime();
        if (isNaN(ta) && isNaN(tb)) return 0;
        if (isNaN(ta)) return 1;
        if (isNaN(tb)) return -1;
        return tb - ta;
    });
};

/**
 * Adapt various backend response shapes into our Request[] model.
 * Accepts either an array, or an object with a `data` array.
 * Handles common field aliases and nested requester/department objects.
 */
export const adaptRequestsResponse = (input: unknown): Request[] => {
    const raw = Array.isArray(input) ? input : input && typeof input === 'object' && Array.isArray((input as any).data) ? (input as any).data : [];
    if (!Array.isArray(raw)) return [];

    const toStr = (v: any): string => (v == null ? '' : String(v));
    const getName = (obj: any): string => {
        if (!obj || typeof obj !== 'object') return toStr(obj);
        return toStr(obj.name ?? obj.fullName ?? obj.displayName ?? obj.username ?? '');
    };

    const pickId = (r: any): string => toStr(r.id ?? r.requestId ?? r.request_id ?? r.code ?? r.uuid ?? '');
    const pickTitle = (r: any): string => toStr(r.title ?? r.subject ?? r.name ?? '');
    const pickRequester = (r: any): string => getName(r.requester ?? r.createdBy ?? r.created_by ?? r.owner);
    const pickDepartment = (r: any): string => getName(r.department ?? r.dept ?? r.department_name ?? r.dept_name);
    const pickStatus = (r: any): string => normalizeStatus(toStr(r.status ?? r.state ?? r.stage ?? ''));
    const pickDate = (r: any): string => toStr(r.date ?? r.createdAt ?? r.created_at ?? r.submittedAt ?? r.submitted_at ?? '');
    const pickItems = (r: any): RequestItem[] => (Array.isArray(r.items ?? r.lines) ? r.items ?? r.lines : []);
    const pickJustification = (r: any): string => toStr(r.justification ?? r.reason ?? r.purpose ?? '');
    const pickTotal = (r: any, items: RequestItem[]): number => {
        const t = r.totalEstimated ?? r.total_estimated ?? r.total ?? r.amount;
        if (t != null && !isNaN(Number(t))) return Number(t);
        return calculateTotalEstimated(items);
    };
    const pickAssigneeId = (r: any): number | null => {
        const v = r.currentAssigneeId ?? r.current_assignee_id ?? r.assigneeId ?? r.assignee_id ?? r.currentAssignee?.id;
        return v == null ? null : Number(v);
    };
    const pickAssigneeName = (r: any): string => {
        const v = r.currentAssignee?.name ?? r.currentAssigneeName ?? r.assigneeName ?? r.assignee_name;
        return toStr(v);
    };
    const pickProcurementType = (r: any): string[] => {
        const pt = r.procurementType ?? r.procurement_type ?? r.category ?? r.type;
        if (Array.isArray(pt)) return pt.map(toStr);
        if (pt != null) return [toStr(pt)];
        return [];
    };

    return raw.map((r: any): Request => {
        const items = pickItems(r);
        return {
            id: pickId(r),
            title: pickTitle(r),
            requester: pickRequester(r),
            department: pickDepartment(r),
            status: pickStatus(r),
            date: pickDate(r),
            items,
            totalEstimated: pickTotal(r, items),
            fundingSource: r.fundingSource ?? r.funding_source,
            budgetCode: r.budgetCode ?? r.budget_code,
            procurementType: pickProcurementType(r),
            currency: toStr(r.currency ?? 'JMD'),
            currentAssigneeId: pickAssigneeId(r),
            currentAssigneeName: pickAssigneeName(r),
            justification: pickJustification(r),
            comments: Array.isArray(r.comments) ? r.comments : [],
            statusHistory: Array.isArray(r.statusHistory ?? r.status_history) ? r.statusHistory ?? r.status_history : [],
        };
    });
};
