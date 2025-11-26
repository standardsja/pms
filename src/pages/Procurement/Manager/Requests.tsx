import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconEye from '../../../components/Icon/IconEye';
import IconEdit from '../../../components/Icon/IconEdit';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import { getStatusBadge } from '../../../utils/statusBadges';
import { selectAuthLoading, selectUser } from '../../../store/authSlice';

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
    const authLoading = useSelector(selectAuthLoading);
    const authUser = useSelector(selectUser);
    const [requests, setRequests] = useState<Req[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get current user profile - with error handling
    let userProfile: any = {};
    let currentUserId: number | null = null;

    try {
        const profileStr = localStorage.getItem('userProfile');
        if (profileStr) {
            userProfile = JSON.parse(profileStr);
            currentUserId = userProfile?.id || userProfile?.userId || null;
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
                const apiUrl = 'http://heron:4000';
                const res = await fetch(`${apiUrl}/requests`, {
                    headers: {
                        'x-user-id': String(currentUserId || ''),
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
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    // Auth gate spinner
    if (authLoading || !authUser) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Filter requests at PROCUREMENT_REVIEW status
    const pending = useMemo(() => requests.filter((r) => r.status === 'PROCUREMENT_REVIEW'), [requests]);

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
        const apiUrl = 'http://heron:4000';
        const url = `${apiUrl}/requests/${req.id}/pdf`;
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
                const apiUrl = 'http://heron:4000';
                const res = await fetch(`${apiUrl}/requests/${req.id}/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUserId || ''),
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

                MySwal.fire({
                    icon: 'success',
                    title: 'Request Assigned',
                    text: 'The request has been assigned to you.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            } catch (err: any) {
                console.error('Error assigning request:', err);
                MySwal.fire({
                    icon: 'error',
                    title: 'Assignment Failed',
                    text: err.message || 'Failed to assign the request. Please try again.',
                });
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
            const apiUrl = 'http://heron:4000';
            const res = await fetch(`${apiUrl}/requests/${req.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUserId || ''),
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
            MySwal.fire({ icon: 'error', title: 'Return Failed', text: err.message || 'Failed to return the request. Please try again.' });
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
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Procurement Manager Queue</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review requests awaiting procurement processing. You can self-assign requests or delegate them to procurement officers.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-sm font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-left">Reference</th>
                                <th className="px-4 py-3 text-left">Title</th>
                                <th className="px-4 py-3 text-left">Requester</th>
                                <th className="px-4 py-3 text-left">Department</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Amount</th>
                                <th className="px-4 py-3 text-left">Acct Code</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left w-80">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {pending.length === 0 && (
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
                                            <p className="font-medium">No requests pending procurement</p>
                                            <p className="text-xs">Requests will appear here when approved by finance</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {pending.map((r) => {
                                // Format the form code from header fields
                                const deptCode = r.headerDeptCode || r.department.code || '---';
                                const month = r.headerMonth || '---';
                                const year = r.headerYear || '----';
                                const sequence = r.headerSequence !== undefined && r.headerSequence !== null ? String(r.headerSequence).padStart(3, '0') : '000';
                                const formCode = `[${deptCode}]/[${month}]/[${year}]/[${sequence}]`;

                                return (
                                    <tr key={r.id} className="border-t last:border-b hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                        <td className="px-4 py-3 font-medium text-primary">{formCode}</td>
                                        <td className="px-4 py-3">{r.title}</td>
                                        <td className="px-4 py-3">{r.requester.name}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {r.department.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const badge = getStatusBadge(r.status);
                                                return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {r.currency} ${(Number(r.totalEstimated) || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono">{r.accountingCode || '—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 items-center">
                                                <button
                                                    className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                                                    onClick={() => viewDetails(r)}
                                                    title="View Full Details"
                                                >
                                                    <IconEye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-colors"
                                                    onClick={() => editRequest(r)}
                                                    title="Edit Request"
                                                >
                                                    <IconEdit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                                                    onClick={() => downloadPdf(r)}
                                                    title="Download PDF"
                                                >
                                                    <IconPrinter className="w-5 h-5" />
                                                </button>
                                                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                                                <button
                                                    className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                                                    onClick={() => handleSelfAssign(r)}
                                                    title="Assign to Self"
                                                >
                                                    Assign to Me
                                                </button>
                                                <button
                                                    className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors flex items-center gap-1"
                                                    onClick={() => handleAssignToOfficer(r)}
                                                    title="Assign to Officer"
                                                >
                                                    <IconUsersGroup className="w-4 h-4" />
                                                    Assign
                                                </button>
                                                <button
                                                    className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                                                    onClick={() => handleReturn(r)}
                                                    title="Return Request"
                                                >
                                                    Return
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {pending.length > 0 && (
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <p>
                        Showing {pending.length} request{pending.length !== 1 ? 's' : ''} awaiting procurement assignment
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProcurementManagerRequests;
