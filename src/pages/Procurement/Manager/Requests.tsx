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

    // Print/Download PDF - Modern formatted print
    const downloadPdf = async (req: Req) => {
        try {
            // Fetch full request details including approval history
            const baseHeaders = getAuthHeadersSync();
            const res = await fetch(getApiUrl(`/api/requests/${req.id}`), {
                headers: {
                    ...baseHeaders,
                    ...(currentUserId ? { 'x-user-id': String(currentUserId) } : {}),
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to fetch request:', errorText);
                throw new Error('Failed to fetch request details');
            }

            const responseData = await res.json();
            console.log('Request data:', responseData);
            const request = responseData.data || responseData;

            // Fetch approval history/actions
            const actionsRes = await fetch(getApiUrl(`/api/requests/${req.id}/actions`), {
                headers: {
                    ...baseHeaders,
                    ...(currentUserId ? { 'x-user-id': String(currentUserId) } : {}),
                },
            });

            let approvalHistory: any[] = [];
            if (actionsRes.ok) {
                const actionsData = await actionsRes.json();
                console.log('Actions data:', actionsData);
                approvalHistory = actionsData.data || [];
            } else {
                console.warn('Could not fetch approval history');
            }

            // Generate formatted print view
            printFormattedRequest(request, approvalHistory);
        } catch (error: any) {
            console.error('Print error:', error);
            toast(error.message || 'Failed to generate print view', 'error');
        }
    };

    const printFormattedRequest = (request: any, approvalHistory: any[]) => {
        try {
            console.log('Generating print view for request:', request);
            
            // Helper to format dates without timezone issues
            const formatDateSafe = (dateString: string | null | undefined): string => {
                if (!dateString) return '—';
                try {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                        const [year, month, day] = dateString.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                } catch (e) {
                    return '—';
                }
            };

            const formatCurrency = (value: any): string => {
                if (value == null) return '0.00';
                try {
                    return parseFloat(String(value)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } catch (e) {
                    return '0.00';
                }
            };

            // Build approval timeline from history
            const approvals = approvalHistory
                .filter((a) => a.action === 'APPROVED' || a.action === 'REVIEWED')
                .map((a) => ({
                    role: a.note || 'Approved',
                    approver: a.performedBy?.name || 'Unknown',
                    date: formatDateSafe(a.createdAt),
                }));

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow popups to print');
                return;
            }

            printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Procurement Request - ${request.reference}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #f3f4f6;
            padding: 20px;
        }
        .page {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            font-size: 24px;
            margin-bottom: 8px;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 14px;
        }
        .section {
            margin-bottom: 24px;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        .field-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 12px;
        }
        .field {
            margin-bottom: 8px;
        }
        .field-label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .field-value {
            font-size: 13px;
            color: #1f2937;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        .items-table th {
            background: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
        }
        .items-table td {
            padding: 10px;
            font-size: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table tr:last-child td {
            border-bottom: none;
        }
        .approval-timeline {
            margin-top: 12px;
        }
        .approval-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f9fafb;
            border-left: 4px solid #10b981;
            margin-bottom: 8px;
            border-radius: 4px;
        }
        .approval-item .icon {
            width: 32px;
            height: 32px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-right: 12px;
            font-size: 16px;
        }
        .approval-item .content {
            flex: 1;
        }
        .approval-item .role {
            font-weight: 600;
            color: #1f2937;
            font-size: 13px;
        }
        .approval-item .approver {
            color: #6b7280;
            font-size: 12px;
        }
        .approval-item .date {
            color: #9ca3af;
            font-size: 11px;
            text-align: right;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-submitted { background: #dbeafe; color: #1e40af; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-procurement { background: #fef3c7; color: #92400e; }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 11px;
        }
        @media print {
            body { background: white; padding: 0; }
            .page { box-shadow: none; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>Bureau of Standards Jamaica</h1>
            <div class="subtitle">Procurement Requisition Form</div>
            <div style="margin-top: 12px; color: #1e40af; font-weight: 600;">
                ${request.reference}
            </div>
        </div>

        <!-- Basic Information -->
        <div class="section">
            <div class="section-title">Request Information</div>
            <div class="field-row">
                <div class="field">
                    <div class="field-label">Reference Number</div>
                    <div class="field-value">${request.reference || '—'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Status</div>
                    <div class="field-value">
                        <span class="status-badge status-${request.status?.toLowerCase().replace(/_/g, '-') || 'submitted'}">
                            ${request.status || 'SUBMITTED'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="field-row">
                <div class="field">
                    <div class="field-label">Submitted Date</div>
                    <div class="field-value">${formatDateSafe(request.submittedAt)}</div>
                </div>
                <div class="field">
                    <div class="field-label">Priority</div>
                    <div class="field-value">${request.priority || 'NORMAL'}</div>
                </div>
            </div>
            <div class="field-row">
                <div class="field">
                    <div class="field-label">Requester</div>
                    <div class="field-value">${request.requester?.name || '—'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Department</div>
                    <div class="field-value">${request.department?.name || '—'}</div>
                </div>
            </div>
            <div class="field">
                <div class="field-label">Title/Description</div>
                <div class="field-value">${request.title || request.description || '—'}</div>
            </div>
        </div>

        <!-- Financial Information -->
        <div class="section">
            <div class="section-title">Financial Details</div>
            <div class="field-row">
                <div class="field">
                    <div class="field-label">Currency</div>
                    <div class="field-value">${request.currency || 'JMD'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Total Estimated Amount</div>
                    <div class="field-value" style="font-weight: 600; color: #1e40af;">
                        ${request.currency || 'JMD'} $${formatCurrency(request.totalEstimated)}
                    </div>
                </div>
            </div>
            ${
                request.accountingCode || request.commitmentNumber
                    ? `
            <div class="field-row">
                ${request.accountingCode ? `<div class="field"><div class="field-label">Accounting Code</div><div class="field-value">${request.accountingCode}</div></div>` : ''}
                ${request.commitmentNumber ? `<div class="field"><div class="field-label">Commitment Number</div><div class="field-value">${request.commitmentNumber}</div></div>` : ''}
            </div>
            `
                    : ''
            }
        </div>

        <!-- Procurement Information -->
        ${
            request.procurementCaseNumber || request.receivedBy || request.dateReceived || request.actionDate || request.procurementComments || request.currentAssignee
                ? `
        <div class="section">
            <div class="section-title">Procurement Processing Details</div>
            ${
                request.procurementCaseNumber || request.receivedBy
                    ? `
            <div class="field-row">
                ${request.procurementCaseNumber ? `<div class="field"><div class="field-label">Procurement Case Number</div><div class="field-value">${request.procurementCaseNumber}</div></div>` : ''}
                ${request.receivedBy ? `<div class="field"><div class="field-label">Received By</div><div class="field-value">${request.receivedBy}</div></div>` : ''}
            </div>
            `
                    : ''
            }
            ${
                request.dateReceived || request.actionDate
                    ? `
            <div class="field-row">
                ${request.dateReceived ? `<div class="field"><div class="field-label">Date Received</div><div class="field-value">${formatDateSafe(request.dateReceived)}</div></div>` : ''}
                ${request.actionDate ? `<div class="field"><div class="field-label">Action Date</div><div class="field-value">${formatDateSafe(request.actionDate)}</div></div>` : ''}
            </div>
            `
                    : ''
            }
            ${
                request.currentAssignee
                    ? `
            <div class="field">
                <div class="field-label">Currently Assigned To</div>
                <div class="field-value">${request.currentAssignee.name} (${request.currentAssignee.email || ''})</div>
            </div>
            `
                    : ''
            }
            ${
                request.procurementComments
                    ? `
            <div class="field">
                <div class="field-label">Procurement Comments</div>
                <div class="field-value" style="white-space: pre-wrap;">${request.procurementComments}</div>
            </div>
            `
                    : ''
            }
        </div>
        `
                : ''
        }

        <!-- Items -->
        ${
            request.items && request.items.length > 0
                ? `
        <div class="section">
            <div class="section-title">Requested Items</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>Description</th>
                        <th style="width: 80px; text-align: center;">Quantity</th>
                        <th style="width: 120px; text-align: right;">Unit Price</th>
                        <th style="width: 120px; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${request.items
                        .map(
                            (item: any, idx: number) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${item.description || '—'}</td>
                        <td style="text-align: center;">${item.quantity || '—'}</td>
                        <td style="text-align: right;">$${formatCurrency(item.unitPrice)}</td>
                        <td style="text-align: right;">$${formatCurrency((parseFloat(String(item.quantity || 0)) * parseFloat(String(item.unitPrice || 0))).toFixed(2))}</td>
                    </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table>
        </div>
        `
                : ''
        }

        <!-- Approval History -->
        ${
            approvals.length > 0
                ? `
        <div class="section">
            <div class="section-title">Approval History</div>
            <div class="approval-timeline">
                ${approvals
                    .map(
                        (approval: any) => `
                <div class="approval-item">
                    <div class="icon">✓</div>
                    <div class="content">
                        <div class="role">${approval.role}</div>
                        <div class="approver">${approval.approver}</div>
                    </div>
                    <div class="date">${approval.date}</div>
                </div>
                `
                    )
                    .join('')}
            </div>
        </div>
        `
                : ''
        }

        <div class="footer">
            <p>This is an automatically generated procurement request form from the Procurement Management System (SPINX)</p>
            <p>Generated on ${new Date().toLocaleString('en-US')}</p>
        </div>
    </div>

    <script>
        window.onload = () => {
            window.print();
        };
    </script>
</body>
</html>
        `);

            printWindow.document.close();
        } catch (err) {
            console.error('Error in printFormattedRequest:', err);
            toast('Failed to generate print view', 'error');
        }
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
