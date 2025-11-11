import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../store/themeConfigSlice';
import { getUser } from '../../utils/auth';
import { fetchIdeas } from '../../utils/ideasApi';

interface DashboardStats {
    myIdeas: number;
    approvedIdeas: number;
    pendingIdeas: number;
    promotedProjects: number;
    totalVotes: number;
}

const InnovationDashboard = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const currentUser = getUser();
    const isCommittee = currentUser?.role === 'INNOVATION_COMMITTEE';
    const [stats, setStats] = useState<DashboardStats>({
        myIdeas: 0,
        approvedIdeas: 0,
        pendingIdeas: 0,
        promotedProjects: 0,
        totalVotes: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recentIdeas, setRecentIdeas] = useState<any[]>([]);

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.hub')));
        loadDashboardData();
    }, [dispatch, t]);

    async function loadDashboardData() {
        try {
            setIsLoading(true);
            const ideas = await fetchIdeas();
            
            // Calculate stats from fetched ideas
            const myIdeas = ideas.filter(idea => 
                idea.submittedBy === currentUser?.name || idea.submittedBy === currentUser?.email
            ).length;
            
            const approvedIdeas = ideas.filter(idea => idea.status === 'APPROVED').length;
            const pendingIdeas = ideas.filter(idea => idea.status === 'PENDING_REVIEW').length;
            const promotedProjects = ideas.filter(idea => idea.status === 'PROMOTED_TO_PROJECT').length;
            const totalVotes = ideas.reduce((sum, idea) => sum + (idea.voteCount || 0), 0);

            setStats({
                myIdeas,
                approvedIdeas,
                pendingIdeas,
                promotedProjects,
                totalVotes,
            });

            // Get 3 most recent ideas for activity feed
            const sortedByDate = [...ideas].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setRecentIdeas(sortedByDate.slice(0, 3));
        } catch (error) {
            console.error('[InnovationDashboard] Error loading data:', error);
            // Keep default zeros on error
        } finally {
            setIsLoading(false);
        }
    }

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
                    <Link to="/innovation/ideas/browse" className="text-primary hover:underline text-sm font-semibold">
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
                ) : recentIdeas.length > 0 ? (
                    <div className="space-y-4" role="feed" aria-label={t('innovation.dashboard.recentActivity.title')}>
                        {recentIdeas.map((idea) => {
                            const statusIcon = 
                                idea.status === 'APPROVED' ? '✅' :
                                idea.status === 'PROMOTED_TO_PROJECT' ? '🚀' :
                                idea.status === 'REJECTED' ? '❌' :
                                '⏳';
                            
                            const getTimeAgo = (dateStr: string) => {
                                const now = new Date();
                                const then = new Date(dateStr);
                                const diffMs = now.getTime() - then.getTime();
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                const diffDays = Math.floor(diffHours / 24);
                                
                                if (diffDays > 0) {
                                    return t('innovation.dashboard.recentActivity.timeAgo.days', { count: diffDays, defaultValue: `${diffDays} days ago` });
                                } else if (diffHours > 0) {
                                    return t('innovation.dashboard.recentActivity.timeAgo.hours', { count: diffHours, defaultValue: `${diffHours} hours ago` });
                                } else {
                                    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
                                    return t('innovation.dashboard.recentActivity.timeAgo.minutes', { count: mins, defaultValue: `${mins} minutes ago` });
                                }
                            };

                            return (
                                <Link 
                                    key={idea.id} 
                                    to={`/innovation/ideas/${idea.id}`}
                                    className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="text-2xl" role="img" aria-label="status">{statusIcon}</div>
                                    <div className="flex-1">
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {idea.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {getTimeAgo(idea.createdAt)}
                                            </p>
                                            {/* Category badge */}
                                            {idea.category && (
                                                <>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 font-medium">
                                                        {t(`innovation.categories.${idea.category}`, { defaultValue: idea.category })}
                                                    </span>
                                                </>
                                            )}
                                            {/* Submitted by */}
                                            {idea.submittedBy && (
                                                <>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {t('innovation.browse.submittedBy', { name: idea.submittedBy, defaultValue: `by ${idea.submittedBy}` })}
                                                    </span>
                                                </>
                                            )}
                                            {idea.voteCount > 0 && (
                                                <>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                        👍 {idea.voteCount === 1
                                                            ? t('innovation.dashboard.recentActivity.voteSingular', { count: 1, defaultValue: '1 vote' })
                                                            : t('innovation.dashboard.recentActivity.votePlural', { count: idea.voteCount, defaultValue: `${idea.voteCount} votes` })}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-2">💡</div>
                        <p className="text-gray-600 dark:text-gray-400">No ideas yet. Be the first to submit one!</p>
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
