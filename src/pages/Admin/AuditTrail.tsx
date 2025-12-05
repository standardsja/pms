import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface AuditLog {
    id: number;
    userId: number | null;
    user: {
        id: number;
        name: string;
        email: string;
    } | null;
    action: string;
    entity: string;
    entityId: number | null;
    message: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: any;
    createdAt: string;
}

const AuditTrailPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        action: '',
        entity: '',
        userId: '',
        startDate: '',
        endDate: '',
    });
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [searchMode, setSearchMode] = useState<'recent' | 'search'>('recent');

    const ITEMS_PER_PAGE = 50;

    // Fetch available actions for filter dropdown
    useEffect(() => {
        fetchAvailableActions();
    }, []);

    // Fetch logs on mount and when page/filters change
    useEffect(() => {
        if (searchMode === 'recent') {
            fetchRecentLogs();
        }
    }, [page, searchMode]);

    const fetchAvailableActions = async () => {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const res = await fetch('/api/audit/actions', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableActions(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch actions:', err);
        }
    };

    const fetchRecentLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const res = await fetch(`/api/audit/recent?limit=${ITEMS_PER_PAGE}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error(res.status === 403 ? 'Admin access required' : 'Failed to fetch audit logs');
            }

            const data = await res.json();
            setLogs(data.data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSearchMode('search');

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const res = await fetch('/api/audit/search', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...filters,
                    userId: filters.userId ? parseInt(filters.userId) : undefined,
                    limit: ITEMS_PER_PAGE,
                }),
            });

            if (!res.ok) {
                throw new Error('Search failed');
            }

            const data = await res.json();
            setLogs(data.data || []);
        } catch (err: any) {
            setError(err.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            action: '',
            entity: '',
            userId: '',
            startDate: '',
            endDate: '',
        });
        setSearchMode('recent');
        setPage(1);
    };

    const getActionBadgeColor = (action: string): string => {
        if (action.includes('LOGIN')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        if (action.includes('APPROVED') || action.includes('GRANTED')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        if (action.includes('REJECTED') || action.includes('DENIED') || action.includes('FAILED')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        if (action.includes('DELETED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        if (action.includes('CREATED')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        if (action.includes('UPDATED')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Audit Trail</h1>
                    <p className="text-gray-600 dark:text-gray-400">Complete system activity log for compliance and security monitoring</p>
                </div>

                {/* Search Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search Filters</h2>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                                <select
                                    value={filters.action}
                                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">All Actions</option>
                                    {availableActions.map((action) => (
                                        <option key={action} value={action}>
                                            {action.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity</label>
                                <input
                                    type="text"
                                    value={filters.entity}
                                    onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                                    placeholder="e.g., ProcurementRequest"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
                                <input
                                    type="number"
                                    value={filters.userId}
                                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                                    placeholder="User ID"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                        <p className="text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* Audit Logs Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center p-12">
                                <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {log.user ? (
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">{log.user.name}</div>
                                                        <div className="text-gray-500 dark:text-gray-400">{log.user.email}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">System</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                {log.entity}
                                                {log.entityId && <span className="text-gray-500 dark:text-gray-400"> #{log.entityId}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">{log.message}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.ipAddress || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Summary */}
                {logs.length > 0 && <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">Showing {logs.length} audit log entries</div>}
            </div>
        </div>
    );
};

export default AuditTrailPage;
