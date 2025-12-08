import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import { getUser } from '../../../utils/auth';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconClock from '../../../components/Icon/IconClock';
import IconUsers from '../../../components/Icon/IconUsers';

interface Request {
    id: number;
    number: string;
    description: string;
    estimatedValue: number;
    status: string;
    priority: string;
    createdAt: string;
    requester: { name: string; email: string };
}

interface DashboardStats {
    pendingTeamRequests: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
    teamMembers: number;
}

const DepartmentHeadDashboard = () => {
    const dispatch = useDispatch();
    const currentUser = getUser();
    const [requests, setRequests] = useState<Request[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        pendingTeamRequests: 0,
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
        teamMembers: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Department Head Dashboard'));
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

            // Fetch pending requests from user's department
            const response = await fetch(getApiUrl('/api/requests?status=DEPT_HEAD_PENDING&includeTeam=true'), { headers });
            const data = await response.json();

            setRequests(data.requests || []);

            setStats({
                pendingTeamRequests: data.requests?.length || 0,
                approvedThisMonth: data.approvedThisMonth || 0,
                rejectedThisMonth: data.rejectedThisMonth || 0,
                teamMembers: data.teamMembers || 0,
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
                body: JSON.stringify({ notes: 'Approved by Department Head' }),
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
                body: JSON.stringify({ notes: 'Rejected by Department Head' }),
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
                <h1 className="text-2xl font-bold">Department Head Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage and approve your department's procurement requests</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Pending Team Requests</div>
                        <IconClock className="h-5 w-5 text-warning" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.pendingTeamRequests}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Approved This Month</div>
                        <IconChecks className="h-5 w-5 text-success" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.approvedThisMonth}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Rejected This Month</div>
                        <IconX className="h-5 w-5 text-danger" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.rejectedThisMonth}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Team Members</div>
                        <IconUsers className="h-5 w-5 text-info" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.teamMembers}</div>
                    </div>
                </div>
            </div>

            {/* Pending Approvals Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Team Requests Pending Your Approval</h5>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></span>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">No pending requests from your team</div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Request #</th>
                                    <th>Description</th>
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
                                        <td>
                                            <div className="text-sm">
                                                <div className="font-semibold">{request.requester?.name}</div>
                                                <div className="text-gray-500">{request.requester?.email}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold">{formatCurrency(request.estimatedValue)}</div>
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

export default DepartmentHeadDashboard;
