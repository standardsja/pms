import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { HiddenRequest } from '../../../services/adminService';
import { getAuthHeadersSync } from '../../../utils/api';
import { getApiUrl } from '../../../config/api';
import { format } from 'date-fns';
import IconRefresh from '../../../components/Icon/IconRefresh';
import IconEye from '../../../components/Icon/IconEye';
import IconRestore from '../../../components/Icon/IconRestore';
import IconArchive from '../../../components/Icon/IconArchive';
import IconSearch from '../../../components/Icon/IconSearch';
import IconFilter from '../../../components/Icon/IconFilter';

const pageSize = 15;

const HiddenRequests: React.FC = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<HiddenRequest[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [departmentId, setDepartmentId] = useState<string>('');
    const [hiddenById, setHiddenById] = useState<string>('');
    const [reasonInput, setReasonInput] = useState<string>('');
    const [actionId, setActionId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Hidden Requests'));
    }, [dispatch]);

    const fetchHidden = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('limit', String(pageSize));
            params.set('offset', String((page - 1) * pageSize));
            if (departmentId) params.set('department', departmentId);
            if (hiddenById) params.set('hiddenBy', hiddenById);

            const res = await fetch(getApiUrl(`/api/admin/requests/hidden?${params.toString()}`), {
                headers: getAuthHeadersSync(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || data?.error || 'Failed to load hidden requests');
            }
            setItems(data.data || []);
            setTotal(data.pagination?.total || 0);
        } catch (e: any) {
            setError(e?.message || 'Failed to load hidden requests');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHidden();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, departmentId, hiddenById]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

    const handleUnhide = async (id: number) => {
        setActionId(id);
        setError(null);
        try {
            const body = reasonInput ? { reason: reasonInput } : {};
            const res = await fetch(getApiUrl(`/api/admin/requests/${id}/unhide`), {
                method: 'POST',
                headers: getAuthHeadersSync(),
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.message || data?.error || 'Failed to unhide request');
            }
            setReasonInput('');
            await fetchHidden();
        } catch (e: any) {
            setError(e?.message || 'Failed to unhide request');
        } finally {
            setActionId(null);
        }
    };

    const formatDate = (value?: string | null) => {
        if (!value) return '—';
        try {
            return format(new Date(value), 'yyyy-MM-dd HH:mm');
        } catch {
            return value;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">Hidden Requests</h1>
                    <p className="text-sm text-gray-500">Admin-only view of requests removed from primary lists.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input type="text" value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} placeholder="Reason for hide/unhide" className="form-input w-64" />
                    <button type="button" className="btn btn-outline-secondary" onClick={fetchHidden} disabled={isLoading}>
                        <IconRefresh className="w-4 h-4" />
                        <span className="ml-2">Refresh</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-dark p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <IconSearch className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                        <label className="text-xs text-gray-500">Department ID</label>
                        <input type="number" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="form-input w-full" placeholder="e.g. 5" />
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-dark p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <IconFilter className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                        <label className="text-xs text-gray-500">Hidden By (User ID)</label>
                        <input type="number" value={hiddenById} onChange={(e) => setHiddenById(e.target.value)} className="form-input w-full" placeholder="e.g. 12" />
                    </div>
                </div>
                <div className="bg-white dark:bg-dark p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500">Total hidden</p>
                        <p className="text-lg font-semibold">{total}</p>
                    </div>
                    <IconArchive className="w-6 h-6 text-primary" />
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="overflow-x-auto bg-white dark:bg-dark rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-dark-light/20">
                        <tr>
                            <th className="px-4 py-3 text-left">Ref</th>
                            <th className="px-4 py-3 text-left">Title</th>
                            <th className="px-4 py-3 text-left">Department</th>
                            <th className="px-4 py-3 text-left">Requester</th>
                            <th className="px-4 py-3 text-left">Hidden By</th>
                            <th className="px-4 py-3 text-left">Hidden At</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                                    Loading hidden requests...
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                                    No hidden requests found.
                                </td>
                            </tr>
                        ) : (
                            items.map((req) => (
                                <tr key={req.id} className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="px-4 py-3 font-semibold">{req.reference}</td>
                                    <td className="px-4 py-3 max-w-xs truncate" title={req.title}>
                                        {req.title}
                                    </td>
                                    <td className="px-4 py-3">{req.department?.name || '—'}</td>
                                    <td className="px-4 py-3">{req.requester?.name || req.requester?.email || '—'}</td>
                                    <td className="px-4 py-3">{req.hiddenBy?.name || req.hiddenBy?.email || '—'}</td>
                                    <td className="px-4 py-3">{formatDate(req.hiddenAt)}</td>
                                    <td className="px-4 py-3 max-w-xs truncate" title={req.hiddenReason || ''}>
                                        {req.hiddenReason || '—'}
                                    </td>
                                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                                        <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUnhide(req.id)} disabled={actionId === req.id}>
                                            <IconRestore className="w-4 h-4" />
                                            <span className="ml-1">Unhide</span>
                                        </button>
                                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => window.open(`/apps/requests/edit/${req.id}`, '_blank')}>
                                            <IconEye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        Prev
                    </button>
                    <button type="button" className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HiddenRequests;
