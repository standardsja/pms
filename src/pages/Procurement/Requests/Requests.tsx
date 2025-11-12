import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Request, ApiResponse } from '../../../types/request.types';
import { getStatusBadge } from '../../../utils/statusBadges';
import { searchRequests, filterRequests, onlyMine, paginate, formatDate, sortRequestsByDateDesc, adaptRequestsResponse } from '../../../utils/requestUtils';
import RequestDetailsContent from '../../../components/RequestDetailsContent';

const MySwal = withReactContent(Swal);

const Requests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        dispatch(setPageTitle('Requests'));
    }, [dispatch]);

    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Current user from localStorage (aligns with RequestForm pattern)
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<number|null>(null);
    const showMineOnly = location.pathname.endsWith('/mine');

    // Load current user (supports session/local storage + legacy userProfile)
    useEffect(() => {
        try {
            const authRaw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            const legacyRaw = localStorage.getItem('userProfile');
            const user = authRaw ? JSON.parse(authRaw) : legacyRaw ? JSON.parse(legacyRaw) : null;
            setCurrentUserName(user?.name || user?.fullName || '');
            setCurrentUserId(user?.id ? Number(user.id) : (user?.userId ? Number(user.userId) : null));
        } catch {
            setCurrentUserName('');
            setCurrentUserId(null);
        }
    }, []);

    // Fetch requests from API
    useEffect(() => {
        const controller = new AbortController();
        const fetchRequests = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                // Hitting backend directly on port 4000 since Vite proxy only rewrites '/api' paths.
                // TODO: Move to an env-driven API base and/or add a Vite proxy for '/requests'.
                const res = await fetch('http://localhost:4000/requests', {
                    headers,
                    signal: controller.signal,
                });
                let payload: any = null;
                try {
                    payload = await res.json();
                } catch {
                    /* no-op: non-JSON response */
                }
                if (!res.ok) {
                    const msg = (payload && (payload.message || payload.error)) || res.statusText || 'Failed to load requests';
                    throw new Error(msg);
                }
                const adapted = adaptRequestsResponse(payload);
                setRequests(adapted);
            } catch (e: unknown) {
                // Ignore abort errors
                if (e instanceof DOMException && e.name === 'AbortError') return;
                const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed to load requests';
                setError(String(message));
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
        return () => controller.abort();
    }, []);

    // URL-synced filters/search/page
    const initParams = new URLSearchParams(location.search);
    const [query, setQuery] = useState<string>(() => initParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState<string>(() => initParams.get('status') || '');
    const [departmentFilter, setDepartmentFilter] = useState<string>(() => initParams.get('dept') || '');

    const sorted = useMemo(() => sortRequestsByDateDesc(requests), [requests]);
    const searched = useMemo(() => searchRequests(sorted, query), [sorted, query]);
    const filteredByMeta = useMemo(
        () => filterRequests(searched, { status: statusFilter, department: departmentFilter }),
        [searched, statusFilter, departmentFilter]
    );
    // Show requests where user is requester or current assignee
    const filteredRequests = useMemo(
        () => {
            if (!showMineOnly) return filteredByMeta;
            return filteredByMeta.filter(r => {
                // @ts-ignore: backend may return string or number for id
                const assigneeId = r.currentAssigneeId ? Number(r.currentAssigneeId) : null;
                return (r.requester === currentUserName) || (currentUserId && assigneeId === currentUserId);
            });
        },
        [showMineOnly, filteredByMeta, currentUserName, currentUserId]
    );

    // Pagination
    const [page, setPage] = useState<number>(() => {
        const p = parseInt(initParams.get('page') || '1', 10);
        return Number.isFinite(p) && p > 0 ? p : 1;
    });
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
    const paged = useMemo(() => paginate(filteredRequests, page, pageSize), [filteredRequests, page]);

    // Keep URL query params in sync with current UI state
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (query) params.set('q', query); else params.delete('q');
        if (statusFilter) params.set('status', statusFilter); else params.delete('status');
        if (departmentFilter) params.set('dept', departmentFilter); else params.delete('dept');
        if (page > 1) params.set('page', String(page)); else params.delete('page');
        const search = params.toString();
        navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, statusFilter, departmentFilter, page]);

    // View request details modal (React content, no HTML strings)
    const viewDetails = (req: Request) => {
        MySwal.fire({
            title: `Request Details: ${req.id}`,
            html: <RequestDetailsContent request={req} />,
            width: '800px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: { popup: 'text-left' }
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Requests</h1>
                    <p className="text-sm text-muted-foreground">Manage acquisition and procurement requests</p>
                </div>
                <div>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-white hover:opacity-95"
                        type="button"
                        onClick={() => navigate('/apps/requests/new')}
                    >
                        <IconPlus />
                        New Request
                    </button>
                </div>
            </div>

            {/* Filter & Search controls */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                    className={`px-3 py-1.5 rounded border text-sm ${!showMineOnly ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-600'}`}
                    onClick={() => {
                        if (location.pathname.endsWith('/mine')) {
                            navigate({ pathname: '/apps/requests', search: location.search });
                        }
                    }}
                    type="button"
                    aria-pressed={!showMineOnly}
                    aria-label="Show all requests"
                >
                    All Requests
                </button>
                <button
                    className={`px-3 py-1.5 rounded border text-sm ${showMineOnly ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-600'}`}
                    onClick={() => {
                        if (!location.pathname.endsWith('/mine')) {
                            navigate({ pathname: '/apps/requests/mine', search: location.search });
                        }
                    }}
                    type="button"
                    aria-pressed={showMineOnly}
                    aria-label="Show my requests"
                >
                    My Requests
                </button>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Search by ID, Title, Requester, Dept"
                    className="form-input w-64"
                    aria-label="Search requests"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="form-select"
                    aria-label="Filter by status"
                >
                    <option value="">All Statuses</option>
                    <option>Pending Finance</option>
                    <option>Finance Verified</option>
                    <option>Pending Procurement</option>
                    <option>Approved</option>
                    <option>Returned by Finance</option>
                    <option>Rejected</option>
                    <option>Fulfilled</option>
                </select>

                <select
                    value={departmentFilter}
                    onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                    className="form-select"
                    aria-label="Filter by department"
                >
                    <option value="">All Departments</option>
                    {[...new Set(requests.map(r => r.department).filter(Boolean) as string[])]
                        .sort((a, b) => a.localeCompare(b))
                        .map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                        ))}
                </select>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded overflow-hidden" aria-busy={isLoading}>
                {isLoading && (
                    <div className="p-6 text-center text-sm text-gray-500">Loading requests…</div>
                )}
                {error && !isLoading && (
                    <div className="p-6 text-center text-sm text-red-600">{error}</div>
                )}
                {!isLoading && !error && filteredRequests.length === 0 && (
                    <div className="p-6 text-center text-sm text-gray-500">No requests found.</div>
                )}
                <table className="min-w-full table-auto">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-sm">
                        <tr>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">Title</th>
                            <th className="px-4 py-3 text-left">Requester</th>
                            <th className="px-4 py-3 text-left">Department</th>
                            <th className="px-4 py-3 text-left">Assigned To</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {paged.map((r) => {
                            const badge = getStatusBadge(r.status);
                            return (
                                <tr key={r.id} className="border-t last:border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <td className="px-4 py-3 font-medium">{r.id}</td>
                                    <td className="px-4 py-3">{r.title}</td>
                                    <td className="px-4 py-3">{r.requester}</td>
                                    <td className="px-4 py-3">{r.department}</td>
                                    <td className="px-4 py-3">
                                        {r.currentAssigneeName ? (
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                {r.currentAssigneeName}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`} aria-label={`Status: ${badge.label}`}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{formatDate(r.date)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                                                onClick={() => viewDetails(r)}
                                                title="View Details"
                                                aria-label={`View details for ${r.id}`}
                                            >
                                                <IconEye className="w-5 h-5" />
                                            </button>
                                            {currentUserId && r.currentAssigneeId != null && Number(r.currentAssigneeId) === Number(currentUserId) && (
                                                <button
                                                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                                                    onClick={() => navigate(`/apps/requests/edit/${r.id}`)}
                                                >
                                                    Review
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {/* Pagination */}
                {!isLoading && !error && filteredRequests.length > pageSize && (
                    <div className="flex items-center justify-between p-3 text-sm">
                        <div>
                            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRequests.length)} of {filteredRequests.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className="px-3 py-1 rounded border disabled:opacity-50"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            <span>Page {page} of {pageCount}</span>
                            <button
                                className="px-3 py-1 rounded border disabled:opacity-50"
                                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                                disabled={page === pageCount}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Requests;
