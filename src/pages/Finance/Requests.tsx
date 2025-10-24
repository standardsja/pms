import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconEye from '../../components/Icon/IconEye';

const MySwal = withReactContent(Swal);

interface Req {
  id: string;
  title: string;
  requester: string;
  department: string;
  status: string;
  date: string;
  totalEstimated: number;
  fundingSource: string;
  budgetCode?: string;
  justification: string;
}

const FinanceRequests = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setPageTitle('Finance Verification'));
  }, [dispatch]);

  const [requests, setRequests] = useState<Req[]>([
    { 
      id: 'REQ-001', 
      title: 'Purchase Office Chairs', 
      requester: 'Alice Johnson', 
      department: 'HR', 
      status: 'Pending Finance', 
      date: '2025-10-20',
      totalEstimated: 5400.00,
      fundingSource: 'Operational Budget',
      budgetCode: 'OP-2025-HR-001',
      justification: 'Current chairs are worn out and causing ergonomic issues. Need 18 chairs for new office layout.'
    },
    { 
      id: 'REQ-002', 
      title: 'Subscription: Design Tool', 
      requester: 'Mark Benson', 
      department: 'Design', 
      status: 'Approved', 
      date: '2025-10-14',
      totalEstimated: 2400.00,
      fundingSource: 'Operational Budget',
      budgetCode: 'OP-2025-DES-003',
      justification: 'Annual license renewal for Adobe Creative Cloud for design team (10 users).'
    },
    { 
      id: 'REQ-003', 
      title: 'Laptop Replacement', 
      requester: 'Samuel Lee', 
      department: 'Engineering', 
      status: 'Pending Finance', 
      date: '2025-09-30',
      totalEstimated: 3200.00,
      fundingSource: 'Capital Budget',
      budgetCode: 'CAP-2025-ENG-012',
      justification: 'Replace 5-year-old laptop with slow performance affecting development work. Required for new project requirements.'
    },
  ]);

  const pending = useMemo(() => requests.filter(r => r.status === 'Pending Finance'), [requests]);

  const viewDetails = async (req: Req) => {
    await MySwal.fire({
      title: `${req.id}: ${req.title}`,
      html: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>Requester:</strong> ${req.requester}</p>
          <p><strong>Department:</strong> ${req.department}</p>
          <p><strong>Date Submitted:</strong> ${req.date}</p>
          <hr style="margin: 12px 0;" />
          <p><strong>Total Estimated Cost:</strong> $${req.totalEstimated.toFixed(2)}</p>
          <p><strong>Funding Source:</strong> ${req.fundingSource}</p>
          ${req.budgetCode ? `<p><strong>Budget Code:</strong> ${req.budgetCode}</p>` : ''}
          <hr style="margin: 12px 0;" />
          <p><strong>Justification:</strong></p>
          <p style="background: #f3f4f6; padding: 8px; border-radius: 4px; font-size: 0.9em;">${req.justification}</p>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Close',
    });
  };

  const handleAction = async (req: Req, action: 'approve' | 'return') => {
    const result = await MySwal.fire({
      title: action === 'approve' ? 'Approve Request for Budget Verification' : 'Return Request',
      html: `
        <div style="text-align: left; margin-bottom: 16px; background: #f9fafb; padding: 12px; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>Request:</strong> ${req.id} - ${req.title}</p>
          <p style="margin: 4px 0;"><strong>Amount:</strong> $${req.totalEstimated.toFixed(2)}</p>
          <p style="margin: 4px 0;"><strong>Budget:</strong> ${req.fundingSource}${req.budgetCode ? ` (${req.budgetCode})` : ''}</p>
        </div>
        ${action === 'approve' 
          ? '<p style="margin-bottom: 12px;">Confirm that budget is available and funds can be allocated for this request.</p>' 
          : '<p style="margin-bottom: 12px;">Please provide a reason for returning this request to the requester.</p>'}
      `,
      input: 'textarea',
      inputLabel: action === 'approve' ? 'Comment (Optional)' : 'Comment (Required)',
      inputPlaceholder: action === 'approve' 
        ? 'Add any notes about budget allocation, conditions, or restrictions...' 
        : 'Explain why the request is being returned (budget unavailable, missing information, etc.)...',
      inputAttributes: { 'aria-label': 'Comment' },
      inputValidator: (value) => {
        if (action === 'return' && !value) return 'A comment is required to return a request';
        return undefined;
      },
      showCancelButton: true,
      confirmButtonText: action === 'approve' ? 'Approve & Verify Budget' : 'Return to Requester',
      confirmButtonColor: action === 'approve' ? '#16a34a' : '#ef4444',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      const comment = (result.value as string) || '';
      setRequests(prev => prev.map(r => {
        if (r.id !== req.id) return r;
        return {
          ...r,
          status: action === 'approve' ? 'Finance Verified' : 'Returned by Finance',
        };
      }));

      // basic escaping to avoid injecting HTML via comment
      const safe = (s: string) => s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]);
      await MySwal.fire({
        icon: 'success',
        title: action === 'approve' ? 'Verified' : 'Returned',
        html: comment ? `<div style=\"text-align:left\"><strong>Comment:</strong><br/>${safe(comment)}</div>` : undefined,
        timer: 1200,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Finance Verification Queue</h1>
        <p className="text-sm text-muted-foreground">Approve or return acquisition requests with comments</p>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow rounded overflow-hidden">
        <table className="min-w-full table-auto">
          <thead className="bg-slate-50 dark:bg-slate-700 text-sm">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Requester</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Budget Code</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {pending.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>No requests pending finance verification.</td>
              </tr>
            )}
            {pending.map((r) => (
              <tr key={r.id} className="border-t last:border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-4 py-3 font-medium">{r.id}</td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3">{r.requester}</td>
                <td className="px-4 py-3">{r.department}</td>
                <td className="px-4 py-3 font-medium">${r.totalEstimated.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs">{r.budgetCode || '—'}</td>
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                      onClick={() => viewDetails(r)}
                      title="View Details"
                    >
                      <IconEye className="w-5 h-5" />
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-emerald-600 text-white hover:opacity-95 text-xs font-medium"
                      onClick={() => handleAction(r, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-rose-600 text-white hover:opacity-95 text-xs font-medium"
                      onClick={() => handleAction(r, 'return')}
                    >
                      Return
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceRequests;
