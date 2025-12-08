import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { setPageTitle } from '../../../store/themeConfigSlice';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconPlus from '../../../components/Icon/IconPlus';
import IconCheckCircle from '../../../components/Icon/IconCircleCheck';
import IconFileText from '../../../components/Icon/IconFile';
import IconUsers from '../../../components/Icon/IconUsers';
import IconBarChart from '../../../components/Icon/IconBarChart';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import IconInbox from '../../../components/Icon/IconInbox';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconArrowForward from '../../../components/Icon/IconArrowForward';

const DepartmentHeadDashboardNew = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Department Head Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [stats, setStats] = useState({
        departmentRequests: 0,
        pendingReview: 0,
        approved: 0,
        rejected: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/department-head');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch department head stats:', error);
            }
        };
        fetchStats();
    }, []);

    const responsibilities = [
        {
            icon: '✅',
            title: 'Review Requests',
            description: 'Approve or reject departmental procurement requests',
            link: '/procurement/approvals',
        },
        {
            icon: '👥',
            title: 'Manage Team Requests',
            description: 'Oversee all requests submitted by your department',
            link: '/procurement/approvals',
        },
        {
            icon: '📊',
            title: 'Department Reports',
            description: 'Review departmental procurement spending and reports',
            link: '/procurement/reports',
        },
        {
            icon: '📈',
            title: 'Budget Overview',
            description: 'Monitor departmental budget allocation and spending',
            link: '/procurement/approvals',
        },
    ];

    const pendingApprovals = [
        { id: 1, reference: 'REQ-2024-045', description: 'Office Supplies', amount: '$2,540', status: 'pending' },
        { id: 2, reference: 'REQ-2024-046', description: 'IT Equipment', amount: '$8,900', status: 'pending' },
        { id: 3, reference: 'REQ-2024-047', description: 'Furniture Set', amount: '$4,200', status: 'pending' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Department Head Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Approve departmental requests and monitor spending</p>
                </div>
                <Link to="/procurement/approvals" className="btn btn-primary flex items-center gap-2">
                    <IconCheckCircle /> Review Requests
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Department Requests</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.departmentRequests}</p>
                        </div>
                        <IconInbox className="w-10 h-10 text-blue-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Review</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.pendingReview}</p>
                        </div>
                        <IconInfoCircle className="w-10 h-10 text-yellow-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Approved</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.approved}</p>
                        </div>
                        <IconCheckCircle className="w-10 h-10 text-green-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Rejected</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.rejected}</p>
                        </div>
                        <IconTrendingUp className="w-10 h-10 text-red-500 opacity-30" />
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

                {/* Pending Approvals */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold dark:text-white mb-4">Pending Approvals</h2>
                    <PerfectScrollbar className="space-y-3" options={{ suppressScrollX: true, wheelSpeed: 2 }}>
                        {pendingApprovals.map((approval) => (
                            <div key={approval.id} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium dark:text-white text-sm">{approval.reference}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{approval.description}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">{approval.amount}</p>
                                    </div>
                                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Pending</span>
                                </div>
                            </div>
                        ))}
                    </PerfectScrollbar>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Your Role</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    As a Department Head, you approve requests from your department and ensure compliance with departmental policies. You have final approval authority before requests move to
                    executive or procurement review.
                </p>
                <Link to="/help" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    View Department Head Guidelines →
                </Link>
            </div>
        </div>
    );
};

export default DepartmentHeadDashboardNew;
