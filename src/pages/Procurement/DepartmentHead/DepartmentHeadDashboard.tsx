import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconChecks from '../../../components/Icon/IconChecks';
import IconClock from '../../../components/Icon/IconClock';
import IconEye from '../../../components/Icon/IconEye';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';

const DepartmentHeadDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Department Head Dashboard'));
    }, [dispatch]);

    // Fetch requests from API
    useEffect(() => {
        const controller = new AbortController();
        async function loadRequests() {
            try {
                const apiBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
                const endpoint = apiBase ? `${apiBase.replace(/\/$/, '')}/requisitions` : '/api/requisitions';
                const token = localStorage.getItem('auth_token') || '';
                const res = await fetch(endpoint, {
                    headers: { Authorization: token ? `Bearer ${token}` : '' },
                    signal: controller.signal,
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data?.data)) {
                        setRequests(data.data);
                    }
                }
            } catch (_) {
                // Error handled silently
            } finally {
                setLoading(false);
            }
        }
        loadRequests();
        return () => controller.abort();
    }, []);

    // Statistics
    const stats = {
        pendingRequests: requests.filter(r => r.status === 'submitted').length,
        totalRequests: requests.length,
        totalAmount: requests.reduce((sum, r) => sum + (r.total_amount || 0), 0),
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Procurement
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Department Head Dashboard</span>
                </li>
            </ul>

            <div className="pt-5">
                {/* Stats Cards */}
                <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="panel">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-2xl font-bold text-primary">{stats.pendingRequests}</h4>
                                <p className="text-sm text-white-dark">Pending Requests</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                                <IconClipboardText />
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-2xl font-bold text-success">{stats.totalRequests}</h4>
                                <p className="text-sm text-white-dark">Total Requests</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success text-white">
                                <IconChecks />
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-2xl font-bold text-info">JMD ${stats.totalAmount.toLocaleString()}</h4>
                                <p className="text-sm text-white-dark">Total Amount</p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info text-white">
                                <IconDollarSignCircle />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending Requests Table */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">Procurement Requests</h5>
                        <Link to="/apps/requests" className="font-semibold text-primary hover:underline">
                            View All
                        </Link>
                    </div>
                    
                    {loading ? (
                        <div className="py-8 text-center text-white-dark">Loading requests...</div>
                    ) : requests.length === 0 ? (
                        <div className="py-8 text-center text-white-dark">No requests found</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#e0e6ed] dark:border-[#253b5c]">
                                        <th className="px-4 py-3 text-left">Request #</th>
                                        <th className="px-4 py-3 text-left">Title</th>
                                        <th className="px-4 py-3 text-left">Requester</th>
                                        <th className="px-4 py-3 text-left">Department</th>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.slice(0, 10).map((req: any) => (
                                        <tr key={req.id} className="border-b border-[#e0e6ed] dark:border-[#253b5c] hover:bg-slate-50 dark:hover:bg-slate-700">
                                            <td className="px-4 py-3 font-medium">{req.req_number || req.id}</td>
                                            <td className="px-4 py-3">{req.title}</td>
                                            <td className="px-4 py-3">{req.requester}</td>
                                            <td className="px-4 py-3">{req.department}</td>
                                            <td className="px-4 py-3">{String(req.created_at || '').slice(0, 10)}</td>
                                            <td className="px-4 py-3 text-right">JMD ${(req.total_amount || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`badge ${
                                                    req.status === 'submitted' ? 'badge-outline-warning' :
                                                    req.status === 'approved' ? 'badge-outline-success' :
                                                    'badge-outline-primary'
                                                }`}>
                                                    {req.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => navigate(`/apps/requests/${req.id}`)}
                                                    title="View Details"
                                                >
                                                    <IconEye className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepartmentHeadDashboard;
