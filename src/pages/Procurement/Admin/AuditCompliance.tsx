import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import adminService from '../../../services/adminService';
import IconSearch from '../../../components/Icon/IconSearch';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconDownload from '../../../components/Icon/IconDownload';
import IconFilter from '../../../components/Icon/IconFilter';

interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'logout' | 'permission_change' | 'export' | 'other';
    resource: string;
    details: string;
    status: 'success' | 'failure';
    ipAddress: string;
    changes?: Record<string, [any, any]>;
}

const AuditCompliance = () => {
    const dispatch = useDispatch();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Audit & Compliance'));
    }, [dispatch]);

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const normalizeAction = (actionRaw: string | null | undefined): AuditLog['action'] => {
        if (!actionRaw) return 'other';
        const upper = actionRaw.toUpperCase();
        
        // Check for specific procurement actions first
        if (upper.includes('SUBMIT') || upper.includes('SUBMITTED')) return 'create';
        if (upper.includes('APPROV') || upper.includes('APPROVED')) return 'approve';
        if (upper.includes('REJECT') || upper.includes('DENIED') || upper.includes('RETURN') || upper.includes('RETURNED')) return 'reject';
        if (upper.includes('STATUS_CHANGE')) return 'update';
        
        // Then check for general CRUD operations
        if (upper.includes('CREATE')) return 'create';
        if (upper.includes('UPDATE')) return 'update';
        if (upper.includes('DELETE')) return 'delete';
        
        // Authentication actions
        if (upper.includes('LOGIN')) return 'login';
        if (upper.includes('LOGOUT')) return 'logout';
        
        // Administrative actions
        if (upper.includes('ROLE') || upper.includes('PERMISSION')) return 'permission_change';
        if (upper.includes('EXPORT')) return 'export';
        
        return 'other';
    };

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            const result = await adminService.getAuditLog({});
            const rawLogs = Array.isArray(result) ? result : (result as any)?.data || (result as any)?.logs || [];

            const mapped: AuditLog[] = rawLogs.map((log: any) => {
                const action = normalizeAction(log?.action);

                // Get user name with proper fallbacks
                let userName = 'Unknown user';
                if (log?.user?.name && typeof log.user.name === 'string' && log.user.name.trim()) {
                    userName = log.user.name;
                } else if (log?.user?.email && typeof log.user.email === 'string' && log.user.email.trim()) {
                    userName = log.user.email;
                } else if (log?.userName && typeof log.userName === 'string' && log.userName.trim()) {
                    userName = log.userName;
                }

                // Get details from multiple possible sources
                let details = '';
                if (log?.message && typeof log.message === 'string' && log.message.trim()) {
                    details = log.message;
                } else if (log?.metadata?.message && typeof log.metadata.message === 'string') {
                    details = log.metadata.message;
                } else if (log?.details && typeof log.details === 'string') {
                    details = log.details;
                }

                // Debug: log the raw action to console
                if (log?.action) {
                    console.log('Raw audit action:', log.action, '-> normalized:', action);
                }

                return {
                    id: String(log?.id ?? crypto.randomUUID()),
                    timestamp: log?.createdAt || log?.timestamp || new Date().toISOString(),
                    userId: String(log?.userId ?? ''),
                    userName,
                    action,
                    resource: log?.entity || log?.resource || 'system',
                    details,
                    status: log?.metadata?.status === 'failure' ? 'failure' : 'success',
                    ipAddress: (log?.ipAddress as string) || 'N/A',
                    changes: log?.metadata?.changes,
                };
            });

            setLogs(mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (e: any) {
            // Error handled by UI state
            console.error('Failed to load audit logs:', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesSearch =
                !searchTerm ||
                log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.ipAddress.includes(searchTerm);

            const matchesAction = filterAction === 'all' || log.action === filterAction;
            const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

            let matchesDate = true;
            if (dateRange.from) {
                matchesDate = new Date(log.timestamp) >= new Date(dateRange.from);
            }
            if (dateRange.to) {
                matchesDate = matchesDate && new Date(log.timestamp) <= new Date(dateRange.to + 'T23:59:59');
            }

            return matchesSearch && matchesAction && matchesStatus && matchesDate;
        });
    }, [logs, searchTerm, filterAction, filterStatus, dateRange]);

    const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
        setExporting(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            let content = '';
            let filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;

            if (format === 'csv') {
                const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'IP Address', 'Details'];
                content = headers.join(',') + '\n';
                filteredLogs.forEach((log) => {
                    content += `"${log.timestamp}","${log.userName}","${log.action}","${log.resource}","${log.status}","${log.ipAddress}","${log.details}"\n`;
                });
            } else if (format === 'json') {
                content = JSON.stringify(filteredLogs, null, 2);
            } else if (format === 'pdf') {
                content = `AUDIT LOG REPORT\nGenerated: ${new Date().toLocaleString()}\n\n`;
                filteredLogs.forEach((log) => {
                    content += `[${log.timestamp}] ${log.userName} - ${log.action} on ${log.resource} (${log.status})\n`;
                });
            }

            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);

            setShowExportOptions(false);
        } catch (e) {
            // Error handled in UI
        } finally {
            setExporting(false);
        }
    };

    const getActionBadgeColor = (action: AuditLog['action']) => {
        const colors: Record<AuditLog['action'], string> = {
            create: 'badge-primary',
            update: 'badge-info',
            delete: 'badge-danger',
            approve: 'badge-success',
            reject: 'badge-warning',
            login: 'badge-primary',
            logout: 'badge-secondary',
            permission_change: 'badge-warning',
            export: 'badge-info',
            other: 'badge-secondary',
        };
        return colors[action] || 'badge-secondary';
    };

    const getActionLabel = (action: AuditLog['action']) => {
        const labels: Record<AuditLog['action'], string> = {
            create: 'Create',
            update: 'Update',
            delete: 'Delete',
            approve: 'Approve',
            reject: 'Reject',
            login: 'Login',
            logout: 'Logout',
            permission_change: 'Permission',
            export: 'Export',
            other: 'Other',
        };
        return labels[action] || 'Other';
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit & Compliance</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">View detailed audit logs, search history, and export compliance reports</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="panel p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/40">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Logs</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{logs.length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/40">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">Successful</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{logs.filter((l) => l.status === 'success').length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700/40">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Failed</p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">{logs.filter((l) => l.status === 'failure').length}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input type="text" placeholder="Search by user, IP, or details..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10 w-full" />
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`btn ${showFilters ? 'btn-primary' : 'btn-outline-primary'}`}>
                        <IconFilter className="w-4 h-4 mr-2" />
                        Filters
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowExportOptions(!showExportOptions)} className="btn btn-outline-primary">
                            <IconDownload className="w-4 h-4 mr-2" />
                            Export
                        </button>
                        {showExportOptions && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                <button onClick={() => handleExport('csv')} disabled={exporting} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    {exporting ? 'Exporting...' : 'Export as CSV'}
                                </button>
                                <button onClick={() => handleExport('json')} disabled={exporting} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Export as JSON
                                </button>
                                <button onClick={() => handleExport('pdf')} disabled={exporting} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Export as PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detailed Filters */}
                {showFilters && (
                    <div className="panel p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/20">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Action</label>
                            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="form-select w-full">
                                <option value="all">All Actions</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="approve">Approve</option>
                                <option value="reject">Reject</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                                <option value="permission_change">Permission Change</option>
                                <option value="export">Export</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Status</label>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select w-full">
                                <option value="all">All Status</option>
                                <option value="success">Success</option>
                                <option value="failure">Failure</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Date Range</label>
                            <div className="flex gap-2">
                                <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="form-input w-1/2" />
                                <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="form-input w-1/2" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs Table */}
            <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                    <div className="panel text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Resource</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Details</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">IP Address</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.slice(0, 50).map((log) => (
                                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{log.userName}</td>
                                        <td className="px-4 py-3 text-sm font-semibold">
                                            {getActionLabel(log.action)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{log.resource}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{log.details}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{log.ipAddress}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                                                {log.status === 'success' ? (
                                                    <>
                                                        <IconSquareCheck className="w-3 h-3 mr-1 inline" />
                                                        Success
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconAlertCircle className="w-3 h-3 mr-1 inline" />
                                                        Failed
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditCompliance;
