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
import { searchRequests, filterRequests, onlyMine, paginate, formatDate, sortRequestsByDateDesc, adaptRequestsResponse, normalizeStatus } from '../../../utils/requestUtils';
import RequestDetailsContent from '../../../components/RequestDetailsContent';
import { checkExecutiveThreshold, getThresholdBadge, shouldShowThresholdNotification } from '../../../utils/thresholdUtils';
import { getApiUrl } from '../../../config/api';
import { SkeletonTableRow } from '../../../components/SkeletonLoading';

const MySwal = withReactContent(Swal);

const Requests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        dispatch(setPageTitle('Requests'));
    }, [dispatch]);

    const [requests, setRequests] = useState<Request[]>([]);
    const [combinedRequests, setCombinedRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Current user from localStorage (aligns with RequestForm pattern)
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
    const showMineOnly = location.pathname.endsWith('/mine');

    // Load current user (supports session/local storage + legacy userProfile)
    useEffect(() => {
        try {
            const authRaw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            const legacyRaw = localStorage.getItem('userProfile');
            const user = authRaw ? JSON.parse(authRaw) : legacyRaw ? JSON.parse(legacyRaw) : null;
            setCurrentUserName(user?.name || user?.fullName || '');
            setCurrentUserId(user?.id ? Number(user.id) : user?.userId ? Number(user.userId) : null);

            // Safely extract roles, ensuring we have a clean array of strings
            let roles: string[] = [];
            if (user?.roles && Array.isArray(user.roles)) {
                roles = user.roles.filter(Boolean); // Remove any falsy values
            } else if (user?.role) {
                roles = [user.role];
            }
            setCurrentUserRoles(roles);
        } catch {
            setCurrentUserName('');
            setCurrentUserId(null);
            setCurrentUserRoles([]);
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
                const userRaw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
                const user = userRaw ? JSON.parse(userRaw) : null;
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                if (user?.id || currentUserId) headers['x-user-id'] = String(user?.id || currentUserId || '');

                // Fetch regular requests
                const res = await fetch(getApiUrl('/api/requests'), {
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

                // Fetch combined requests if user has procurement access (only after roles are loaded)
                if (
                    currentUserRoles.length > 0 &&
                    currentUserRoles.some((role: any) => {
                        const roleName = typeof role === 'string' ? role : role?.name || '';
                        return roleName.toUpperCase().includes('PROCUREMENT') || roleName.toUpperCase().includes('MANAGER');
                    })
                ) {
                    try {
                        const combinedRes = await fetch(getApiUrl('/api/requests/combinable'), {
                            headers,
                            signal: controller.signal,
                        });
                        if (combinedRes.ok) {
                            const combinedData = await combinedRes.json();
                            // The endpoint returns array of combined request objects when no query param
                            setCombinedRequests(combinedData);
                        } else if (combinedRes.status === 403) {
                            // User doesn't have permission, silently ignore
                            setCombinedRequests([]);
                        }
                    } catch (e) {
                        // Silently fail - combined requests are optional
                        console.debug('Combined requests not available:', e);
                        setCombinedRequests([]);
                    }
                }
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
    }, [currentUserRoles, currentUserId]);

    // URL-synced filters/search/page
    const initParams = new URLSearchParams(location.search);
    const [query, setQuery] = useState<string>(() => initParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState<string>(() => initParams.get('status') || '');
    const [departmentFilter, setDepartmentFilter] = useState<string>(() => initParams.get('dept') || '');

    const sorted = useMemo(() => sortRequestsByDateDesc(requests), [requests]);
    const searched = useMemo(() => searchRequests(sorted, query), [sorted, query]);
    const filteredByMeta = useMemo(() => filterRequests(searched, { status: statusFilter, department: departmentFilter }), [searched, statusFilter, departmentFilter]);
    // Show requests where user is requester or current assignee
    const filteredRequests = useMemo(() => {
        if (!showMineOnly) return filteredByMeta;
        return filteredByMeta.filter((r) => {
            const assigneeRaw = r.currentAssigneeId;
            const assigneeId = typeof assigneeRaw === 'number' ? assigneeRaw : Number(assigneeRaw);
            const matchesAssignee = currentUserId && Number.isFinite(assigneeId) && assigneeId === currentUserId;
            return r.requester === currentUserName || !!matchesAssignee;
        });
    }, [showMineOnly, filteredByMeta, currentUserName, currentUserId]);

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
        if (query) params.set('q', query);
        else params.delete('q');
        if (statusFilter) params.set('status', statusFilter);
        else params.delete('status');
        if (departmentFilter) params.set('dept', departmentFilter);
        else params.delete('dept');
        if (page > 1) params.set('page', String(page));
        else params.delete('page');
        const search = params.toString();
        navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, statusFilter, departmentFilter, page]);

    // Calculate threshold notifications for procurement officers
    const thresholdNotifications = useMemo(() => {
        if (!shouldShowThresholdNotification(currentUserRoles)) return null;

        const highValueRequests = filteredRequests.filter((r) => {
            const procurementTypes = Array.isArray(r.procurementType) ? r.procurementType : [];
            const alert = checkExecutiveThreshold(r.totalEstimated || 0, procurementTypes);
            return alert.isRequired;
        });

        return {
            count: highValueRequests.length,
            requests: highValueRequests,
        };
    }, [currentUserRoles, filteredRequests]);

    // View request details - navigate to form
    const viewDetails = (req: Request) => {
        navigate(`/apps/requests/edit/${req.id}`);
    };
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Requests</h1>
                    <p className="text-sm text-muted-foreground">Manage acquisition and procurement requests</p>
                </div>
                <div>
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-white hover:opacity-95" type="button" onClick={() => navigate('/apps/requests/new')}>
                        <IconPlus />
                        New Request
                    </button>
                </div>
            </div>

            {/* Threshold notification banner for procurement officers */}
            {thresholdNotifications && thresholdNotifications.count > 0 && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-orange-600 text-lg">⚠️</span>
                        <div className="flex-1">
                            <p className="text-orange-800 font-medium">Executive Director Approval Required</p>
                            <p className="text-orange-700 text-sm">
                                {thresholdNotifications.count} request{thresholdNotifications.count !== 1 ? 's' : ''} exceed{thresholdNotifications.count === 1 ? 's' : ''} procurement thresholds and
                                require Executive Director evaluation before proceeding.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter & Search controls */}
            <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
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
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by ID, Title, Requester, Dept"
                        className="form-input w-64"
                        aria-label="Search requests"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="form-select"
                        aria-label="Filter by status"
                    >
                        <option value="">All Statuses</option>
                        {[
                            ...new Set(
                                requests
                                    .map((r) => r.status)
                                    .map((s) => s && s.trim())
                                    .filter(Boolean)
                            ),
                        ]
                            .map((s) => ({ raw: s as string, norm: normalizeStatus(s as string) }))
                            .sort((a, b) => a.norm.localeCompare(b.norm))
                            .map(({ raw, norm }) => (
                                <option key={raw} value={norm}>
                                    {norm}
                                </option>
                            ))}
                    </select>

                    <select
                        value={departmentFilter}
                        onChange={(e) => {
                            setDepartmentFilter(e.target.value);
                            setPage(1);
                        }}
                        className="form-select"
                        aria-label="Filter by department"
                    >
                        <option value="">All Departments</option>
                        {[...new Set(requests.map((f) => f.department).filter(Boolean) as string[])]
                            .sort((a, b) => a.localeCompare(b))
                            .map((dep) => (
                                <option key={dep} value={dep}>
                                    {dep}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Combined Requests Button */}
                {currentUserRoles.some((role: any) => {
                    const roleName = typeof role === 'string' ? role : role?.name || '';
                    return roleName.toUpperCase().includes('PROCUREMENT') || roleName.toUpperCase().includes('MANAGER');
                }) &&
                    combinedRequests.length > 0 && (
                        <button onClick={() => navigate('/apps/requests/combine')} className="btn btn-outline-primary gap-2" type="button">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            View Combined Requests ({combinedRequests.length})
                        </button>
                    )}
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded overflow-x-auto" aria-busy={isLoading}>
                {isLoading && (
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
                            <SkeletonTableRow columns={8} />
                            <SkeletonTableRow columns={8} />
                            <SkeletonTableRow columns={8} />
                            <SkeletonTableRow columns={8} />
                            <SkeletonTableRow columns={8} />
                        </tbody>
                    </table>
                )}
                {error && !isLoading && <div className="p-6 text-center text-sm text-red-600">{error}</div>}
                {!isLoading && !error && filteredRequests.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No requests found.</div>}
                {!isLoading && (
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

                                // Check if this request exceeds executive threshold
                                const procurementTypes = Array.isArray(r.procurementType) ? r.procurementType : [];
                                const thresholdAlert = checkExecutiveThreshold(r.totalEstimated || 0, procurementTypes);
                                const thresholdBadge = getThresholdBadge(thresholdAlert);
                                const showThresholdAlert = shouldShowThresholdNotification(currentUserRoles) && thresholdAlert.isRequired;

                                return (
                                    <tr key={r.id} className="border-t last:border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <td className="px-4 py-3 font-medium">{r.id}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span>{r.title}</span>
                                                {showThresholdAlert && (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${thresholdBadge.className}`}>
                                                            <span>{thresholdBadge.icon}</span>
                                                            {thresholdBadge.text}
                                                        </span>
                                                    </div>
                                                )}
                                                {r.isCombined && r.lotNumber && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                                />
                                                            </svg>
                                                            LOT-{r.lotNumber}
                                                            {r.combinedRequestId && (
                                                                <button
                                                                    type="button"
                                                                    className="ml-1 hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/apps/requests/combined/${r.combinedRequestId}`);
                                                                    }}
                                                                    title="View combined request"
                                                                >
                                                                    →
                                                                </button>
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{r.requester}</td>
                                        <td className="px-4 py-3">{r.department}</td>
                                        <td className="px-4 py-3">
                                            {r.currentAssigneeName ? (
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">{r.currentAssigneeName}</span>
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
                                                    <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700" onClick={() => navigate(`/apps/requests/edit/${r.id}`)}>
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
                )}
                {/* Pagination */}
                {!isLoading && !error && filteredRequests.length > pageSize && (
                    <div className="flex items-center justify-between p-3 text-sm">
                        <div>
                            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRequests.length)} of {filteredRequests.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1 rounded border disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                Previous
                            </button>
                            <span>
                                Page {page} of {pageCount}
                            </span>
                            <button className="px-3 py-1 rounded border disabled:opacity-50" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>
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
