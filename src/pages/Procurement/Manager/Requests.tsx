import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconEye from '../../../components/Icon/IconEye';
import IconEdit from '../../../components/Icon/IconEdit';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import { getStatusBadge } from '../../../utils/statusBadges';
import { getApiUrl } from '../../../config/api';
import { getAuthHeadersSync } from '../../../utils/api';

const MySwal = withReactContent(Swal);

interface Req {
    id: number;
    reference: string;
    title: string;
    description?: string;
    requester: { id: number; name: string; email: string };
    department: { id: number; name: string; code: string };
    status: string;
    createdAt: string;
    totalEstimated: number | null;
    currency: string;
    priority: string;
    commitmentNumber?: string;
    accountingCode?: string;
    budgetComments?: string;
    headerDeptCode?: string;
    headerMonth?: string;
    headerYear?: number;
    headerSequence?: number;
    currentAssigneeId?: number;
}

const ProcurementManagerRequests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<Req[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialLoad, setInitialLoad] = useState(true);

    // UI-only enhancements: client-side filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
    const [filterPriority, setFilterPriority] = useState<string>('ALL');

    const toast = (title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        MySwal.fire({
            toast: true,
            icon,
            title,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
        });

    // Get current user profile - with error handling
    let userProfile: any = {};
    let currentUserId: number | null = null;

    try {
        // Check modern auth storage first
        const authUserStr = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
        if (authUserStr) {
            userProfile = JSON.parse(authUserStr);
            currentUserId = userProfile?.id || userProfile?.userId || null;
        } else {
            // Fallback to legacy storage
            const profileStr = localStorage.getItem('userProfile');
            if (profileStr) {
                userProfile = JSON.parse(profileStr);
                currentUserId = userProfile?.id || userProfile?.userId || null;
            }
        }
    } catch (err) {
        console.error('Error parsing user profile:', err);
    }

    useEffect(() => {
        dispatch(setPageTitle('Procurement Manager - All Requests'));
    }, [dispatch]);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            setError(null);

            try {
                const baseHeaders = getAuthHeadersSync();
                const res = await fetch(getApiUrl('/api/requests'), {
                    headers: {
                        ...baseHeaders,
                        ...(currentUserId ? { 'x-user-id': String(currentUserId) } : {}),
                    },
                });

                // Check if response is JSON
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await res.text();
                    console.error('Non-JSON response:', text);
                    throw new Error('Server returned invalid response');
                }

                const data = await res.json();

                // Filter for PROCUREMENT_REVIEW status (requests that need procurement manager attention)
                const procurementRequests = Array.isArray(data) ? data.filter((r: any) => r && r.status === 'PROCUREMENT_REVIEW') : [];

                setRequests(procurementRequests);
            } catch (err: any) {
                console.error('Error fetching procurement requests:', err);
                setError(err.message || 'Failed to load requests');
                toast(err.message || 'Failed to load requests', 'error');
            } finally {
                setLoading(false);
                setInitialLoad(false);
            }
        };

        fetchRequests();
    }, []);

    // Filter requests at PROCUREMENT_REVIEW status
    const pending = useMemo(() => requests.filter((r) => r.status === 'PROCUREMENT_REVIEW'), [requests]);

    // Client-side filtering for UI refinement
    const filteredRequests = useMemo(() => {
        let data = [...pending];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter((r) => [r.reference, r.title, r.requester.name, r.department.name, r.accountingCode].some((field) => field?.toLowerCase().includes(q)));
        }
        if (filterDepartment !== 'ALL') data = data.filter((r) => r.department.name === filterDepartment);
        if (filterPriority !== 'ALL') data = data.filter((r) => r.priority === filterPriority);
        return data;
    }, [pending, searchQuery, filterDepartment, filterPriority]);

    const distinctDepartments = useMemo(() => {
        const setDep = new Set<string>();
        pending.forEach((r) => r.department.name && setDep.add(r.department.name));
        return Array.from(setDep).sort();
    }, [pending]);

    const viewDetails = (req: Req) => {
        // Navigate to the request form in edit mode
        navigate(`/apps/requests/edit/${req.id}`);
    };

    // Navigate to edit the request (Procurement Manager can edit procurement fields)
    const editRequest = (req: Req) => {
        navigate(`/apps/requests/edit/${req.id}`);
    };

    // Print/Download PDF
    const downloadPdf = (req: Req) => {
        const url = getApiUrl(`/requests/${req.id}/pdf`);
        window.open(url, '_blank');
    };

    const handleSelfAssign = async (req: Req) => {
        const result = await MySwal.fire({
            title: 'Assign to Self',
            html: `
                <div style="text-align: left; margin-bottom: 16px; background: #f9fafb; padding: 12px; border-radius: 4px;">
                  <p style="margin: 4px 0;"><strong>Request:</strong> ${req.reference} - ${req.title}</p>
                  <p style="margin: 4px 0;"><strong>Requester:</strong> ${req.requester.name}</p>
                  <p style="margin: 4px 0;"><strong>Department:</strong> ${req.department.name}</p>
                  <p style="margin: 4px 0;"><strong>Amount:</strong> ${req.currency} $${(Number(req.totalEstimated) || 0).toFixed(2)}</p>
                </div>
                <p style="margin-bottom: 12px;">Assign this request to yourself for processing?</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Assign to Me',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            try {
                const baseHeaders = getAuthHeadersSync();
                const res = await fetch(getApiUrl(`/api/requests/${req.id}/assign`), {
                    method: 'POST',
                    headers: {
                        ...baseHeaders,
                        ...(currentUserId ? { 'x-user-id': String(currentUserId) } : {}),
                    },
                    body: JSON.stringify({
                        assigneeId: currentUserId,
                    }),
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to assign request');
                }

                // Remove from list after successful assignment
                setRequests((prev) => prev.filter((r) => r.id !== req.id));

                toast('Request assigned to you', 'success');
            } catch (err: any) {
                console.error('Error assigning request:', err);
                toast(err.message || 'Failed to assign the request', 'error');
            }
        }
    };

    const handleAssignToOfficer = (req: Req) => {
        // Navigate to assignment page with this request
        navigate(`/procurement/manager/assign?requestId=${req.id}`);
    };

    const handleReturn = async (req: Req) => {
        const result = await MySwal.fire({
            title: 'Return Request',
            html: `
                <div style="text-align: left; margin-bottom: 16px; background: #f9fafb; padding: 12px; border-radius: 4px;">
                  <p style="margin: 4px 0;"><strong>Request:</strong> ${req.reference} - ${req.title}</p>
                  <p style="margin: 4px 0;"><strong>Requester:</strong> ${req.requester.name}</p>
                  <p style="margin: 4px 0;"><strong>Department:</strong> ${req.department.name}</p>
                  <p style="margin: 4px 0;"><strong>Amount:</strong> ${req.currency} $${(Number(req.totalEstimated) || 0).toFixed(2)}</p>
                </div>
                <p style="margin-bottom: 12px; color: #dc2626; font-weight: 500;">Please provide a reason for returning this request to the requester.</p>
            `,
            input: 'textarea',
            inputLabel: 'Comment (Required)',
            inputPlaceholder: 'Explain why the request is being returned (e.g., budget unavailable, missing information, incorrect accounting code)...',
            inputAttributes: { 'aria-label': 'Comment', rows: '4' },
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'A comment is required to return a request';
                return undefined;
            },
            showCancelButton: true,
            confirmButtonText: 'Return to Requester',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;
        const comment = (result.value as string) || '';

        try {
            const baseHeaders = getAuthHeadersSync();
            const res = await fetch(getApiUrl(`/api/requests/${req.id}/action`), {
                method: 'POST',
                headers: {
                    ...baseHeaders,
                    ...(currentUserId ? { 'x-user-id': String(currentUserId) } : {}),
                },
                body: JSON.stringify({ action: 'REJECT', comment: comment.trim() || undefined }),
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to return request');
            }

            setRequests((prev) => prev.filter((r) => r.id !== req.id));

            await MySwal.fire({
                icon: 'success',
                title: 'Request Returned',
                html: comment
                    ? `<div style="text-align:left; margin-top: 12px;"><strong>Your comment:</strong><br/><div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 6px;">${comment}</div></div>`
                    : undefined,
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (err: any) {
            console.error('Error returning request:', err);
            toast(err.message || 'Failed to return the request', 'error');
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
        <main className="space-y-6">
            {/* Page Header */}
            <section className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-primary p-6 text-white shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight drop-shadow-sm">Procurement Manager Queue</h1>
                        <p className="text-white/90 text-sm leading-relaxed max-w-2xl">
                            Review requests awaiting procurement processing. Self-assign or delegate to procurement officers for efficient workflow management.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 min-w-[140px]">
                            <div className="text-xs uppercase tracking-wide text-white/70">Total Queue</div>
                            <div className="text-xl font-bold">{pending.length}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 min-w-[140px]">
                            <div className="text-xs uppercase tracking-wide text-white/70">Filtered</div>
                            <div className="text-xl font-bold">{filteredRequests.length}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 min-w-[140px]">
                            <div className="text-xs uppercase tracking-wide text-white/70">Departments</div>
                            <div className="text-xl font-bold">{distinctDepartments.length}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="panel border-t-4 border-primary">
                <div className="panel-header flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-lg font-semibold">Filter & Refine</h2>
                    <div className="text-xs text-gray-500">Refine visible requests before assigning. Filters are client-side only.</div>
                </div>
                <div className="panel-body grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Search</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Reference, title, requester, dept, code..."
                            className="form-input"
                            aria-label="Search requests"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Department</label>
                        <select className="form-select" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} aria-label="Filter by department">
                            <option value="ALL">All Departments</option>
                            {distinctDepartments.map((dep) => (
                                <option key={dep} value={dep}>
                                    {dep}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Priority</label>
                        <select className="form-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} aria-label="Filter by priority">
                            <option value="ALL">All Priorities</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Requests Table */}
            <div className="panel overflow-hidden">
                <div className="panel-header flex items-center justify-between">
                    <h5 className="font-semibold text-lg">Pending Requests</h5>
                    <div className="text-xs text-gray-500">
                        Showing {filteredRequests.length} of {pending.length}
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Requester</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Department</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Acct Code</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {initialLoad &&
                                loading &&
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={9} className="px-4 py-3">
                                            <div className="h-4 w-full animate-pulse bg-gray-200 rounded" />
                                        </td>
                                    </tr>
                                ))}
                            {!loading && filteredRequests.length === 0 && (
                                <tr>
                                    <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <p className="font-medium">{pending.length === 0 ? 'No requests pending procurement' : 'No requests match current filters'}</p>
                                            <p className="text-xs">{pending.length === 0 ? 'Requests will appear here when approved by finance' : 'Try adjusting your search or filter criteria'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                filteredRequests.map((r) => {
                                    // Format the form code from header fields
                                    const deptCode = r.headerDeptCode || r.department.code || '---';
                                    const month = r.headerMonth || '---';
                                    const year = r.headerYear || '----';
                                    const sequence = r.headerSequence !== undefined && r.headerSequence !== null ? String(r.headerSequence).padStart(3, '0') : '000';
                                    const formCode = `[${deptCode}]/[${month}]/[${year}]/[${sequence}]`;

                                    return (
                                        <tr key={r.id} className="border-t hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-semibold text-primary">{formCode}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-xs">{r.title}</div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{r.requester.name}</td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-info text-white whitespace-nowrap">
                                                    {r.department.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {(() => {
                                                    const badge = getStatusBadge(r.status);
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${badge.bg} ${badge.text}`}
                                                            aria-label={`Status ${badge.label}`}
                                                        >
                                                            {badge.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {r.currency} ${(Number(r.totalEstimated) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{r.accountingCode || '—'}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    {/* Icon Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                                                            onClick={() => viewDetails(r)}
                                                            title="View Full Details"
                                                            aria-label="View details"
                                                        >
                                                            <IconEye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-colors"
                                                            onClick={() => editRequest(r)}
                                                            title="Edit Request"
                                                            aria-label="Edit request"
                                                        >
                                                            <IconEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                                                            onClick={() => downloadPdf(r)}
                                                            title="Download PDF"
                                                            aria-label="Download PDF"
                                                        >
                                                            <IconPrinter className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Primary Actions */}
                                                    <div className="flex items-center gap-1.5 ml-1">
                                                        <button
                                                            className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap"
                                                            onClick={() => handleSelfAssign(r)}
                                                            title="Assign to Self"
                                                        >
                                                            Assign to Me
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-sm transition-all whitespace-nowrap"
                                                            onClick={() => handleAssignToOfficer(r)}
                                                            title="Assign to Officer"
                                                        >
                                                            <IconUsersGroup className="w-3.5 h-3.5" />
                                                            Assign
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-sm transition-all whitespace-nowrap"
                                                            onClick={() => handleReturn(r)}
                                                            title="Return Request"
                                                        >
                                                            Return
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};

export default ProcurementManagerRequests;
