import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSettings from '../../../components/Icon/IconSettings';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';

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

    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : `http://${window.location.hostname}:4000`;

    useEffect(() => {
        dispatch(setPageTitle('Load Balancing Settings'));
    }, [dispatch]);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(`${apiUrl}/procurement/load-balancing-settings`);
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
    }, [apiUrl]);

    const handleSave = async () => {
        setSaving(true);

        try {
            const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            const currentUserId = userProfile?.id || userProfile?.userId || null;

            const res = await fetch(`${apiUrl}/procurement/load-balancing-settings`, {
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
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <IconSettings className="w-7 h-7" />
                    Load Balancing Settings
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure automatic request distribution to procurement officers.</p>
            </div>

            <div className="max-w-4xl">
                {/* Main Toggle Card */}
                <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                {settings.enabled ? <IconChecks className="w-6 h-6 text-green-600" /> : <IconX className="w-6 h-6 text-gray-400" />}
                                Load Balancing
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {settings.enabled ? 'Automatic request distribution is enabled' : 'Automatic request distribution is disabled - manual assignment required'}
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.enabled} onChange={handleToggle} className="sr-only peer" />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* Strategy Selection */}
                {settings.enabled && (
                    <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Distribution Strategy</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose how requests are distributed among procurement officers:</p>

                        <div className="space-y-4">
                            <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                <input
                                    type="radio"
                                    name="strategy"
                                    value="LEAST_LOADED"
                                    checked={settings.strategy === 'LEAST_LOADED'}
                                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value as any })}
                                    className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">Least Loaded (Recommended)</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Assigns requests to the officer with the fewest active assignments. Ensures balanced workload across all officers.
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                <input
                                    type="radio"
                                    name="strategy"
                                    value="ROUND_ROBIN"
                                    checked={settings.strategy === 'ROUND_ROBIN'}
                                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value as any })}
                                    className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">Round Robin</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Distributes requests in sequential order, rotating through all officers. Simple and predictable distribution pattern.
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                <input
                                    type="radio"
                                    name="strategy"
                                    value="RANDOM"
                                    checked={settings.strategy === 'RANDOM'}
                                    onChange={(e) => setSettings({ ...settings, strategy: e.target.value as any })}
                                    className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">Random</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Randomly assigns requests to any available officer. Useful for variety and unpredictability.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Auto-assign Option */}
                {settings.enabled && (
                    <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Automation Settings</h2>

                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoAssignOnApproval}
                                onChange={(e) => setSettings({ ...settings, autoAssignOnApproval: e.target.checked })}
                                className="mt-1 mr-3"
                            />
                            <div className="flex-1">
                                <p className="font-semibold">Auto-assign on Finance Approval</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Automatically assign requests to officers immediately when approved by finance. If disabled, requests will remain in the manager queue for manual assignment.
                                </p>
                            </div>
                        </label>
                    </div>
                )}

                {/* Information Panel */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">How Load Balancing Works</h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>When enabled, requests at PROCUREMENT_REVIEW status are automatically distributed to procurement officers based on the selected strategy.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>You can still manually override assignments from the "Assign Requests" page at any time.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Officers can view their assigned requests in their individual procurement queues.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>The system tracks each officer's current workload to ensure fair distribution.</span>
                        </li>
                    </ul>
                </div>

                {/* Save Button */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                            saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoadBalancingSettings;
