import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEye from '../../../components/Icon/IconEye';
import IconLoader from '../../../components/Icon/IconLoader';
import { selectAuthLoading, selectUser } from '../../../store/authSlice';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { getAuthHeaders } from '../../../utils/api';
import { getApiUrl } from '../../../config/api';
import Swal from 'sweetalert2';

type PendingRequest = {
    id: string;
    title: string;
    department: string;
    requester: string;
    status: string;
    amount: number;
    submitDate: string;
};

type HODDashboardStats = {
    totalRequests: number;
    pendingApprovals: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalBudgetRequested: number;
    approvedAmount: number;
    pendingAmount: number;
    departmentCount: number;
    activeUsers: number;
    averageApprovalTime: number; // in days
    trendSubmissions: number[];
    trendApprovals: number[];
    departmentPerformance: Array<{ name: string; pending: number; approved: number }>;
};

const HeadOfDivisionDashboard = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector(selectAuthLoading);
    const authUser = useSelector(selectUser);

    useEffect(() => {
        dispatch(setPageTitle('Head of Division Dashboard'));
    }, [dispatch]);

    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [stats, setStats] = useState<HODDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const toast = (title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        Swal.fire({
            toast: true,
            icon,
            title,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
        });

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);

            try {
                const headers = await getAuthHeaders();

                // Fetch dashboard statistics
                const [statsRes, requestsRes] = await Promise.all([fetch(getApiUrl('/api/v1/dashboard-stats'), { headers }), fetch(getApiUrl('/api/v1/pending-approvals?limit=10'), { headers })]);

                if (!statsRes.ok) {
                    throw new Error('Failed to fetch dashboard statistics');
                }
                if (!requestsRes.ok) {
                    throw new Error('Failed to fetch pending approvals');
                }

                const statsData = await statsRes.json();
                const requestsData = await requestsRes.json();

                if (statsData.success) {
                    setStats(statsData.stats);
                }

                if (requestsData.success) {
                    setPendingRequests(requestsData.requests);
                }
            } catch (err: any) {
                console.error('Failed to fetch dashboard data:', err);
                setError(err.message || 'Failed to load dashboard data');
                toast('Failed to load dashboard data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const dateFmt = (s: string) => new Date(s).toLocaleDateString();

    const lastNDays = (n: number) => {
        const days: string[] = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
        return days;
    };

    const { trendOptions, trendSeries, budgetOptions, budgetSeries, deptOptions, deptSeries } = useMemo(() => {
        if (!stats) {
            return {
                trendOptions: {},
                trendSeries: [],
                budgetOptions: {},
                budgetSeries: [],
                deptOptions: {},
                deptSeries: [],
            };
        }

        const labels = lastNDays(7);
        const submissions = stats.trendSubmissions;
        const approvals = stats.trendApprovals;

        const trendOptions: ApexOptions = {
            chart: { type: 'area', toolbar: { show: false }, height: 260 },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#3B82F6', '#10B981'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.05,
                    stops: [20, 100, 100, 100],
                },
            },
            legend: { position: 'top', horizontalAlign: 'right' },
            xaxis: { categories: labels },
            yaxis: { title: { text: 'Count' } },
        };

        const trendSeries = [
            { name: 'Submissions', data: submissions },
            { name: 'Approvals', data: approvals },
        ];

        // Budget allocation pie chart
        const budgetOptions: ApexOptions = {
            chart: { type: 'pie', height: 260 },
            labels: ['Approved', 'Pending', 'Rejected'],
            colors: ['#10B981', '#F59E0B', '#EF4444'],
            legend: { position: 'right' },
        };

        const budgetSeries = [stats.approvedAmount, stats.pendingAmount, stats.totalBudgetRequested - stats.approvedAmount - stats.pendingAmount];

        // Department performance bar chart
        const deptOptions: ApexOptions = {
            chart: { type: 'bar', toolbar: { show: false }, height: 300 },
            colors: ['#3B82F6', '#10B981'],
            plotOptions: { bar: { borderRadius: 4, dataLabels: { position: 'top' } } },
            xaxis: { categories: stats.departmentPerformance.map((d) => d.name) },
            yaxis: { title: { text: 'Request Count' } },
            legend: { position: 'top' },
        };

        const deptSeries = [
            { name: 'Pending', data: stats.departmentPerformance.map((d) => d.pending) },
            { name: 'Approved', data: stats.departmentPerformance.map((d) => d.approved) },
        ];

        return { trendOptions, trendSeries, budgetOptions, budgetSeries, deptOptions, deptSeries };
    }, [stats]);

    return (
        <div className="space-y-6">
            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center min-h-screen">
                    <IconLoader className="w-10 h-10 animate-spin text-primary" />
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="panel p-6">
                    <div className="flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button onClick={() => window.location.reload()} className="btn btn-primary">
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Content */}
            {!loading && !error && stats && (
                <>
                    {/* Page Title */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Head of Division Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage and oversee all procurement activities across divisions</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Live data from database · Real-time updates</p>
                    </div>

                    {/* Key Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Requests */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Requests</p>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.totalRequests}</p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                                    <IconChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Total procurement requests</p>
                        </div>

                        {/* Pending Approvals */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Approvals</p>
                                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.pendingApprovals}</p>
                                </div>
                                <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg p-3">
                                    <IconEye className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Awaiting your approval</p>
                        </div>

                        {/* Approved Requests */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Approved</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.approvedRequests}</p>
                                </div>
                                <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3">
                                    <IconChecks className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Successfully approved</p>
                        </div>

                        {/* Total Budget Requested */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Budget Requested</p>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">${(stats.totalBudgetRequested / 1000).toFixed(0)}K</p>
                                </div>
                                <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-3">
                                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">💰</span>
                                </div>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">Total amount requested</p>
                        </div>
                    </div>

                    {/* Trend Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Submissions & Approvals Trend */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Request Trend (7 Days)</h3>
                            <ReactApexChart options={trendOptions} series={trendSeries} type="area" height={260} />
                        </div>

                        {/* Budget Allocation */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Budget Allocation</h3>
                            <ReactApexChart options={budgetOptions} series={budgetSeries} type="pie" height={260} />
                        </div>
                    </div>

                    {/* Department Performance */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Department Performance</h3>
                        <ReactApexChart options={deptOptions} series={deptSeries} type="bar" height={300} />
                    </div>

                    {/* Pending Requests Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pending Approvals</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Request ID</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Title</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Department</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Requester</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {pendingRequests.length > 0 ? (
                                        pendingRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">{req.id}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{req.title}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{req.department}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{req.requester}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">${req.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{dateFmt(req.submitDate)}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <Link to={`/apps/requests/edit/${req.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                                        Review
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No pending approvals
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {pendingRequests.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-center">
                                <Link to="/procurement/hod/pending-approvals" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                    View all pending approvals →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions removed per request */}
                </>
            )}
        </div>
    );
};

export default HeadOfDivisionDashboard;
