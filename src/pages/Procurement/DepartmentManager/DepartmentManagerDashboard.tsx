import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { setPageTitle } from '../../../store/themeConfigSlice';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconPlus from '../../../components/Icon/IconPlus';
import IconList from '../../../components/Icon/IconListCheck';
import IconSearch from '../../../components/Icon/IconSearch';
import IconCheckCircle from '../../../components/Icon/IconCircleCheck';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconInbox from '../../../components/Icon/IconInbox';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconArrowForward from '../../../components/Icon/IconArrowForward';

const DepartmentManagerDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Department Manager Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [stats, setStats] = useState({
        pendingApprovals: 0,
        requestsToReview: 0,
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/department-manager');
                if (response.ok) {
                    const data = await response.json();
                    setStats({
                        pendingApprovals: Number(data.pendingApprovals || 0),
                        requestsToReview: Number(data.requestsToReview || 0),
                        approvedThisMonth: Number(data.approvedThisMonth || 0),
                        rejectedThisMonth: Number(data.rejectedThisMonth || 0),
                    });
                }
            } catch (error) {
                console.error('Failed to fetch department manager stats:', error);
                // On error, keep defaults (zeros) and show console error only
            }
        };
        fetchStats();
    }, []);

    const responsibilities = [
        {
            icon: '👥',
            title: 'Review Requests',
            description: 'Review and approve requests from your department staff',
            link: '/apps/requests/pending-approval',
        },
        {
            icon: '✅',
            title: 'Approve/Reject',
            description: 'Make approval decisions on pending requests',
            link: '/apps/requests/pending-approval',
        },
        {
            icon: '📋',
            title: 'My Requests',
            description: 'View all requests from your department',
            link: '/apps/requests',
        },
        // Innovation Hub card removed per request
    ];

    const recentActivities = [
        { id: 1, action: 'Request Approved', description: 'Office Supplies - REQ-2024-045', status: 'approved', time: '1 hour ago' },
        { id: 2, action: 'Request Submitted', description: 'IT Equipment - REQ-2024-044', status: 'pending', time: '3 hours ago' },
        { id: 3, action: 'Request Rejected', description: 'Furniture - REQ-2024-043', status: 'rejected', time: '5 hours ago' },
        { id: 4, action: 'Request Approved', description: 'Conference Room - REQ-2024-042', status: 'approved', time: '1 day ago' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Department Manager Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Oversee department requests and approvals</p>
                </div>
                <Link to="/apps/requests" className="btn btn-primary flex items-center gap-2">
                    <IconList /> View All Requests
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Approvals</p>
                            <p className="text-3xl font-bold dark:text-white mt-2">{stats.pendingApprovals}</p>
                        </div>
                        <div className="text-4xl opacity-20">📥</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">To Review</p>
                            <p className="text-3xl font-bold dark:text-white mt-2">{stats.requestsToReview}</p>
                        </div>
                        <div className="text-4xl opacity-20">📋</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Approved (Month)</p>
                            <p className="text-3xl font-bold dark:text-white mt-2">{stats.approvedThisMonth}</p>
                        </div>
                        <div className="text-4xl opacity-20">✅</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Rejected (Month)</p>
                            <p className="text-3xl font-bold dark:text-white mt-2">{stats.rejectedThisMonth}</p>
                        </div>
                        <div className="text-4xl opacity-20">❌</div>
                    </div>
                </div>
            </div>

            {/* Responsibilities */}
            <div>
                <h2 className="text-xl font-bold dark:text-white mb-4">Your Responsibilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {responsibilities.map((item, index) => (
                        <Link key={index} to={item.link} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                            <div className="text-4xl mb-3">{item.icon}</div>
                            <h3 className="font-semibold dark:text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>
                            <div className="flex items-center text-primary text-sm font-medium">
                                View <IconArrowForward className="w-4 h-4 ml-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold dark:text-white mb-4">Recent Activities</h3>
                        <PerfectScrollbar className="max-h-[400px]">
                            <div className="space-y-3">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                        <div
                                            className={`text-2xl flex-shrink-0 ${
                                                activity.status === 'approved' ? '✅' : activity.status === 'rejected' ? '❌' : activity.status === 'pending' ? '⏳' : '📋'
                                            }`}
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium dark:text-white">{activity.action}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PerfectScrollbar>
                    </div>
                </div>

                {/* Help Section */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold dark:text-white mb-4">Quick Help</h3>
                    <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>Review pending requests in your inbox</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>Approve requests within your authority limits</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>Track all department procurement activities</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>Monitor monthly approval metrics</span>
                        </li>
                        <li className="flex gap-2">
                            <span>•</span>
                            <span>Access innovation submissions from team</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DepartmentManagerDashboard;
