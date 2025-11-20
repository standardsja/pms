import type { Idea, IdeaCounts } from '../types/idea';

// Helper to get auth token (adjust if your app stores it differently)
function getAuthToken(): string | null {
    try {
        const raw = localStorage.getItem('auth');
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed?.token || parsed?.accessToken || null;
        }
    } catch {}
    return null;
}

function apiBase(): string {
    return 'http://heron:4000';
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
    const base = apiBase();
    const url = new URL(path.replace(/^\//, ''), base || window.location.origin + '/');
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') return;
            url.searchParams.set(k, String(v));
        });
    }
    return url.toString();
}

async function request<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
    };
    const res = await fetch(input, { ...init, headers, credentials: 'include' });
    const text = await res.text();
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? (text ? JSON.parse(text) : undefined) : (text as unknown as T);
    if (!res.ok) {
        const err = (data as any)?.error || {};
        const message = err.message || (typeof data === 'string' ? data : res.statusText) || 'Request failed';
        const code = err.code || res.status;
        throw Object.assign(new Error(message), { code, details: err.details, status: res.status });
    }
    return (isJson ? data : ({} as any)) as T;
}

export type FetchIdeasParams = Partial<{
    status: 'pending' | 'approved' | 'rejected' | 'promoted' | string;
    sort: 'popularity' | 'recent' | string;
    q: string;
    category: string;
    submitter: string;
    dateFrom: string;
    dateTo: string;
    minScore: number;
    page: number;
    perPage: number;
}>;

export async function fetchIdeas(params?: FetchIdeasParams): Promise<Idea[]> {
    const query: Record<string, any> = {};
    if (params) {
        const mapStatus: Record<string, string> = {
            pending: 'PENDING',
            approved: 'APPROVED',
            rejected: 'REJECTED',
            promoted: 'PROMOTED',
        };
        if (params.status) query.status = mapStatus[params.status] || params.status;
        if (params.sort) query.sort = params.sort;
        if (params.q) query.q = params.q;
        if (params.category) query.category = params.category;
        if (params.submitter) query.submitter = params.submitter;
        if (params.dateFrom) query.dateFrom = params.dateFrom;
        if (params.dateTo) query.dateTo = params.dateTo;
        if (params.minScore !== undefined) query.minScore = params.minScore;
        if (params.page) query.page = params.page;
        if (params.perPage) query.perPage = params.perPage;
    }
    const url = buildUrl('/api/innovation/ideas', query);
    const data = await request<Idea[] | { items: Idea[]; total?: number }>(url, { method: 'GET' });
    if (Array.isArray(data)) return data;
    return data.items || [];
}

export async function fetchIdeaCounts(): Promise<IdeaCounts> {
    const url = buildUrl('/api/innovation/ideas/counts');
    return request<IdeaCounts>(url, { method: 'GET' });
}

export async function approveIdea(id: string, notes?: string): Promise<Idea> {
    const url = buildUrl(`/api/innovation/ideas/${encodeURIComponent(id)}/approve`);
    return request<Idea>(url, { method: 'POST', body: JSON.stringify({ notes }) });
}

export async function rejectIdea(id: string, notes?: string): Promise<Idea> {
    const url = buildUrl(`/api/innovation/ideas/${encodeURIComponent(id)}/reject`);
    return request<Idea>(url, { method: 'POST', body: JSON.stringify({ notes }) });
}

export async function promoteIdea(id: string, projectCode?: string): Promise<Idea> {
    const url = buildUrl(`/api/innovation/ideas/${encodeURIComponent(id)}/promote`);
    return request<Idea>(url, { method: 'POST', body: JSON.stringify({ projectCode }) });
}

// Some components reference promoteIdeaApi; provide alias for compatibility
export const promoteIdeaApi = promoteIdea;
