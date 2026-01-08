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
import { getAuthHeaders } from '../../../utils/api';

const RequesterDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Requester Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [stats, setStats] = useState({
        myRequests: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/requester');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch requester stats:', error);
            }
        };
        fetchStats();
    }, []);

    const responsibilities = [
        {
            icon: '📝',
            title: 'Create Requests',
            description: 'Submit new procurement requests for your department',
            link: '/apps/requests/new',
        },
        {
            icon: '📊',
            title: 'View My Requests',
            description: 'Track the status of requests you have submitted',
            link: '/apps/requests',
        },
        {
            icon: '✅',
            title: 'Evaluate Suppliers',
            description: 'Participate in supplier evaluation process',
            link: '/procurement/evaluation',
        },
    ];

    interface ActivityApi {
        id: number;
        action: string;
        description: string;
        status: string;
        createdAt: string;
    }
    const [recentActivities, setRecentActivities] = useState<Array<{ id: number; action: string; description: string; status: string; time: string }>>([]);

    const formatRelativeTime = (iso: string): string => {
        const dt = new Date(iso);
        const diffMs = Date.now() - dt.getTime();
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    };

    const isActivityApi = (x: unknown): x is ActivityApi => {
        if (!x || typeof x !== 'object') return false;
        const obj = x as Record<string, unknown>;
        return typeof obj.id === 'number' && typeof obj.action === 'string' && typeof obj.description === 'string' && typeof obj.status === 'string' && typeof obj.createdAt === 'string';
    };

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch('/api/requests/activities', { headers });
                if (res.ok) {
                    const data = await res.json();
                    const list: unknown = (data as { activities?: unknown }).activities;
                    const mapped = Array.isArray(list)
                        ? list.filter(isActivityApi).map((a) => ({
                              id: a.id,
                              action: a.action,
                              description: a.description,
                              status: a.status,
                              time: formatRelativeTime(a.createdAt),
                          }))
                        : [];
                    setRecentActivities(mapped);
                }
            } catch (err) {
                console.error('Failed to fetch activities:', err);
            }
        };
        fetchActivities();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Requester Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your procurement requests and evaluations</p>
                </div>
                <Link to="/apps/requests/new" className="btn btn-primary flex items-center gap-2">
                    <IconPlus /> New Request
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">My Requests</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.myRequests}</p>
                        </div>
                        <IconList className="w-10 h-10 text-blue-500 opacity-30" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Approval</p>
                            <p className="text-3xl font-bold dark:text-white mt-1">{stats.pendingApproval}</p>
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
                        <IconInbox className="w-10 h-10 text-red-500 opacity-30" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Responsibilities */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
                            <IconTrendingUp /> Your Responsibilities
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

                {/* Recent Activity */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold dark:text-white mb-4">Recent Activity</h2>
                    <PerfectScrollbar className="space-y-3" options={{ suppressScrollX: true, wheelSpeed: 2 }}>
                        {recentActivities.map((activity) => (
                            <div key={activity.id} className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`w-2 h-2 rounded-full mt-2 ${activity.status === 'approved' ? 'bg-green-500' : activity.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                    ></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium dark:text-white text-sm">{activity.action}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{activity.description}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </PerfectScrollbar>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    As a Requester, you can create procurement requests, track their status through approvals, and participate in supplier evaluations. Use the quick actions above to get started.
                </p>
                <Link to="/help" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    View Full Help Documentation →
                </Link>
            </div>
        </div>
    );
};

export default RequesterDashboard;
