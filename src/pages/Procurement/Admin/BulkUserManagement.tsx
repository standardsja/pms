import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconUpload from '../../../components/Icon/IconUpload';
import IconDownload from '../../../components/Icon/IconDownload';
import IconTrash from '../../../components/Icon/IconTrash';

interface BulkImportResult {
    totalRows: number;
    successCount: number;
    failureCount: number;
    details: string[];
}

const BulkUserManagement = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Bulk User Management'));
    }, [dispatch]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        if (!file.name.endsWith('.csv')) {
            setError('Only CSV files are supported');
            return;
        }
        setError('');
    };

    const handleImport = async () => {
        if (!fileInputRef.current?.files?.[0]) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        try {
            const file = fileInputRef.current.files[0];
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(getApiUrl('/api/admin/bulk-import'), {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to import users');
            }

            const result = await response.json();
            setImportResult(result);
            setSuccess(`Successfully imported ${result.successCount} users!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = `email,name,department,role
john.doe@example.com,John Doe,Operations,User
jane.smith@example.com,Jane Smith,IT,Manager
bob.johnson@example.com,Bob Johnson,Finance,User`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setImportResult(null);
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk User Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Import multiple users via CSV, batch operations, and bulk role assignment</p>
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

            {/* Import Section */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">Import Users from CSV</h2>

                <div className="space-y-4">
                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-semibold mb-3">Select CSV File</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <IconUpload className="w-12 h-12 text-gray-400" />
                                <div>
                                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" disabled={loading} />
                                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary mb-2" disabled={loading}>
                                        Choose File
                                    </button>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{fileName || 'or drag and drop CSV file here'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CSV Format Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Required CSV Format</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Your CSV file must include these columns:</p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4">
                            <li>
                                • <span className="font-mono">email</span> (required, unique)
                            </li>
                            <li>
                                • <span className="font-mono">name</span> (required)
                            </li>
                            <li>
                                • <span className="font-mono">department</span> (required)
                            </li>
                            <li>
                                • <span className="font-mono">role</span> (required: User, Manager, Admin)
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={handleImport} disabled={loading || !fileName} className="btn btn-primary">
                            {loading ? (
                                <>
                                    <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <IconUpload className="w-4 h-4 mr-2" />
                                    Import Users
                                </>
                            )}
                        </button>
                        <button onClick={handleDownloadTemplate} className="btn btn-outline-primary">
                            <IconDownload className="w-4 h-4 mr-2" />
                            Download Template
                        </button>
                        {fileName && (
                            <button onClick={handleClear} className="btn btn-outline-danger">
                                <IconTrash className="w-4 h-4 mr-2" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Import Results */}
            {importResult && (
                <div className="panel p-6">
                    <h2 className="text-xl font-bold mb-4">Import Results</h2>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded">
                            <p className="text-sm text-blue-700 dark:text-blue-300">Total Records</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{importResult.totalRows}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded">
                            <p className="text-sm text-green-700 dark:text-green-300">Successful</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{importResult.successCount}</p>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded">
                            <p className="text-sm text-red-700 dark:text-red-300">Failed</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{importResult.failureCount}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {importResult.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                {detail.startsWith('✓') ? (
                                    <IconSquareCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <IconAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                )}
                                <span>{detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Batch Operations */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">Batch Operations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer">
                        <h3 className="font-semibold mb-1">Bulk Role Assignment</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Assign roles to multiple users at once</p>
                        <button className="btn btn-sm btn-outline-primary">Configure</button>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer">
                        <h3 className="font-semibold mb-1">Bulk Department Change</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Move multiple users to different departments</p>
                        <button className="btn btn-sm btn-outline-primary">Configure</button>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer">
                        <h3 className="font-semibold mb-1">Bulk Deactivation</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Deactivate multiple user accounts</p>
                        <button className="btn btn-sm btn-outline-danger">Configure</button>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer">
                        <h3 className="font-semibold mb-1">Bulk Password Reset</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Send password reset emails to users</p>
                        <button className="btn btn-sm btn-outline-primary">Configure</button>
                    </div>
                </div>
            </div>

            {/* Guidelines */}
            <div className="panel p-6 bg-gray-50 dark:bg-gray-900/20">
                <h2 className="text-lg font-bold mb-3">Import Guidelines</h2>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <li>• Emails must be unique and valid</li>
                    <li>• Departments and roles must match existing system values</li>
                    <li>• Maximum 1000 users per import</li>
                    <li>• Failed records will not affect successful ones</li>
                    <li>• Import is transactional for consistency</li>
                    <li>• Users will receive welcome emails with login credentials</li>
                </ul>
            </div>
        </div>
    );
};

export default BulkUserManagement;
