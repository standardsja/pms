import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconClock from '../../../components/Icon/IconClock';
import IconDollarSign from '../../../components/Icon/IconDollarSign';

interface Request {
    id: number;
    number: string;
    description: string;
    estimatedValue: number;
    status: string;
    priority: string;
    createdAt: string;
    requester: { name: string; email: string };
    department: { name: string };
}

interface DashboardStats {
    pendingHighValueApprovals: number;
    totalRequestsThisMonth: number;
    totalApprovedValue: number;
    pendingBudgetApprovals: number;
}

const ExecutiveDashboard = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<Request[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        pendingHighValueApprovals: 0,
        totalRequestsThisMonth: 0,
        totalApprovedValue: 0,
        pendingBudgetApprovals: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Executive Director Dashboard'));
        loadData();
    }, [dispatch]);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            // Fetch pending high-value requests requiring executive approval
            const response = await fetch(getApiUrl('/api/requests?status=EXECUTIVE_PENDING&sortBy=estimatedValue&sortOrder=desc'), { headers });
            const data = await response.json();

            setRequests(data.requests || []);

            // Calculate stats
            const pendingCount = data.requests?.length || 0;
            const totalValue = data.requests?.reduce((sum: number, req: Request) => sum + (req.estimatedValue || 0), 0) || 0;

            setStats({
                pendingHighValueApprovals: pendingCount,
                totalRequestsThisMonth: data.total || 0,
                totalApprovedValue: totalValue,
                pendingBudgetApprovals: pendingCount,
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(getApiUrl(`/api/requests/${requestId}/approve`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: 'Approved by Executive Director' }),
            });
            loadData();
        } catch (error) {
            console.error('Error approving request:', error);
        }
    };

    const handleReject = async (requestId: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(getApiUrl(`/api/requests/${requestId}/reject`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: 'Rejected by Executive Director' }),
            });
            loadData();
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Executive Director Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">High-value procurement approvals and oversight</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Pending High-Value Approvals</div>
                        <IconClock className="h-5 w-5 text-warning" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.pendingHighValueApprovals}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Total Requests This Month</div>
                        <IconChecks className="h-5 w-5 text-success" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.totalRequestsThisMonth}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Total Approved Value</div>
                        <IconDollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatCurrency(stats.totalApprovedValue)}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Budget Approvals Required</div>
                        <IconDollarSign className="h-5 w-5 text-info" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.pendingBudgetApprovals}</div>
                    </div>
                </div>
            </div>

            {/* Pending Approvals Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">High-Value Requests Pending Approval</h5>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></span>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">No pending high-value requests</div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Request #</th>
                                    <th>Description</th>
                                    <th>Department</th>
                                    <th>Requester</th>
                                    <th>Estimated Value</th>
                                    <th>Priority</th>
                                    <th>Date</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((request) => (
                                    <tr key={request.id}>
                                        <td>
                                            <div className="font-semibold text-primary">{request.number}</div>
                                        </td>
                                        <td>
                                            <div className="whitespace-nowrap">{request.description}</div>
                                        </td>
                                        <td>{request.department?.name || '-'}</td>
                                        <td>
                                            <div className="text-sm">
                                                <div className="font-semibold">{request.requester?.name}</div>
                                                <div className="text-gray-500">{request.requester?.email}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold text-success">{formatCurrency(request.estimatedValue)}</div>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    request.priority === 'HIGH' ? 'badge-outline-danger' : request.priority === 'MEDIUM' ? 'badge-outline-warning' : 'badge-outline-info'
                                                }`}
                                            >
                                                {request.priority}
                                            </span>
                                        </td>
                                        <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center justify-center gap-2">
                                                <Link to={`/apps/requests/${request.id}`} className="btn btn-sm btn-outline-primary">
                                                    <IconEye className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => handleApprove(request.id)} className="btn btn-sm btn-outline-success" title="Approve">
                                                    <IconChecks className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleReject(request.id)} className="btn btn-sm btn-outline-danger" title="Reject">
                                                    <IconX className="h-4 w-4" />
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
        </div>
    );
};

export default ExecutiveDashboard;
