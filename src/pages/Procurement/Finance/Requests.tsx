import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconEye from '../../../components/Icon/IconEye';
import IconEdit from '../../../components/Icon/IconEdit';
import IconPrinter from '../../../components/Icon/IconPrinter';
import { getStatusBadge } from '../../../utils/statusBadges';
import { getApiUrl } from '../../../config/api';

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
    budgetOfficerName?: string;
    budgetManagerName?: string;
    headerDeptCode?: string;
    headerMonth?: string;
    headerYear?: number;
    headerSequence?: number;
}

const FinanceRequests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
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
        console.error('Failed to parse user profile:', err);
    }

    useEffect(() => {
        dispatch(setPageTitle('Finance Verification'));
    }, [dispatch]);

    // Fetch requests with FINANCE_REVIEW or BUDGET_MANAGER_REVIEW status
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!currentUserId) {
                    throw new Error('User not logged in');
                }

                const res = await fetch(getApiUrl('/api/requests'), {
                    headers: {
                        'x-user-id': String(currentUserId),
                        'Content-Type': 'application/json',
                    },
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error('Backend error response:', errorText);
                    throw new Error(`Failed to fetch requests (${res.status})`);
                }

                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await res.text();
                    console.error('Non-JSON response:', text);
                    throw new Error('Server returned invalid response');
                }

                const data = await res.json();

                // Safely filter for finance-related statuses
                const financeRequests = Array.isArray(data) ? data.filter((r: any) => r && (r.status === 'FINANCE_REVIEW' || r.status === 'BUDGET_MANAGER_REVIEW')) : [];

                setRequests(financeRequests);
            } catch (err: any) {
                console.error('Error fetching finance requests:', err);
                setError(err.message || 'Failed to load requests');
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [currentUserId]);

    const pending = useMemo(() => requests.filter((r) => r.status === 'FINANCE_REVIEW' || r.status === 'BUDGET_MANAGER_REVIEW'), [requests]);

    const viewDetails = (req: Req) => {
        // Navigate to the request form in edit mode
        navigate(`/apps/requests/edit/${req.id}`);
    };

    // Navigate to edit the request (Finance officers can edit budget fields)
    const editRequest = (req: Req) => {
        navigate(`/apps/requests/edit/${req.id}`);
    };

    // Print/Download PDF
    const downloadPdf = (req: Req) => {
        const url = getApiUrl(`/requests/${req.id}/pdf`);
        window.open(url, '_blank');
    };

    const handleAction = async (req: Req, action: 'approve' | 'return') => {
        const result = await MySwal.fire({
            title: action === 'approve' ? 'Approve Request for Budget Verification' : 'Return Request',
            html: `
        <div style="text-align: left; margin-bottom: 16px; background: #f9fafb; padding: 12px; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>Request:</strong> ${req.reference} - ${req.title}</p>
          <p style="margin: 4px 0;"><strong>Requester:</strong> ${req.requester.name}</p>
          <p style="margin: 4px 0;"><strong>Department:</strong> ${req.department.name}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> ${req.currency} $${(Number(req.totalEstimated) || 0).toFixed(2)}</p>
          ${req.accountingCode ? `<p style="margin: 4px 0;"><strong>Accounting Code:</strong> ${req.accountingCode}</p>` : ''}
        </div>
        ${
            action === 'approve'
                ? '<p style="margin-bottom: 12px;">Confirm that budget is available and funds can be allocated for this request.</p>'
                : '<p style="margin-bottom: 12px; color: #dc2626; font-weight: 500;">Please provide a reason for returning this request to the requester.</p>'
        }
      `,
            input: 'textarea',
            inputLabel: action === 'approve' ? 'Comment (Optional)' : 'Comment (Required)',
            inputPlaceholder:
                action === 'approve'
                    ? 'Add any notes about budget allocation, conditions, or restrictions...'
                    : 'Explain why the request is being returned (e.g., budget unavailable, missing information, incorrect accounting code)...',
            inputAttributes: {
                'aria-label': 'Comment',
                rows: '4',
            },
            inputValidator: (value) => {
                if (action === 'return' && !value?.trim()) {
                    return 'A comment is required to return a request';
                }
                return undefined;
            },
            showCancelButton: true,
            confirmButtonText: action === 'approve' ? 'Approve & Verify Budget' : 'Return to Requester',
            confirmButtonColor: action === 'approve' ? '#16a34a' : '#dc2626',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            const comment = (result.value as string) || '';

            try {
                // Call backend API to approve or reject
                const apiAction = action === 'approve' ? 'APPROVE' : 'REJECT';
                const res = await fetch(getApiUrl(`/api/requests/${req.id}/action`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUserId || ''),
                    },
                    body: JSON.stringify({
                        action: apiAction,
                        comment: comment.trim() || undefined,
                    }),
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to process action');
                }

                // Remove from list after successful action
                setRequests((prev) => prev.filter((r) => r.id !== req.id));

                await MySwal.fire({
                    icon: 'success',
                    title: action === 'approve' ? 'Request Approved' : 'Request Returned',
                    html: comment
                        ? `<div style="text-align:left; margin-top: 12px;"><strong>Your comment:</strong><br/><div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 6px;">${comment}</div></div>`
                        : undefined,
                    timer: 2000,
                    showConfirmButton: false,
                });
            } catch (err: any) {
                console.error('Error processing action:', err);
                MySwal.fire({
                    icon: 'error',
                    title: 'Action Failed',
                    text: err.message || 'Failed to process the action. Please try again.',
                });
            }
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
                <h1 className="text-2xl font-semibold">Finance Verification Queue</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Review and approve procurement requests assigned to Finance. Use <strong>Approve</strong> to advance requests or <strong>Return</strong> with required comments to send back to
                    requester.
                </p>
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
                                <th className="px-4 py-3 text-left w-64">Actions</th>
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
                                            <p className="font-medium">No requests pending finance verification</p>
                                            <p className="text-xs">Finance requests will appear here when submitted for review</p>
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
                                                    title="Edit Budget Fields"
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
                                                <button
                                                    className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition-colors"
                                                    onClick={() => handleAction(r, 'approve')}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 text-xs font-medium transition-colors"
                                                    onClick={() => handleAction(r, 'return')}
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
                        Showing {pending.length} request{pending.length !== 1 ? 's' : ''} pending finance review
                    </p>
                </div>
            )}
        </div>
    );
};

export default FinanceRequests;
