import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEye from '../../../components/Icon/IconEye';
import { selectAuthLoading, selectUser } from '../../../store/authSlice';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initialPendingRequests: PendingRequest[] = useMemo(
        () => [
            { id: 'REQ-1001', title: 'Office Equipment', department: 'IT', requester: 'John Doe', status: 'Pending', amount: 15000, submitDate: '2025-12-01' },
            { id: 'REQ-1002', title: 'Software Licenses', department: 'Finance', requester: 'Jane Smith', status: 'Pending', amount: 25000, submitDate: '2025-12-02' },
            { id: 'REQ-1003', title: 'Maintenance Supplies', department: 'Operations', requester: 'Bob Wilson', status: 'Pending', amount: 8500, submitDate: '2025-12-03' },
        ],
        []
    );

    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
    const [stats, setStats] = useState<HODDashboardStats>({
        totalRequests: 156,
        pendingApprovals: 12,
        approvedRequests: 132,
        rejectedRequests: 12,
        totalBudgetRequested: 850000,
        approvedAmount: 725000,
        pendingAmount: 125000,
        departmentCount: 5,
        activeUsers: 38,
        averageApprovalTime: 3.5,
        trendSubmissions: [18, 22, 19, 25, 23, 28, 24],
        trendApprovals: [15, 18, 16, 22, 20, 25, 21],
        departmentPerformance: [
            { name: 'IT', pending: 3, approved: 28 },
            { name: 'Finance', pending: 4, approved: 32 },
            { name: 'Operations', pending: 2, approved: 25 },
            { name: 'HR', pending: 2, approved: 22 },
            { name: 'Procurement', pending: 1, approved: 25 },
        ],
    });

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
            {/* Page Title */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Head of Division Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage and oversee all procurement activities across divisions</p>
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to="/procurement/hod/pending-approvals" className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="text-center">
                        <div className="text-3xl mb-2">📋</div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Pending Approvals</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Review requests awaiting approval</p>
                    </div>
                </Link>

                <Link to="/procurement/hod/reports" className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="text-center">
                        <div className="text-3xl mb-2">📊</div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Reports</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">View procurement reports and analytics</p>
                    </div>
                </Link>

                <Link to="/procurement/hod/departments" className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="text-center">
                        <div className="text-3xl mb-2">🏢</div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Departments</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage department information</p>
                    </div>
                </Link>

                <Link to="/procurement/hod/users" className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="text-center">
                        <div className="text-3xl mb-2">👥</div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">User Management</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage users and permissions</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default HeadOfDivisionDashboard;
