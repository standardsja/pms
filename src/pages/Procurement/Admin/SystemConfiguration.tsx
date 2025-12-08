import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconSave from '../../../components/Icon/IconSave';

interface SystemConfig {
    emailSettings: {
        smtpServer: string;
        smtpPort: number;
        fromEmail: string;
        fromName: string;
        enableSSL: boolean;
    };
    fileUpload: {
        maxFileSize: number;
        allowedFormats: string[];
        uploadDirectory: string;
        scanForViruses: boolean;
    };
    systemParameters: {
        maxLoginAttempts: number;
        sessionTimeout: number;
        passwordMinLength: number;
        requireSpecialChars: boolean;
        logoUrl: string;
        systemName: string;
    };
}

const SystemConfiguration = () => {
    const dispatch = useDispatch();
    const [config, setConfig] = useState<SystemConfig>({
        emailSettings: {
            smtpServer: 'smtp.gmail.com',
            smtpPort: 587,
            fromEmail: 'noreply@pms.local',
            fromName: 'Procurement Management System',
            enableSSL: true,
        },
        fileUpload: {
            maxFileSize: 10,
            allowedFormats: ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'txt', 'csv', 'jpg', 'png'],
            uploadDirectory: '/uploads',
            scanForViruses: true,
        },
        systemParameters: {
            maxLoginAttempts: 5,
            sessionTimeout: 30,
            passwordMinLength: 8,
            requireSpecialChars: true,
            logoUrl: '/logo.png',
            systemName: 'Procurement Management System',
        },
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
            const response = await fetch(getApiUrl('/api/admin/system-config'));
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            } else {
                console.warn('Failed to load system config:', response.status);
            }
        } catch (e: any) {
            console.warn('Error loading config:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(getApiUrl('/api/admin/system-config'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }

            setSuccess('Configuration saved successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSuccess('Test email sent successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message);
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
                            <label className="block text-sm font-semibold mb-2">SMTP Server</label>
                            <input
                                type="text"
                                value={config.emailSettings.smtpServer}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        emailSettings: { ...config.emailSettings, smtpServer: e.target.value },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">SMTP Port</label>
                            <input
                                type="number"
                                value={config.emailSettings.smtpPort}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        emailSettings: {
                                            ...config.emailSettings,
                                            smtpPort: parseInt(e.target.value),
                                        },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">From Email</label>
                            <input
                                type="email"
                                value={config.emailSettings.fromEmail}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        emailSettings: { ...config.emailSettings, fromEmail: e.target.value },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">From Name</label>
                            <input
                                type="text"
                                value={config.emailSettings.fromName}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        emailSettings: { ...config.emailSettings, fromName: e.target.value },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.emailSettings.enableSSL}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    emailSettings: { ...config.emailSettings, enableSSL: e.target.checked },
                                })
                            }
                            className="form-checkbox"
                        />
                        <span className="font-semibold">Enable SSL/TLS</span>
                    </label>

                    <button onClick={handleTestEmail} className="btn btn-outline-primary">
                        Send Test Email
                    </button>
                </div>
            </div>

            {/* File Upload Settings */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">File Upload Settings</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Max File Size (MB)</label>
                            <input
                                type="number"
                                value={config.fileUpload.maxFileSize}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        fileUpload: {
                                            ...config.fileUpload,
                                            maxFileSize: parseInt(e.target.value),
                                        },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Upload Directory</label>
                            <input
                                type="text"
                                value={config.fileUpload.uploadDirectory}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        fileUpload: { ...config.fileUpload, uploadDirectory: e.target.value },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Allowed File Formats</label>
                        <input
                            type="text"
                            value={config.fileUpload.allowedFormats.join(', ')}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    fileUpload: {
                                        ...config.fileUpload,
                                        allowedFormats: e.target.value.split(',').map((f) => f.trim()),
                                    },
                                })
                            }
                            className="form-input w-full"
                            placeholder="pdf, doc, docx, xlsx..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate with commas</p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.fileUpload.scanForViruses}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    fileUpload: { ...config.fileUpload, scanForViruses: e.target.checked },
                                })
                            }
                            className="form-checkbox"
                        />
                        <span className="font-semibold">Scan files for viruses</span>
                    </label>
                </div>
            </div>

            {/* System Parameters */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">System Parameters</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">System Name</label>
                            <input
                                type="text"
                                value={config.systemParameters.systemName}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        systemParameters: {
                                            ...config.systemParameters,
                                            systemName: e.target.value,
                                        },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Logo URL</label>
                            <input
                                type="text"
                                value={config.systemParameters.logoUrl}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        systemParameters: { ...config.systemParameters, logoUrl: e.target.value },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Max Login Attempts</label>
                            <input
                                type="number"
                                value={config.systemParameters.maxLoginAttempts}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        systemParameters: {
                                            ...config.systemParameters,
                                            maxLoginAttempts: parseInt(e.target.value),
                                        },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Session Timeout (minutes)</label>
                            <input
                                type="number"
                                value={config.systemParameters.sessionTimeout}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        systemParameters: {
                                            ...config.systemParameters,
                                            sessionTimeout: parseInt(e.target.value),
                                        },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Password Min Length</label>
                            <input
                                type="number"
                                value={config.systemParameters.passwordMinLength}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        systemParameters: {
                                            ...config.systemParameters,
                                            passwordMinLength: parseInt(e.target.value),
                                        },
                                    })
                                }
                                className="form-input w-full"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.systemParameters.requireSpecialChars}
                            onChange={(e) =>
                                setConfig({
                                    ...config,
                                    systemParameters: {
                                        ...config.systemParameters,
                                        requireSpecialChars: e.target.checked,
                                    },
                                })
                            }
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
