import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import adminService from '../../../services/adminService';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconSave from '../../../components/Icon/IconSave';

interface SystemConfig {
    [key: string]: any;
}

const SystemConfiguration = () => {
    const dispatch = useDispatch();
    const [config, setConfig] = useState<SystemConfig>({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_USER: '',
        FROM_EMAIL: 'noreply@pms.local',
        MAX_LOGIN_ATTEMPTS: 5,
        SESSION_TIMEOUT: 30,
        PASSWORD_MIN_LENGTH: 8,
        REQUIRE_SPECIAL_CHARS: true,
        LOGO_URL: '/logo.png',
        SYSTEM_NAME: 'Procurement Management System',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('System Configuration'));
        loadConfig();
    }, [dispatch]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await adminService.getSystemConfig();
            setConfig(data);
            setError('');
        } catch (e: any) {
            // Error handled in UI
            setError(e.message || 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await adminService.updateSystemConfig(config);
            setSuccess('Configuration saved successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message || 'Failed to save configuration');
            setTimeout(() => setError(''), 5000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Configure email, file uploads, and system parameters</p>
            </div>

            {/* Alerts */}
            {success && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-200 flex items-center gap-2">
                    <IconSquareCheck className="w-5 h-5" />
                    {success}
                </div>
            )}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <IconAlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Email Settings */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">Email Settings</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">SMTP Host</label>
                            <input type="text" value={config.SMTP_HOST} onChange={(e) => setConfig({ ...config, SMTP_HOST: e.target.value })} className="form-input w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">SMTP Port</label>
                            <input
                                type="number"
                                value={config.SMTP_PORT ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setConfig({ ...config, SMTP_PORT: val === '' ? '' : Number(val) });
                                }}
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">SMTP User</label>
                            <input type="text" value={config.SMTP_USER} onChange={(e) => setConfig({ ...config, SMTP_USER: e.target.value })} className="form-input w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">From Email</label>
                            <input type="email" value={config.FROM_EMAIL} onChange={(e) => setConfig({ ...config, FROM_EMAIL: e.target.value })} className="form-input w-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* System Parameters */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">System Parameters</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">System Name</label>
                            <input type="text" value={config.SYSTEM_NAME} onChange={(e) => setConfig({ ...config, SYSTEM_NAME: e.target.value })} className="form-input w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Logo URL</label>
                            <input type="text" value={config.LOGO_URL} onChange={(e) => setConfig({ ...config, LOGO_URL: e.target.value })} className="form-input w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Max Login Attempts</label>
                            <input
                                type="number"
                                value={config.MAX_LOGIN_ATTEMPTS ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setConfig({ ...config, MAX_LOGIN_ATTEMPTS: val === '' ? '' : Number(val) });
                                }}
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Session Timeout (minutes)</label>
                            <input
                                type="number"
                                value={config.SESSION_TIMEOUT ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setConfig({ ...config, SESSION_TIMEOUT: val === '' ? '' : Number(val) });
                                }}
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Password Min Length</label>
                            <input
                                type="number"
                                value={config.PASSWORD_MIN_LENGTH ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setConfig({ ...config, PASSWORD_MIN_LENGTH: val === '' ? '' : Number(val) });
                                }}
                                className="form-input w-full"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.REQUIRE_SPECIAL_CHARS === true || config.REQUIRE_SPECIAL_CHARS === 'true'}
                            onChange={(e) => setConfig({ ...config, REQUIRE_SPECIAL_CHARS: e.target.checked })}
                            className="form-checkbox"
                        />
                        <span className="font-semibold">Require special characters in passwords</span>
                    </label>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                    <IconSave className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            {/* Info */}
            <div className="panel p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40">
                <p className="text-sm text-blue-900 dark:text-blue-100">Configuration changes are applied immediately to all new sessions. Existing sessions may need to refresh to see changes.</p>
            </div>
        </div>
    );
};

export default SystemConfiguration;
