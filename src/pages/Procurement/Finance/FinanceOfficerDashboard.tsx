import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconPlus from '../../../components/Icon/IconPlus';
import IconCheckCircle from '../../../components/Icon/IconCircleCheck';
import IconFileText from '../../../components/Icon/IconFile';
import IconUsers from '../../../components/Icon/IconUsers';
import IconBarChart from '../../../components/Icon/IconBarChart';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import IconClock from '../../../components/Icon/IconClock';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconArrowForward from '../../../components/Icon/IconArrowForward';

const FinanceOfficerDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Finance Officer Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [stats, setStats] = useState({
        paymentsToProcess: 0,
        totalAmount: 0,
        processingTime: 2.1,
        approvalRate: 98.5,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(getApiUrl('/api/stats/finance-officer'));
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch finance officer stats:', error);
            }
        };
        fetchStats();
    }, []);

    const responsibilities = [
        {
            icon: '�',
            title: 'Review Requests',
            description: 'Approve or reject requests that require financial review',
            link: '/procurement/approvals',
        },
    ];

    const pendingTasks = [
        { id: 1, type: 'Payment', reference: 'PAY-2024-045', amount: '$5,240', dueDate: 'Oct 30', priority: 'High' },
        { id: 2, type: 'Approval', reference: 'REQ-2024-089', amount: '$12,500', dueDate: 'Oct 31', priority: 'Medium' },
        { id: 3, type: 'Review', reference: 'INV-2024-234', amount: '$3,180', dueDate: 'Nov 2', priority: 'Low' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Finance Officer Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage payments, approvals, and financial reconciliation</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Payments To Process</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.paymentsToProcess}</p>
                        </div>
                        <IconInfoCircle className="w-10 h-10 text-red-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Amount</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">${(stats.totalAmount / 1000).toFixed(0)}K</p>
                        </div>
                        <IconCheckCircle className="w-10 h-10 text-green-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Processing Time</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.processingTime}d</p>
                        </div>
                        <IconClock className="w-10 h-10 text-blue-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Approval Rate</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.approvalRate}%</p>
                        </div>
                        <IconTrendingUp className="w-10 h-10 text-purple-500 opacity-30" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Responsibilities */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
                            <IconBarChart /> Your Responsibilities
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {responsibilities.map((item) => (
                                <Link
                                    key={item.title}
                                    to={item.link}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-slate-700 group"
                                >
                                    <div className="text-2xl mb-2">{item.icon}</div>
                                    <h3 className="font-semibold dark:text-white group-hover:text-blue-600 transition">{item.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                                    <div className="flex items-center text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition">
                                        <span className="text-sm font-medium">Go</span>
                                        <IconArrowForward className="w-4 h-4 ml-1" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pending Tasks */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold dark:text-white mb-4">Pending Tasks</h2>
                    <PerfectScrollbar className="space-y-3" options={{ suppressScrollX: true, wheelSpeed: 2 }}>
                        {pendingTasks.map((task) => (
                            <div key={task.id} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                                    task.type === 'Payment'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                        : task.type === 'Approval'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}
                                            >
                                                {task.type}
                                            </span>
                                        </div>
                                        <p className="font-medium dark:text-white text-sm mt-1">{task.reference}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">{task.amount}</p>
                                    </div>
                                    <span className={`text-xs font-medium ${task.priority === 'High' ? 'text-red-600' : task.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Due: {task.dueDate}</p>
                            </div>
                        ))}
                    </PerfectScrollbar>
                </div>
            </div>
        </div>
    );
};

export default FinanceOfficerDashboard;
