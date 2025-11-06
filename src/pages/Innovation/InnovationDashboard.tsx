import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../store/themeConfigSlice';
import { getUser } from '../../utils/auth';

const InnovationDashboard = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const currentUser = getUser();
    const isCommittee = currentUser?.role === 'INNOVATION_COMMITTEE';
    const [stats, setStats] = useState({
        myIdeas: 0,
        approvedIdeas: 0,
        pendingIdeas: 0,
        promotedProjects: 0,
        totalVotes: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.hub')));
        // TODO: Fetch stats from API
        setIsLoading(true);
        setTimeout(() => {
            setStats({
                myIdeas: 3,
                approvedIdeas: 24,
                pendingIdeas: 8,
                promotedProjects: 5,
                totalVotes: 142,
            });
            setIsLoading(false);
        }, 500);
    }, [dispatch, t]);

    const quickActions = [
        {
            title: t('innovation.dashboard.quickActions.submitNew.title'),
            description: t('innovation.dashboard.quickActions.submitNew.description'),
            icon: '✨',
            link: '/innovation/ideas/new',
            color: 'bg-gradient-to-br from-purple-500 to-pink-600',
        },
        {
            title: t('innovation.dashboard.quickActions.browse.title'),
            description: t('innovation.dashboard.quickActions.browse.description'),
            icon: '🔍',
            link: '/innovation/ideas/browse',
            color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
        },
        {
            title: t('innovation.dashboard.quickActions.mySubmissions.title'),
            description: t('innovation.dashboard.quickActions.mySubmissions.description'),
            icon: '📝',
            link: '/innovation/ideas/mine',
            color: 'bg-gradient-to-br from-green-500 to-emerald-600',
        },
        {
            title: t('innovation.dashboard.quickActions.popular.title'),
            description: t('innovation.dashboard.quickActions.popular.description'),
            icon: '🔥',
            link: '/innovation/ideas/popular',
            color: 'bg-gradient-to-br from-orange-500 to-red-600',
        },
    ];
    const filteredQuickActions = isCommittee
        ? quickActions.filter((a) => a.link !== '/innovation/ideas/popular')
        : quickActions;

    const statCards = [
        { label: t('innovation.dashboard.stats.myIdeas'), value: stats.myIdeas, icon: '💡', color: 'text-purple-600 dark:text-purple-400' },
        { label: t('innovation.dashboard.stats.approvedIdeas'), value: stats.approvedIdeas, icon: '✅', color: 'text-green-600 dark:text-green-400' },
        { label: t('innovation.dashboard.stats.underReview'), value: stats.pendingIdeas, icon: '⏳', color: 'text-orange-600 dark:text-orange-400' },
        { label: t('innovation.dashboard.stats.bsjProjects'), value: stats.promotedProjects, icon: '🚀', color: 'text-blue-600 dark:text-blue-400' },
        { label: t('innovation.dashboard.stats.totalVotes'), value: stats.totalVotes, icon: '👍', color: 'text-pink-600 dark:text-pink-400' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 id="innovation-dashboard-title" className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-4xl" role="img" aria-label="lightbulb">💡</span>
                        {t('innovation.dashboard.title')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t('innovation.dashboard.subtitle')}
                    </p>
                </div>
                <Link 
                    to="/innovation/ideas/new" 
                    className="btn btn-primary gap-2"
                    aria-label={t('innovation.dashboard.submitNewIdea')}
                >
                    <span className="text-xl" role="img" aria-hidden="true">✨</span>
                    {t('innovation.dashboard.submitNewIdea')}
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="region" aria-label="Statistics">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="panel">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                                {isLoading ? (
                                    <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                                ) : (
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                                )}
                            </div>
                            <div className={`text-5xl ${stat.color}`} role="img" aria-hidden="true">{stat.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('innovation.dashboard.quickActions.title')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredQuickActions.map((action, idx) => (
                        <Link
                            key={idx}
                            to={action.link}
                            className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
                            aria-label={action.title}
                        >
                            <div className={`${action.color} p-6 text-white`}>
                                <div className="text-5xl mb-3" role="img" aria-hidden="true">{action.icon}</div>
                                <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                                <p className="text-sm text-white/90">{action.description}</p>
                                <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                                    <span>{t('innovation.dashboard.quickActions.go')}</span>
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('innovation.dashboard.recentActivity.title')}</h2>
                    <Link to="/innovation/ideas/all" className="text-primary hover:underline text-sm font-semibold">
                        {t('innovation.dashboard.recentActivity.viewAll')}
                    </Link>
                </div>
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4" role="feed" aria-label={t('innovation.dashboard.recentActivity.title')}>
                        {/* TODO: Replace with real data */}
                        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl" role="img" aria-label="thumbs up">👍</div>
                            <div className="flex-1">
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {t('innovation.dashboard.recentActivity.votesReceived', { title: 'AI-Powered Document Analysis', count: 5 })}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('innovation.dashboard.recentActivity.timeAgo.hours', { count: 2 })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl" role="img" aria-label="checkmark">✅</div>
                            <div className="flex-1">
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {t('innovation.dashboard.recentActivity.ideaApproved', { title: 'Sustainable Packaging Initiative' })}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('innovation.dashboard.recentActivity.timeAgo.days', { count: 1 })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl" role="img" aria-label="rocket">🚀</div>
                            <div className="flex-1">
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {t('innovation.dashboard.recentActivity.ideaPromoted', { title: 'Digital Standards Portal' })}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('innovation.dashboard.recentActivity.timeAgo.days', { count: 3 })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="panel bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-4">
                    <div className="text-4xl" role="img" aria-label="lightbulb">💡</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('innovation.dashboard.proTip.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                            {t('innovation.dashboard.proTip.message')}
                        </p>
                        <Link to="/innovation/ideas/new" className="text-primary hover:underline font-semibold">
                            {t('innovation.dashboard.proTip.action')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InnovationDashboard;
