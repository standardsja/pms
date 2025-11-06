import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';

const InnovationDashboard = () => {
    const dispatch = useDispatch();
    const [stats, setStats] = useState({
        myIdeas: 0,
        approvedIdeas: 0,
        pendingIdeas: 0,
        promotedProjects: 0,
        totalVotes: 0,
    });

    useEffect(() => {
        dispatch(setPageTitle('Innovation Hub'));
        // TODO: Fetch stats from API
        setStats({
            myIdeas: 3,
            approvedIdeas: 24,
            pendingIdeas: 8,
            promotedProjects: 5,
            totalVotes: 142,
        });
    }, [dispatch]);

    const quickActions = [
        {
            title: 'Submit New Idea',
            description: 'Share your innovative concept',
            icon: '✨',
            link: '/innovation/ideas/new',
            color: 'bg-gradient-to-br from-purple-500 to-pink-600',
        },
        {
            title: 'Browse Ideas',
            description: 'Explore approved innovations',
            icon: '🔍',
            link: '/innovation/ideas/browse',
            color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
        },
        {
            title: 'My Submissions',
            description: 'View your submitted ideas',
            icon: '📝',
            link: '/innovation/ideas/mine',
            color: 'bg-gradient-to-br from-green-500 to-emerald-600',
        },
        {
            title: 'Popular This Week',
            description: 'See trending innovations',
            icon: '🔥',
            link: '/innovation/ideas/popular',
            color: 'bg-gradient-to-br from-orange-500 to-red-600',
        },
    ];

    const statCards = [
        { label: 'My Ideas', value: stats.myIdeas, icon: '💡', color: 'text-purple-600 dark:text-purple-400' },
        { label: 'Approved Ideas', value: stats.approvedIdeas, icon: '✅', color: 'text-green-600 dark:text-green-400' },
        { label: 'Under Review', value: stats.pendingIdeas, icon: '⏳', color: 'text-orange-600 dark:text-orange-400' },
        { label: 'BSJ Projects', value: stats.promotedProjects, icon: '🚀', color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Total Votes', value: stats.totalVotes, icon: '👍', color: 'text-pink-600 dark:text-pink-400' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-4xl">💡</span>
                        Innovative Hub
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Share ideas, vote on innovations, and drive BSJ forward
                    </p>
                </div>
                <Link to="/innovation/ideas/new" className="btn btn-primary gap-2">
                    <span className="text-xl">✨</span>
                    Submit New Idea
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="panel">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                            </div>
                            <div className={`text-5xl ${stat.color}`}>{stat.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, idx) => (
                        <Link
                            key={idx}
                            to={action.link}
                            className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
                        >
                            <div className={`${action.color} p-6 text-white`}>
                                <div className="text-5xl mb-3">{action.icon}</div>
                                <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                                <p className="text-sm text-white/90">{action.description}</p>
                                <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                                    <span>Go</span>
                                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="panel">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                    <Link to="/innovation/ideas/all" className="text-primary hover:underline text-sm font-semibold">
                        View All
                    </Link>
                </div>
                <div className="space-y-4">
                    {/* TODO: Replace with real data */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl">👍</div>
                        <div className="flex-1">
                            <p className="text-gray-900 dark:text-white font-medium">
                                Your idea "AI-Powered Document Analysis" received 5 new votes
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">2 hours ago</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl">✅</div>
                        <div className="flex-1">
                            <p className="text-gray-900 dark:text-white font-medium">
                                Innovation Committee approved "Sustainable Packaging Initiative"
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">1 day ago</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl">🚀</div>
                        <div className="flex-1">
                            <p className="text-gray-900 dark:text-white font-medium">
                                "Digital Standards Portal" was promoted to BSJ Project!
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">3 days ago</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="panel bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Pro Tip</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                            Ideas with detailed descriptions and clear benefits receive 3x more votes on average!
                        </p>
                        <Link to="/innovation/ideas/new" className="text-primary hover:underline font-semibold">
                            Submit a Well-Crafted Idea →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InnovationDashboard;
