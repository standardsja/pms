import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconSend from '../../../components/Icon/IconSend';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Request, ApiResponse } from '../../../types/request.types';
import { getStatusBadge } from '../../../utils/statusBadges';
import { searchRequests, filterRequests, onlyMine, paginate, formatDate, sortRequestsByDateDesc, adaptRequestsResponse, normalizeStatus } from '../../../utils/requestUtils';
import RequestDetailsContent from '../../../components/RequestDetailsContent';
import { checkExecutiveThreshold, getThresholdBadge, shouldShowThresholdNotification } from '../../../utils/thresholdUtils';

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
                // Roles might be strings or objects with a 'name' property
                roles = user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name)).filter(Boolean); // Remove any falsy values
            } else if (user?.role) {
                roles = [typeof user.role === 'string' ? user.role : user.role?.name || ''];
            }
            setCurrentUserRoles(roles);
        } catch (err) {
            console.error('Error loading user:', err);
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
                const headers: Record<string, string> = {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    Pragma: 'no-cache',
                };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                // Use backend API URL based on current hostname
                const apiUrl = 'http://heron:4000';
                const res = await fetch(`${apiUrl}/requests`, {
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
    const filteredByMeta = useMemo(() => filterRequests(searched, { status: statusFilter, department: departmentFilter }), [searched, statusFilter, departmentFilter]);

    // Check if user is Executive Director
    const isExecutiveDirector = useMemo(() => {
        return currentUserRoles.some((role) => {
            const roleUpper = role.toUpperCase();
            return roleUpper === 'EXECUTIVE_DIRECTOR' || roleUpper === 'EXECUTIVE' || (roleUpper.includes('EXECUTIVE') && roleUpper.includes('DIRECTOR'));
        });
    }, [currentUserRoles]);

    // Filter requests based on route and user role
    const filteredRequests = useMemo(() => {
        // On /mine route, show only user's requests and assigned requests
        if (showMineOnly) {
            return filteredByMeta.filter((r) => {
                const assigneeId = r.currentAssigneeId ? Number(r.currentAssigneeId) : null;
                return r.requester === currentUserName || (currentUserId && assigneeId === currentUserId);
            });
        }

        // Executive Directors on main page see EXECUTIVE_REVIEW requests assigned to them
        if (isExecutiveDirector && !showMineOnly) {
            return filteredByMeta.filter((r) => {
                const assigneeId = r.currentAssigneeId ? Number(r.currentAssigneeId) : null;
                const isAssignedToMe = currentUserId && assigneeId === currentUserId;
                const normalizedStatus = normalizeStatus(r.status || '');

                // Show EXECUTIVE_REVIEW requests assigned to this executive
                if (normalizedStatus === 'Executive Review' && isAssignedToMe) {
                    return true;
                }

                // Also show requests they created
                return r.requester === currentUserName;
            });
        }

        // Everyone else sees all requests (filtered by status/department)
        return filteredByMeta;
    }, [showMineOnly, filteredByMeta, currentUserName, currentUserId, isExecutiveDirector]);

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
            const normalizedStatus = normalizeStatus(r.status || '');
            // Only count requests that need forwarding (exceed threshold AND not already in executive review)
            return alert.isRequired && normalizedStatus !== 'Executive Review';
        });

        return {
            count: highValueRequests.length,
            requests: highValueRequests,
        };
    }, [currentUserRoles, filteredRequests]);

    // View request details modal (React content, no HTML strings)
    const viewDetails = (req: Request) => {
        MySwal.fire({
            html: <RequestDetailsContent request={req} />,
            width: '800px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: { popup: 'text-left' },
        });
    };

    // Forward request to executive director (for procurement managers)
    const forwardToExecutive = async (req: Request) => {
        // Check if user is procurement manager
        const isProcurementManager = currentUserRoles.some((role) => {
            const roleUpper = role.toUpperCase();
            return ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(roleUpper) || (roleUpper.includes('PROCUREMENT') && roleUpper.includes('MANAGER'));
        });

        if (!isProcurementManager) {
            MySwal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'Only procurement managers can forward requests to Executive Director',
            });
            return;
        }

        // Check if request exceeds threshold
        const procurementTypes = Array.isArray(req.procurementType) ? req.procurementType : [];
        const thresholdAlert = checkExecutiveThreshold(req.totalEstimated || 0, procurementTypes, req.currency);

        if (!thresholdAlert.isRequired) {
            MySwal.fire({
                icon: 'info',
                title: 'No Executive Approval Needed',
                text: `This request (${req.currency} ${(req.totalEstimated || 0).toLocaleString()}) does not exceed the threshold for executive approval.`,
            });
            return;
        }

        // Confirm forward action
        const result = await MySwal.fire({
            title: 'Forward to Executive Director?',
            html: `
                <div class="text-left">
                    <p class="mb-2">Request: <strong>${req.title}</strong></p>
                    <p class="mb-2">Value: <strong>${req.currency} ${(req.totalEstimated || 0).toLocaleString()}</strong></p>
                    <p class="mb-4">This request exceeds the ${thresholdAlert.category} threshold and requires Executive Director approval.</p>
                    <label class="block mb-2 font-medium">Optional Comment:</label>
                    <textarea
                        id="forward-comment"
                        class="w-full p-2 border rounded"
                        rows="3"
                        placeholder="Add a note for the Executive Director..."
                    ></textarea>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Forward to Executive',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3085d6',
            preConfirm: () => {
                const comment = (document.getElementById('forward-comment') as HTMLTextAreaElement)?.value || '';
                return comment;
            },
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : `http://${window.location.hostname}:4000`;

            const response = await fetch(`${apiUrl}/requests/${req.id}/forward-to-executive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    comment: result.value || '',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to forward request');
            }

            MySwal.fire({
                icon: 'success',
                title: 'Request Forwarded',
                text: 'The request has been forwarded to the Executive Director for approval.',
            });

            // Refresh the requests list
            window.location.reload();
        } catch (error) {
            MySwal.fire({
                icon: 'error',
                title: 'Forward Failed',
                text: error instanceof Error ? error.message : 'Failed to forward request',
            });
        }
    };

    // Executive Director approve/reject action
    const handleExecutiveAction = async (req: Request, action: 'APPROVE' | 'REJECT') => {
        const result = await MySwal.fire({
            title: action === 'APPROVE' ? 'Approve Request?' : 'Reject Request?',
            html: `
                <div class="text-left">
                    <p class="mb-2">Request: <strong>${req.title}</strong></p>
                    <p class="mb-2">Value: <strong>${req.currency} ${(req.totalEstimated || 0).toLocaleString()}</strong></p>
                    <p class="mb-4">${
                        action === 'APPROVE'
                            ? 'This will approve the request and send it back to the Procurement Manager for processing.'
                            : 'This will reject the request and send it back to the requester as a draft.'
                    }</p>
                    <label class="block mb-2 font-medium">Comment ${action === 'REJECT' ? '(Required)' : '(Optional)'}:</label>
                    <textarea
                        id="executive-comment"
                        class="w-full p-2 border rounded"
                        rows="3"
                        placeholder="${action === 'APPROVE' ? 'Add any notes or conditions...' : 'Please explain why this request is being rejected...'}"
                    ></textarea>
                </div>
            `,
            icon: action === 'APPROVE' ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonText: action === 'APPROVE' ? 'Approve' : 'Reject',
            cancelButtonText: 'Cancel',
            confirmButtonColor: action === 'APPROVE' ? '#10b981' : '#ef4444',
            preConfirm: () => {
                const comment = (document.getElementById('executive-comment') as HTMLTextAreaElement)?.value || '';
                if (action === 'REJECT' && !comment.trim()) {
                    MySwal.showValidationMessage('Please provide a reason for rejection');
                    return false;
                }
                return comment;
            },
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : `http://${window.location.hostname}:4000`;

            const response = await fetch(`${apiUrl}/requests/${req.id}/executive-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action,
                    comment: result.value || '',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to process action');
            }

            MySwal.fire({
                icon: 'success',
                title: action === 'APPROVE' ? 'Request Approved' : 'Request Rejected',
                text: data.message || `The request has been ${action === 'APPROVE' ? 'approved and sent to Procurement Manager' : 'rejected'}.`,
            });

            // Refresh the requests list
            window.location.reload();
        } catch (error) {
            MySwal.fire({
                icon: 'error',
                title: 'Action Failed',
                text: error instanceof Error ? error.message : 'Failed to process action',
            });
        }
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

            <div className="bg-white dark:bg-slate-800 shadow rounded overflow-hidden" aria-busy={isLoading}>
                {isLoading && <div className="p-6 text-center text-sm text-gray-500">Loading requests…</div>}
                {error && !isLoading && <div className="p-6 text-center text-sm text-red-600">{error}</div>}
                {!isLoading && !error && filteredRequests.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No requests found.</div>}
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
                            const normalizedStatus = normalizeStatus(r.status || '');
                            // Only show threshold alert if it needs executive approval AND is not already in executive review/approved
                            const showThresholdAlert =
                                shouldShowThresholdNotification(currentUserRoles) && thresholdAlert.isRequired && normalizedStatus !== 'Executive Review' && normalizedStatus !== 'Executive Approved';

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
                                            {(() => {
                                                const normalizedStatus = normalizeStatus(r.status || '');
                                                const isAssignedToMe = currentUserId && r.currentAssigneeId && Number(r.currentAssigneeId) === Number(currentUserId);

                                                // Executive Director approve/reject buttons for EXECUTIVE_REVIEW requests
                                                if (isExecutiveDirector && normalizedStatus === 'Executive Review' && isAssignedToMe) {
                                                    return (
                                                        <>
                                                            <button
                                                                className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium flex items-center gap-1"
                                                                onClick={() => handleExecutiveAction(r, 'APPROVE')}
                                                                title="Approve Request"
                                                                aria-label={`Approve request ${r.id}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <span>Approve</span>
                                                            </button>
                                                            <button
                                                                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1"
                                                                onClick={() => handleExecutiveAction(r, 'REJECT')}
                                                                title="Reject Request"
                                                                aria-label={`Reject request ${r.id}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                                <span>Reject</span>
                                                            </button>
                                                        </>
                                                    );
                                                }

                                                // Procurement Manager forward button
                                                const isProcurementManager = currentUserRoles.some((role) => {
                                                    const roleUpper = role.toUpperCase();
                                                    return ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(roleUpper) || (roleUpper.includes('PROCUREMENT') && roleUpper.includes('MANAGER'));
                                                });
                                                const procurementTypes = Array.isArray(r.procurementType) ? r.procurementType : [];
                                                const thresholdAlert = checkExecutiveThreshold(r.totalEstimated || 0, procurementTypes, r.currency);
                                                const showForwardButton = isProcurementManager && thresholdAlert.isRequired && normalizedStatus !== 'Executive Review';

                                                return showForwardButton ? (
                                                    <button
                                                        className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium flex items-center gap-1"
                                                        onClick={() => forwardToExecutive(r)}
                                                        title="Forward to Executive Director"
                                                        aria-label={`Forward request ${r.id} to Executive Director`}
                                                    >
                                                        <IconSend className="w-4 h-4" />
                                                        <span>Forward</span>
                                                    </button>
                                                ) : null;
                                            })()}
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
