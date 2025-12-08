import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import adminService, { FeatureFlag, FeatureFlagUpsertInput } from '../../../services/adminService';

interface DraftFlag {
    key: string;
    description: string;
    module: string;
    enabled: boolean;
}

const defaultDraft: DraftFlag = {
    key: '',
    description: '',
    module: 'global',
    enabled: true,
};

const FeatureFlags = () => {
    const dispatch = useDispatch();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [draft, setDraft] = useState<DraftFlag>(defaultDraft);

    useEffect(() => {
        dispatch(setPageTitle('Feature Flags'));
    }, [dispatch]);

    useEffect(() => {
        const loadFlags = async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await adminService.getFeatureFlags();
                if (res?.success && Array.isArray(res.flags)) {
                    setFlags(res.flags);
                } else {
                    setError('Failed to load feature flags');
                }
            } catch (err) {
                setError('Failed to load feature flags');
            } finally {
                setIsLoading(false);
            }
        };
        loadFlags();
    }, []);

    const sortedFlags = useMemo(() => {
        return [...flags].sort((a, b) => a.key.localeCompare(b.key));
    }, [flags]);

    const saveFlag = async (key: string, payload: FeatureFlagUpsertInput) => {
        setIsSaving(true);
        setError('');
        try {
            const res = await adminService.upsertFeatureFlag(key, payload);
            if (res?.success && res.flag) {
                setFlags((prev) => {
                    const without = prev.filter((f) => f.key !== res.flag.key);
                    return [...without, res.flag];
                });
            } else {
                setError('Failed to save flag');
            }
        } catch (err) {
            setError('Failed to save flag');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = (flag: FeatureFlag) => {
        void saveFlag(flag.key, { enabled: !flag.enabled });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.key.trim()) {
            setError('Key is required');
            return;
        }
        void saveFlag(draft.key.trim(), {
            enabled: draft.enabled,
            description: draft.description.trim() || null,
            module: draft.module.trim() || 'global',
        });
        setDraft(defaultDraft);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Feature Flags</h1>
                    <p className="text-sm text-gray-600">Toggle modules and experiments without redeploying.</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Flags</h2>
                        {isLoading && <span className="text-xs text-gray-500">Loading…</span>}
                    </div>
                    {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedFlags.map((flag) => (
                            <div key={flag.key} className="py-3 flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{flag.key}</div>
                                    <div className="text-xs text-gray-500">{flag.module || 'global'}</div>
                                    {flag.description && <div className="text-sm text-gray-600 dark:text-gray-300">{flag.description}</div>}
                                    <div className="text-[11px] text-gray-400">Last updated: {new Date(flag.updatedAt).toLocaleString()}</div>
                                </div>
                                <label className="inline-flex items-center cursor-pointer select-none">
                                    <input type="checkbox" className="sr-only" checked={flag.enabled} onChange={() => handleToggle(flag)} disabled={isSaving} />
                                    <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${flag.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${flag.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">{flag.enabled ? 'Enabled' : 'Disabled'}</span>
                                </label>
                            </div>
                        ))}
                        {sortedFlags.length === 0 && !isLoading && <div className="py-4 text-sm text-gray-500">No feature flags yet.</div>}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-4">Add or Update Flag</h2>
                    <form className="space-y-4" onSubmit={handleCreate}>
                        <div>
                            <label className="block text-sm font-medium mb-1">Key</label>
                            <input
                                type="text"
                                value={draft.key}
                                onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                                className="form-input w-full"
                                placeholder="e.g. pms.module.procurement"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Module / Scope</label>
                            <input
                                type="text"
                                value={draft.module}
                                onChange={(e) => setDraft((d) => ({ ...d, module: e.target.value }))}
                                className="form-input w-full"
                                placeholder="global or module name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                value={draft.description}
                                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                className="form-textarea w-full"
                                rows={3}
                                placeholder="What does this flag control?"
                            ></textarea>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="inline-flex items-center cursor-pointer select-none">
                                <input type="checkbox" className="sr-only" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} />
                                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${draft.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${draft.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Enabled</span>
                            </label>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save Flag'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FeatureFlags;
