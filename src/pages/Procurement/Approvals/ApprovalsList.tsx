import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconEye from '../../../components/Icon/IconEye';
import IconClock from '../../../components/Icon/IconClock';
import IconInbox from '../../../components/Icon/IconInbox';
import { getApiUrl } from '../../../utils/api';

interface Approval {
    id: number;
    type: string;
    number: string;
    description: string;
    requester: string;
    department: string;
    amount: number;
    submittedDate: string;
    dueDate: string | null;
    priority: string;
    documents: number;
    status?: string;
}

const ApprovalsList = () => {
    const dispatch = useDispatch();
    const [filter, setFilter] = useState('all');
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Pending Approvals'));
        fetchApprovals();
    }, [dispatch]);

    const fetchApprovals = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');

            const response = await fetch(getApiUrl('/api/approvals'), {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-user-id': userId || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch approvals');
            }

            const data = await response.json();
            setApprovals(data);
        } catch (err) {
            console.error('Error fetching approvals:', err);
            setError(err instanceof Error ? err.message : 'Failed to load approvals');
        } finally {
            setLoading(false);
        }
    };

    const filteredApprovals = filter === 'all' ? approvals : approvals.filter((a) => a.type === filter);

    const getTypeBadge = (type: string) => {
        const badges: Record<string, string> = {
            Request: 'bg-primary',
            Evaluation: 'bg-warning',
            PO: 'bg-success',
            Payment: 'bg-info',
        };
        return badges[type] || 'bg-secondary';
    };

    const getPriorityBadge = (priority: string) => {
        const badges: Record<string, string> = {
            High: 'bg-danger',
            Medium: 'bg-warning',
            Low: 'bg-info',
        };
        return badges[priority] || 'bg-secondary';
    };

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const handleApprove = async (id: number) => {
        console.log('Approved:', id);
        // TODO: Implement approval logic
        // After approval, refresh the list
        await fetchApprovals();
    };

    const handleReject = async (id: number) => {
        console.log('Rejected:', id);
        // TODO: Implement rejection logic
        // After rejection, refresh the list
        await fetchApprovals();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-white-dark">Loading approvals...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <IconX className="mx-auto mb-4 h-16 w-16 text-danger" />
                    <h3 className="mb-2 text-lg font-semibold text-danger">Error Loading Approvals</h3>
                    <p className="text-white-dark mb-4">{error}</p>
                    <button onClick={fetchApprovals} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Pending Approvals</h2>
                <p className="text-white-dark">Review and approve procurement items</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Pending</div>
                        <IconInbox className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">{approvals.length}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">High Priority</div>
                        <IconClock className="h-6 w-6 text-danger" />
                    </div>
                    <div className="text-3xl font-bold text-danger">{approvals.filter((a) => a.priority === 'High').length}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Value</div>
                        <IconInbox className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">${approvals.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Overdue</div>
                        <IconClock className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">{approvals.filter((a) => isOverdue(a.dueDate)).length}</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="panel mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setFilter('all')} className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        All ({approvals.length})
                    </button>
                    <button type="button" onClick={() => setFilter('Request')} className={`btn btn-sm ${filter === 'Request' ? 'btn-primary' : 'btn-outline-primary'}`}>
                        Requests ({approvals.filter((a) => a.type === 'Request').length})
                    </button>

                    <button type="button" onClick={() => setFilter('PO')} className={`btn btn-sm ${filter === 'PO' ? 'btn-success' : 'btn-outline-success'}`}>
                        Purchase Orders ({approvals.filter((a) => a.type === 'PO').length})
                    </button>
                    <button type="button" onClick={() => setFilter('Payment')} className={`btn btn-sm ${filter === 'Payment' ? 'btn-info' : 'btn-outline-info'}`}>
                        Payments ({approvals.filter((a) => a.type === 'Payment').length})
                    </button>
                </div>
            </div>

            {/* Approvals List */}
            <div className="space-y-4">
                {filteredApprovals.map((approval) => (
                    <div key={approval.id} className="panel">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            {/* Left Section */}
                            <div className="flex-1">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className={`badge ${getTypeBadge(approval.type)}`}>{approval.type}</span>
                                    <span className={`badge ${getPriorityBadge(approval.priority)}`}>{approval.priority}</span>
                                    {isOverdue(approval.dueDate) && <span className="badge bg-danger">Overdue</span>}
                                </div>
                                <h5 className="mb-2 text-lg font-bold">
                                    <Link to={`/procurement/approvals/${approval.id}`} className="hover:text-primary">
                                        {approval.number} - {approval.description}
                                    </Link>
                                </h5>
                                <div className="grid gap-2 text-sm text-white-dark sm:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <span className="font-semibold">Requester:</span> {approval.requester}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Department:</span> {approval.department}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Amount:</span> <span className="font-bold text-success">${approval.amount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Submitted:</span> {approval.submittedDate}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Due Date:</span>{' '}
                                        {approval.dueDate ? (
                                            <span className={isOverdue(approval.dueDate) ? 'text-danger font-semibold' : ''}>{approval.dueDate}</span>
                                        ) : (
                                            <span className="text-white-dark">N/A</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Documents:</span> {approval.documents}
                                    </div>
                                </div>
                            </div>

                            {/* Right Section - Actions */}
                            <div className="flex flex-wrap gap-2 lg:flex-col">
                                <Link to={`/procurement/approvals/${approval.id}`} className="btn btn-outline-primary btn-sm flex items-center gap-2">
                                    <IconEye className="h-4 w-4" />
                                    View Details
                                </Link>
                                <button type="button" onClick={() => handleApprove(approval.id)} className="btn btn-success btn-sm flex items-center gap-2">
                                    <IconChecks className="h-4 w-4" />
                                    Approve
                                </button>
                                <button type="button" onClick={() => handleReject(approval.id)} className="btn btn-danger btn-sm flex items-center gap-2">
                                    <IconX className="h-4 w-4" />
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredApprovals.length === 0 && (
                    <div className="panel text-center">
                        <div className="py-8">
                            <IconInbox className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                            <h3 className="mb-2 text-lg font-semibold">No approvals found</h3>
                            <p className="text-white-dark">There are no pending approvals matching your filter.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApprovalsList;
