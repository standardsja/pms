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
import IconCreditCard from '../../../components/Icon/IconCreditCard';

interface PaymentRequest {
    id: number;
    number: string;
    description: string;
    paymentAmount: number;
    status: string;
    priority: string;
    createdAt: string;
    requester: { name: string; email: string };
    department: { name: string };
    vendor: { name: string };
}

interface DashboardStats {
    pendingPayments: number;
    processedThisMonth: number;
    totalPaymentValue: number;
    averageProcessingTime: number;
}

const PaymentStageDashboard = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        pendingPayments: 0,
        processedThisMonth: 0,
        totalPaymentValue: 0,
        averageProcessingTime: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Payment Processing Dashboard'));
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

            // Fetch payment stage requests
            const response = await fetch(getApiUrl('/api/requests?status=PAYMENT_STAGE&sortBy=createdAt&sortOrder=asc'), { headers });
            const data = await response.json();

            setRequests(data.requests || []);

            const pendingCount = data.requests?.length || 0;
            const totalValue = data.requests?.reduce((sum: number, req: PaymentRequest) => sum + (req.paymentAmount || 0), 0) || 0;

            setStats({
                pendingPayments: pendingCount,
                processedThisMonth: data.processedThisMonth || 0,
                totalPaymentValue: totalValue,
                averageProcessingTime: data.averageProcessingTime || 0,
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayment = async (requestId: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(getApiUrl(`/api/payments/${requestId}/process`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: 'Payment processed' }),
            });
            loadData();
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    };

    const handleRejectPayment = async (requestId: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(getApiUrl(`/api/payments/${requestId}/reject`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: 'Payment rejected - requires clarification' }),
            });
            loadData();
        } catch (error) {
            console.error('Error rejecting payment:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Payment Processing Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Process and approve payment stage requests</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Pending Payments</div>
                        <IconClock className="h-5 w-5 text-warning" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.pendingPayments}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Processed This Month</div>
                        <IconChecks className="h-5 w-5 text-success" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.processedThisMonth}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Total Payment Value</div>
                        <IconDollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{formatCurrency(stats.totalPaymentValue)}</div>
                    </div>
                </div>

                <div className="panel h-full">
                    <div className="flex items-center justify-between">
                        <div className="text-md font-semibold ltr:mr-1 rtl:ml-1">Avg Processing Time (days)</div>
                        <IconCreditCard className="h-5 w-5 text-info" />
                    </div>
                    <div className="mt-5 flex items-center">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.averageProcessingTime.toFixed(1)}</div>
                    </div>
                </div>
            </div>

            {/* Payment Queue Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Payment Queue</h5>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></span>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">No payments pending processing</div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Request #</th>
                                    <th>Description</th>
                                    <th>Vendor</th>
                                    <th>Department</th>
                                    <th>Payment Amount</th>
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
                                        <td>{request.vendor?.name || '-'}</td>
                                        <td>{request.department?.name || '-'}</td>
                                        <td>
                                            <div className="font-semibold text-success">{formatCurrency(request.paymentAmount)}</div>
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
                                                <button onClick={() => handleProcessPayment(request.id)} className="btn btn-sm btn-outline-success" title="Process Payment">
                                                    <IconChecks className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleRejectPayment(request.id)} className="btn btn-sm btn-outline-danger" title="Reject">
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

export default PaymentStageDashboard;
