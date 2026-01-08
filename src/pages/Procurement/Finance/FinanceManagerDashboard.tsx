import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconCheckCircle from '../../../components/Icon/IconCircleCheck';
import IconFileText from '../../../components/Icon/IconFile';
import IconDollarSign from '../../../components/Icon/IconDollarSign';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconUsers from '../../../components/Icon/IconUsers';
import IconBarChart from '../../../components/Icon/IconBarChart';

const FinanceManagerDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Finance Director Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [stats, setStats] = useState({
        totalBudget: 0,
        spent: 0,
        remaining: 0,
        commitments: 0,
        monthlyBurn: 0,
        processingTime: 2.3,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/finance-manager');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch finance director stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const budgetUtilization = stats.totalBudget > 0 ? Math.round((stats.spent / stats.totalBudget) * 100) : 0;

    const keyActivities = [
        {
            icon: '💰',
            title: 'Budget Management',
            description: 'Monitor and manage departmental budgets',
            link: '/procurement/budget',
            color: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            icon: '📊',
            title: 'Financial Reports',
            description: 'Generate budget and spend analysis reports',
            link: '/procurement/reports',
            color: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            icon: '💳',
            title: 'Payment Reconciliation',
            description: 'Reconcile payments and manage accounts payable',
            link: '/procurement/payments',
            color: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            icon: '🔍',
            title: 'Audit Compliance',
            description: 'Ensure financial compliance and audit readiness',
            link: '/procurement/audit',
            color: 'bg-orange-50 dark:bg-orange-900/20',
        },
    ];

    const upcomingPayments = [
        { id: 1, vendor: 'Tech Solutions Ltd', amount: '$15,250', dueDate: 'Dec 10', status: 'Pending' },
        { id: 2, vendor: 'Office Supplies Co', amount: '$3,480', dueDate: 'Dec 12', status: 'Approved' },
        { id: 3, vendor: 'Consulting Group', amount: '$25,000', dueDate: 'Dec 15', status: 'Pending' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Finance Director Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Budget oversight and financial management</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Budget */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Budget</p>
                            <p className="text-2xl font-bold dark:text-white mt-2">{formatCurrency(stats.totalBudget)}</p>
                        </div>
                        <IconDollarSign className="text-blue-500 text-3xl opacity-20" />
                    </div>
                </div>

                {/* Amount Spent */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Amount Spent</p>
                            <p className="text-2xl font-bold dark:text-white mt-2">{formatCurrency(stats.spent)}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{budgetUtilization}% utilized</p>
                        </div>
                        <IconTrendingUp className="text-orange-500 text-3xl opacity-20" />
                    </div>
                </div>

                {/* Budget Remaining */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Budget Remaining</p>
                            <p className="text-2xl font-bold dark:text-white mt-2">{formatCurrency(stats.remaining)}</p>
                        </div>
                        <IconCheckCircle className="text-green-500 text-3xl opacity-20" />
                    </div>
                </div>

                {/* Commitments */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Commitments</p>
                            <p className="text-2xl font-bold dark:text-white mt-2">{formatCurrency(stats.commitments)}</p>
                        </div>
                        <IconFileText className="text-purple-500 text-3xl opacity-20" />
                    </div>
                </div>
            </div>

            {/* Budget Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget Allocation Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold dark:text-white mb-4">Budget Allocation Overview</h3>
                    <div className="space-y-4">
                        {/* Budget Bar */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Budget Utilization</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{budgetUtilization}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${budgetUtilization > 85 ? 'bg-red-500' : budgetUtilization > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                                    style={{ width: `${budgetUtilization}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Monthly Burn Rate */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Burn Rate</span>
                                <span className="text-lg font-bold dark:text-white">{formatCurrency(stats.monthlyBurn)}/month</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold dark:text-white mb-4">Key Metrics</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Avg Processing Time</span>
                            <span className="font-bold dark:text-white">{stats.processingTime}d</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Budget Status</span>
                            <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                    budgetUtilization > 85 ? 'bg-red-100 text-red-800' : budgetUtilization > 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                }`}
                            >
                                {budgetUtilization > 85 ? 'Critical' : budgetUtilization > 70 ? 'Caution' : 'Healthy'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Activities */}
            <div>
                <h3 className="text-lg font-semibold dark:text-white mb-4">Key Activities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {keyActivities.map((activity, idx) => (
                        <Link key={idx} to={activity.link} className={`${activity.color} rounded-lg p-4 cursor-pointer transition-all hover:shadow-md`}>
                            <div className="text-2xl mb-2">{activity.icon}</div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{activity.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{activity.description}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Upcoming Payments */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Upcoming Payments</h3>
                    <Link to="/procurement/payments" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                        View All
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Vendor</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Amount</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Due Date</th>
                                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {upcomingPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{payment.vendor}</td>
                                    <td className="px-4 py-3 font-semibold dark:text-white">{payment.amount}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{payment.dueDate}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinanceManagerDashboard;
