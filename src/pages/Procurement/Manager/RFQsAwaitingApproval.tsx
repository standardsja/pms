import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';


type RFQ = {
    id: string;
    title: string;
    requester: string;
    amount: number;
    date: string; // ISO or display string
    status: 'Pending Approval' | 'Approved';
};

const RFQsAwaitingApproval = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle('RFQs Awaiting Approval'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initialRFQs: RFQ[] = useMemo(
        () => [
            { id: 'RFQ-1024', title: 'Laptops for IT', requester: 'IT Department', amount: 1250000, date: '2025-10-10', status: 'Pending Approval' },
            { id: 'RFQ-1027', title: 'Office Chairs', requester: 'Facilities', amount: 420000, date: '2025-10-18', status: 'Pending Approval' },
            { id: 'RFQ-1030', title: 'Network Switches', requester: 'IT Infrastructure', amount: 980000, date: '2025-10-22', status: 'Pending Approval' },
        ],
        []
    );

    const [rfqs, setRfqs] = useState<RFQ[]>(initialRFQs);
    const [approveTarget, setApproveTarget] = useState<RFQ | null>(null);

    const currency = (n: number) => new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 0 }).format(n);
    const dateFmt = (s: string) => new Date(s).toLocaleDateString();

    const pendingRFQs = rfqs.filter((r) => r.status === 'Pending Approval');

    const confirmApprove = () => {
        if (!approveTarget) return;
        setRfqs((prev) => prev.map((r) => (r.id === approveTarget.id ? { ...r, status: 'Approved' } : r)));
        setApproveTarget(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">RFQs awaiting approval</h1>
                <Link to="/procurement/manager" className="text-primary hover:text-primary-dark">Back to Manager Dashboard</Link>
            </div>

            <div className="panel">
                {pendingRFQs.length === 0 ? (
                    <p className="text-gray-500">No RFQs pending approval.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>RFQ</th>
                                    <th>Requester</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRFQs.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="font-semibold">{r.title}</div>
                                            <div className="text-xs text-white-dark">{r.id}</div>
                                        </td>
                                        <td>{r.requester}</td>
                                        <td>{currency(r.amount)}</td>
                                        <td>{dateFmt(r.date)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Link to={`/procurement/rfq/${encodeURIComponent(r.id)}`} className="btn btn-outline-primary btn-sm flex items-center gap-1">
                                                    <IconEye className="w-4 h-4" /> View
                                                </Link>
                                                <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={() => setApproveTarget(r)}>
                                                    <IconChecks className="w-4 h-4" /> Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {approveTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setApproveTarget(null)} />
                    <div className="relative bg-white dark:bg-black rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-2">Approve RFQ</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Are you sure you want to approve <span className="font-semibold">{approveTarget.title}</span> ({approveTarget.id}) for dispatch?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button className="btn btn-outline-primary" onClick={() => setApproveTarget(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={confirmApprove}>
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQsAwaitingApproval;
