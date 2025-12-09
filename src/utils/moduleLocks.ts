import { getUser } from './auth';
import { getApiUrl } from '../config/api';

export type LockableModuleKey = 'procurement' | 'innovation' | 'committee' | 'budgeting' | 'audit' | 'prime' | 'datapoint' | 'maintenance' | 'asset' | 'project' | 'knowledge';

export interface ModuleLockEntry {
    locked: boolean;
    reason?: string;
    updatedAt: string;
    updatedBy?: string;
}

export type ModuleLockState = Record<LockableModuleKey, ModuleLockEntry>;

const STORAGE_KEY = 'spinx_module_locks';

const defaultState: ModuleLockState = {
    procurement: { locked: false, updatedAt: '' },
    innovation: { locked: false, updatedAt: '' },
    committee: { locked: false, updatedAt: '' },
    budgeting: { locked: true, reason: 'Coming soon', updatedAt: '' },
    audit: { locked: true, reason: 'Coming soon', updatedAt: '' },
    prime: { locked: true, reason: 'Coming soon', updatedAt: '' },
    datapoint: { locked: true, reason: 'Coming soon', updatedAt: '' },
    maintenance: { locked: true, reason: 'Coming soon', updatedAt: '' },
    asset: { locked: true, reason: 'Coming soon', updatedAt: '' },
    project: { locked: true, reason: 'Coming soon', updatedAt: '' },
    knowledge: { locked: true, reason: 'Coming soon', updatedAt: '' },
};

export const LOCKABLE_MODULES: Array<{ key: LockableModuleKey; label: string; description: string }> = [
    { key: 'procurement', label: 'Procurement', description: 'Core procurement workflows, requests, approvals' },
    { key: 'innovation', label: 'Innovation Hub', description: 'Idea submissions, reviews, and committee workflows' },
    { key: 'committee', label: 'Committees', description: 'Innovation and evaluation committee workspaces' },
    { key: 'budgeting', label: 'Budgeting', description: 'Budgeting and financial planning (coming soon)' },
    { key: 'audit', label: 'Audit Management System', description: 'Plan audits, track findings, and manage remediation' },
    { key: 'prime', label: 'PRIME – Policy, Risk, Integrated Management Engine', description: 'Centralize policies and risk with integrated controls' },
    { key: 'datapoint', label: 'Data Point – Analytics & BI Centre', description: 'Dashboards and insights across all modules' },
    { key: 'maintenance', label: 'Maintenance & Service Management', description: 'Work orders, schedules, and vendor SLAs' },
    { key: 'asset', label: 'Asset & Inventory Management', description: 'Track assets, lifecycle, and inventory levels' },
    { key: 'project', label: 'Project & Portfolio Management', description: 'Deliver projects with timelines and governance' },
    { key: 'knowledge', label: 'Knowledge Base & Policy Repository', description: 'Author, search, and version policies and SOPs' },
];

const mergeWithDefaults = (state: Partial<ModuleLockState> | null): ModuleLockState => {
    const merged: Partial<ModuleLockState> = { ...defaultState };
    if (state) {
        for (const key of Object.keys(defaultState) as LockableModuleKey[]) {
            merged[key] = { ...defaultState[key], ...(state[key] ?? {}) };
        }
    }
    return merged as ModuleLockState;
};

// Cache locks in memory with TTL
let locksCache: ModuleLockState | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 second cache

/**
 * Fetch module locks from backend API
 */
export const fetchModuleLocks = async (): Promise<ModuleLockState> => {
    const now = Date.now();

    // Return cached value if fresh
    if (locksCache && now - lastFetchTime < CACHE_TTL_MS) {
        return locksCache;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl('/api/admin/module-locks'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (response.ok) {
            const result = await response.json();
            locksCache = result.data ? mergeWithDefaults(result.data) : mergeWithDefaults(null);
            lastFetchTime = now;
            return locksCache;
        }
    } catch (error) {
        console.warn('Failed to fetch module locks from API, using local cache', error);
    }

    // Fallback to localStorage if API fails
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<ModuleLockState>;
            locksCache = mergeWithDefaults(parsed);
            return locksCache;
        }
    } catch {
        /* ignore */
    }

    locksCache = mergeWithDefaults(null);
    return locksCache;
};

export const getModuleLocks = (): ModuleLockState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaultState };
        const parsed = JSON.parse(raw) as Partial<ModuleLockState>;
        return mergeWithDefaults(parsed);
    } catch {
        return { ...defaultState };
    }
};

const persistModuleLocks = (next: ModuleLockState): ModuleLockState => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* ignore write failures */
    }
    return next;
};

/**
 * Update module lock on backend
 */
export const updateModuleLock = async (key: LockableModuleKey, locked: boolean, meta?: { reason?: string }): Promise<ModuleLockState> => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl(`/api/admin/module-locks/${key}`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ locked, reason: meta?.reason }),
        });

        if (response.ok) {
            // Invalidate cache to force fresh fetch
            locksCache = null;
            lastFetchTime = 0;

            // Return updated locks
            return await fetchModuleLocks();
        }
    } catch (error) {
        console.error('Failed to update module lock on backend', error);
    }

    // Fallback to local update
    return setModuleLock(key, locked, meta);
};

export const setModuleLock = (key: LockableModuleKey, locked: boolean, meta?: { reason?: string; updatedBy?: string }): ModuleLockState => {
    const current = getModuleLocks();
    const next: ModuleLockState = {
        ...current,
        [key]: {
            locked,
            reason: meta?.reason ?? current[key]?.reason,
            updatedAt: new Date().toISOString(),
            updatedBy: meta?.updatedBy ?? current[key]?.updatedBy ?? getUser()?.name ?? getUser()?.email ?? 'Admin',
        },
    };

    return persistModuleLocks(next);
};

export const isModuleLocked = (key: LockableModuleKey): boolean => {
    return getModuleLocks()[key]?.locked ?? false;
};
