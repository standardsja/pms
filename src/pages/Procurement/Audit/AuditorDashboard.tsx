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
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconArrowForward from '../../../components/Icon/IconArrowForward';

const AuditorDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Auditor Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [stats, setStats] = useState({
        auditRecords: 0,
        systemUptime: 99.9,
        activeUsers: 0,
        complianceRate: 98.5,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/auditor');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch auditor stats:', error);
            }
        };
        fetchStats();
    }, []);

    const responsibilities = [
        {
            icon: '🔍',
            title: 'View Audit Logs',
            description: 'Review comprehensive audit trail of all system activities',
            link: '/procurement/audit',
        },
        {
            icon: '📊',
            title: 'System Analytics',
            description: 'Access system performance and usage analytics',
            link: '/procurement/analytics',
        },
        {
            icon: '📋',
            title: 'Compliance Reports',
            description: 'Generate compliance and regulatory reports',
            link: '/procurement/reports',
        },
        {
            icon: '👥',
            title: 'User Activity',
            description: 'Monitor user access patterns and activities',
            link: '/procurement/admin/users',
        },
    ];

    const recentAudits = [
        { id: 1, action: 'Request Approved', user: 'John Smith', timestamp: '2024-10-30 14:35', status: 'success' },
        { id: 2, action: 'Payment Processed', user: 'Jane Doe', timestamp: '2024-10-30 13:22', status: 'success' },
        { id: 3, action: 'User Login', user: 'Bob Johnson', timestamp: '2024-10-30 10:15', status: 'info' },
        { id: 4, action: 'Report Generated', user: 'Admin User', timestamp: '2024-10-29 16:45', status: 'success' },
        { id: 5, action: 'Configuration Changed', user: 'System Admin', timestamp: '2024-10-29 09:20', status: 'warning' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Auditor Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor system compliance and audit activities</p>
                </div>
                <Link to="/procurement/audit" className="btn btn-primary flex items-center gap-2">
                    <IconCheckCircle /> View Logs
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Audit Records</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{(stats.auditRecords / 1000).toFixed(1)}K</p>
                        </div>
                        <IconClipboardText className="w-10 h-10 text-blue-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">System Uptime</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.systemUptime}%</p>
                        </div>
                        <IconCheckCircle className="w-10 h-10 text-green-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Active Users</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.activeUsers}</p>
                        </div>
                        <IconUsers className="w-10 h-10 text-purple-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Compliance Rate</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.complianceRate}%</p>
                        </div>
                        <IconTrendingUp className="w-10 h-10 text-orange-500 opacity-30" />
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

                {/* Recent Audits */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold dark:text-white mb-4">Recent Audits</h2>
                    <PerfectScrollbar className="space-y-3" options={{ suppressScrollX: true, wheelSpeed: 2 }}>
                        {recentAudits.map((audit) => (
                            <div key={audit.id} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${audit.status === 'success' ? 'bg-green-500' : audit.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium dark:text-white text-sm">{audit.action}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{audit.user}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{audit.timestamp}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </PerfectScrollbar>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Your Role</h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                    As an Auditor, you have read-only access to all system activities, audit logs, and compliance reports. You monitor system integrity and ensure all transactions are properly
                    recorded and compliant with organizational policies.
                </p>
                <Link to="/help" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                    View Auditor Guidelines →
                </Link>
            </div>
        </div>
    );
};

export default AuditorDashboard;
