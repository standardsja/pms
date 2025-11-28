import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSettings from '../../../components/Icon/IconSettings';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconRefresh from '../../../components/Icon/IconRefresh';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import { getApiUrl } from '../../../config/api';

const MySwal = withReactContent(Swal);

interface LoadBalancingSettings {
    enabled: boolean;
    strategy: 'ROUND_ROBIN' | 'LEAST_LOADED' | 'RANDOM';
    autoAssignOnApproval: boolean;
}

const LoadBalancingSettings = () => {
    const dispatch = useDispatch();
    const [settings, setSettings] = useState<LoadBalancingSettings>({
        enabled: false,
        strategy: 'LEAST_LOADED',
        autoAssignOnApproval: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Load Balancing Settings'));
    }, [dispatch]);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            setError(null);

            try {
                const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                const currentUserId = userProfile?.id || userProfile?.userId || null;

                const res = await fetch(getApiUrl('/procurement/load-balancing-settings'), {
                    headers: {
                        'x-user-id': String(currentUserId || ''),
                    },
                });
                if (!res.ok) {
                    if (res.status === 404) {
                        // Settings don't exist yet, use defaults
                        setLoading(false);
                        return;
                    }
                    throw new Error('Failed to fetch settings');
                }
                const data = await res.json();
                setSettings(data);
            } catch (err: any) {
                console.error('Error fetching settings:', err);
                setError(err.message || 'Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);

        try {
            const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            const currentUserId = userProfile?.id || userProfile?.userId || null;

            const res = await fetch(getApiUrl('/procurement/load-balancing-settings'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUserId || ''),
                },
                body: JSON.stringify(settings),
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to save settings');
            }

            MySwal.fire({
                icon: 'success',
                title: 'Settings Saved',
                text: 'Load balancing settings have been updated successfully.',
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (err: any) {
            console.error('Error saving settings:', err);
            MySwal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: err.message || 'Failed to save settings. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = () => {
        if (settings.enabled) {
            // Disabling - show confirmation
            MySwal.fire({
                title: 'Disable Load Balancing?',
                text: 'Requests will no longer be automatically distributed to procurement officers. You will need to manually assign each request.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Disable',
                confirmButtonColor: '#dc2626',
                cancelButtonText: 'Cancel',
            }).then((result) => {
                if (result.isConfirmed) {
                    setSettings({ ...settings, enabled: false });
                }
            });
        } else {
            setSettings({ ...settings, enabled: true });
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
                    <p className="text-red-800 dark:text-red-200">Error: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="panel bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg">
                            <IconSettings className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Load Balancing Settings</h1>
                            <p className="text-sm text-white/90 mt-1">Intelligent request distribution & workload optimization</p>
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()} className="btn bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 gap-2">
                        <IconRefresh className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                {/* Main Toggle Card */}
                <div
                    className={`panel border-l-4 transition-all ${
                        settings.enabled
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500'
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                            <div
                                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                                    settings.enabled ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-300/20 text-gray-500'
                                }`}
                            >
                                {settings.enabled ? <IconChecks className="w-8 h-8" /> : <IconX className="w-8 h-8" />}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Load Balancing System</h2>
                                <p className={`text-sm mt-1 font-medium ${settings.enabled ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {settings.enabled ? '✓ Active - Automatic distribution enabled' : '✗ Inactive - Manual assignment required'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {settings.enabled ? 'Requests are automatically distributed to officers' : 'Each request must be manually assigned to officers'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.enabled} onChange={handleToggle} className="sr-only peer" />
                            <div className="w-16 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-600 shadow-lg"></div>
                        </label>
                    </div>
                </div>

                {/* Strategy Selection */}
                {settings.enabled && (
                    <div className="panel">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
                                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Distribution Strategy</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Choose how requests are distributed among procurement officers</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label
                                className={`flex items-start p-5 border-2 rounded-lg cursor-pointer transition-all ${
                                    settings.strategy === 'LEAST_LOADED'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="strategy"
                                    value="LEAST_LOADED"
                                    checked={settings.strategy === 'LEAST_LOADED'}
                                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value as any })}
                                    className="mt-1 mr-4 w-5 h-5 text-indigo-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                                                />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-lg">
                                            Least Loaded <span className="text-xs badge bg-success ml-2">Recommended</span>
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        Assigns requests to the officer with the fewest active assignments. Ensures balanced workload across all officers and prevents overloading.
                                    </p>
                                </div>
                            </label>

                            <label
                                className={`flex items-start p-5 border-2 rounded-lg cursor-pointer transition-all ${
                                    settings.strategy === 'ROUND_ROBIN'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="strategy"
                                    value="ROUND_ROBIN"
                                    checked={settings.strategy === 'ROUND_ROBIN'}
                                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value as any })}
                                    className="mt-1 mr-4 w-5 h-5 text-indigo-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-lg">Round Robin</p>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        Distributes requests in sequential order, rotating through all officers. Simple and predictable distribution pattern.
                                    </p>
                                </div>
                            </label>

                            <label
                                className={`flex items-start p-5 border-2 rounded-lg cursor-pointer transition-all ${
                                    settings.strategy === 'RANDOM'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="strategy"
                                    value="RANDOM"
                                    checked={settings.strategy === 'RANDOM'}
                                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value as any })}
                                    className="mt-1 mr-4 w-5 h-5 text-indigo-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
                                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                                />
                                            </svg>
                                        </div>
                                        <p className="font-bold text-lg">Random</p>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        Randomly assigns requests to any available officer. Useful for variety and unpredictability in distribution.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Auto-assign Option */}
                {settings.enabled && (
                    <div className="panel bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Automation Settings</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Configure automatic assignment triggers</p>
                            </div>
                        </div>

                        <label className="flex items-start cursor-pointer p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all">
                            <input
                                type="checkbox"
                                checked={settings.autoAssignOnApproval}
                                onChange={(e) => setSettings({ ...settings, autoAssignOnApproval: e.target.checked })}
                                className="mt-1 mr-4 w-5 h-5 text-amber-600"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="font-bold text-lg">Auto-assign on Finance Approval</p>
                                    {settings.autoAssignOnApproval && <span className="badge bg-success text-xs">Active</span>}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Automatically assign requests to officers immediately when approved by finance. If disabled, requests will remain in the manager queue for manual assignment.
                                </p>
                            </div>
                        </label>
                    </div>
                )}

                {/* Information Panel */}
                <div className="panel bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-l-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                            <IconInfoCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">How Load Balancing Works</h3>
                    </div>
                    <div className="grid gap-3">
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold mt-0.5">1</div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                When enabled, requests at <span className="font-semibold text-blue-600 dark:text-blue-400">PROCUREMENT_REVIEW</span> status are automatically distributed to procurement
                                officers based on the selected strategy.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold mt-0.5">2</div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                You can still <span className="font-semibold text-indigo-600 dark:text-indigo-400">manually override</span> assignments from the "Assign Requests" page at any time for
                                special cases.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold mt-0.5">3</div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Officers can view their assigned requests in their <span className="font-semibold text-purple-600 dark:text-purple-400">individual procurement queues</span> with full
                                context and history.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-500 text-white text-xs font-bold mt-0.5">4</div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                The system tracks each officer's <span className="font-semibold text-pink-600 dark:text-pink-400">current workload</span> in real-time to ensure fair and balanced
                                distribution.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoadBalancingSettings;
