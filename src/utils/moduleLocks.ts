import { getUser } from './auth';

export type LockableModuleKey = 'procurement' | 'innovation' | 'committee' | 'budgeting';

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
    budgeting: { locked: true, reason: 'Module not yet released', updatedAt: '' },
};

export const LOCKABLE_MODULES: Array<{ key: LockableModuleKey; label: string; description: string }> = [
    { key: 'procurement', label: 'Procurement', description: 'Core procurement workflows, requests, approvals' },
    { key: 'innovation', label: 'Innovation Hub', description: 'Idea submissions, reviews, and committee workflows' },
    { key: 'committee', label: 'Committees', description: 'Innovation and evaluation committee workspaces' },
    { key: 'budgeting', label: 'Budgeting', description: 'Budgeting and financial planning (coming soon)' },
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
