import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../store/themeConfigSlice';
import { getUser } from '../../utils/auth';
import { fetchIdeas, fetchIdeaCounts } from '../../utils/ideasApi';
import { getHolidayGradient, getCurrentHolidayTheme } from '../../utils/holidayTheme';
import HolidayBanner from '../../components/HolidayBanner';
import HolidayCountdown from '../../components/HolidayCountdown';
import Swal from 'sweetalert2';

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
    const holidayTheme = getCurrentHolidayTheme();
    const heroGradient = getHolidayGradient('bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600');
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

            // Use optimized counts endpoint for stats
            const counts = await fetchIdeaCounts();

            // Fetch only recent ideas with server-side sorting
            const response = await fetchIdeas({ sort: 'recent' });
            const ideas = Array.isArray(response) ? response : (response as any).ideas || response;

            // Calculate myIdeas count (still need to filter client-side for this)
            const myIdeas = ideas.filter((idea: any) => idea.submittedBy === currentUser?.name || idea.submittedBy === currentUser?.email).length;

            setStats({
                myIdeas,
                approvedIdeas: counts.approved || 0,
                pendingIdeas: counts.pending || 0,
                promotedProjects: counts.promoted || 0,
                totalVotes: ideas.reduce((sum: number, idea: any) => sum + (idea.voteCount || 0), 0),
            });

            // Get 3 most recent ideas for activity feed (already sorted by API)
            setRecentIdeas(ideas.slice(0, 3));
        } catch (error) {
            console.error('[InnovationDashboard] Error loading data:', error);
            // Keep default zeros on error - silent fail for dashboard stats
            // User can still access all features, stats just show 0
        } finally {
            setIsLoading(false);
        }
    }

    const quickActions = [
        {
            title: t('innovation.dashboard.quickActions.submitNew.title'),
            description: t('innovation.dashboard.quickActions.submitNew.description'),
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            link: '/innovation/ideas/new',
            color: 'bg-gradient-to-br from-purple-500 to-pink-600',
        },
        {
            title: t('innovation.dashboard.quickActions.browse.title'),
            description: t('innovation.dashboard.quickActions.browse.description'),
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            ),
            link: '/innovation/ideas/browse',
            color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
        },
        {
            title: t('innovation.dashboard.quickActions.mySubmissions.title'),
            description: t('innovation.dashboard.quickActions.mySubmissions.description'),
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            ),
            link: '/innovation/ideas/mine',
            color: 'bg-gradient-to-br from-green-500 to-emerald-600',
        },
        {
            title: t('innovation.dashboard.quickActions.popular.title'),
            description: t('innovation.dashboard.quickActions.popular.description'),
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            link: '/innovation/ideas/popular',
            color: 'bg-gradient-to-br from-orange-500 to-red-600',
        },
    ];
    const filteredQuickActions = isCommittee ? quickActions.filter((a) => a.link !== '/innovation/ideas/popular') : quickActions;

    const statCards = [
        {
            label: t('innovation.dashboard.stats.myIdeas'),
            value: stats.myIdeas,
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                </svg>
            ),
            color: 'text-purple-600 dark:text-purple-400',
        },
        {
            label: t('innovation.dashboard.stats.approvedIdeas'),
            value: stats.approvedIdeas,
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'text-green-600 dark:text-green-400',
        },
        {
            label: t('innovation.dashboard.stats.underReview'),
            value: stats.pendingIdeas,
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'text-orange-600 dark:text-orange-400',
        },
        {
            label: t('innovation.dashboard.stats.bsjProjects'),
            value: stats.promotedProjects,
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            color: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: t('innovation.dashboard.stats.totalVotes'),
            value: stats.totalVotes,
            icon: (
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                </svg>
            ),
            color: 'text-pink-600 dark:text-pink-400',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Holiday Banner */}
            <HolidayBanner />

            {/* Hero Header */}
            <div className={`panel ${heroGradient} text-white overflow-hidden relative`}>
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-white rounded-full" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white rounded-full" />
                </div>
                <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div className="min-w-[250px]">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
                                {holidayTheme ? (
                                    <>
                                        <span className="text-lg">{holidayTheme.icon}</span>
                                        <span>{holidayTheme.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                                        <span>{t('innovation.hub', { defaultValue: 'Innovation Hub' })}</span>
                                        <span className="opacity-80">•</span>
                                        <span>{t('common.status.online', { defaultValue: 'Live' })}</span>
                                    </>
                                )}
                            </div>
                            <h1 id="innovation-dashboard-title" className="text-3xl sm:text-4xl font-black flex items-center gap-3">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                </svg>
                                {t('innovation.dashboard.title')}
                            </h1>
                            <p className="text-white/90 mt-2 max-w-2xl">{t('innovation.dashboard.subtitle')}</p>
                        </div>
                        <div className="flex-1 min-w-[260px] grid grid-cols-3 gap-3">
                            <div className="bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm">
                                <div className="text-xs text-white/80">{t('innovation.dashboard.stats.underReview', { defaultValue: 'Under Review' })}</div>
                                <div className="text-2xl font-black">{stats.pendingIdeas}</div>
                            </div>
                            <div className="bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm">
                                <div className="text-xs text-white/80">{t('innovation.dashboard.stats.approvedIdeas', { defaultValue: 'Approved Ideas' })}</div>
                                <div className="text-2xl font-black">{stats.approvedIdeas}</div>
                            </div>
                            <div className="bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm">
                                <div className="text-xs text-white/80">{t('innovation.dashboard.stats.totalVotes', { defaultValue: 'Total Votes' })}</div>
                                <div className="text-2xl font-black">{stats.totalVotes}</div>
                            </div>
                        </div>
                        <div>
                            <Link
                                to="/innovation/ideas/new"
                                className="btn btn-dark bg-black/30 hover:bg-black/40 border-white/30 text-white gap-2"
                                aria-label={t('innovation.dashboard.submitNewIdea')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('innovation.dashboard.submitNewIdea')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Holiday Countdown */}
            <HolidayCountdown />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="region" aria-label="Statistics">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="panel hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                                {isLoading ? (
                                    <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                                ) : (
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                                )}
                            </div>
                            <div className={stat.color}>{stat.icon}</div>
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
                                <div className="mb-3">{action.icon}</div>
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
                            const getStatusBadge = (status: string) => {
                                const badges = {
                                    APPROVED: {
                                        label: 'Approved',
                                        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                                        icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ),
                                    },
                                    PROMOTED_TO_PROJECT: {
                                        label: 'Promoted',
                                        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                                        icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        ),
                                    },
                                    REJECTED: {
                                        label: 'Rejected',
                                        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                                        icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        ),
                                    },
                                    PENDING_REVIEW: {
                                        label: 'Pending',
                                        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
                                        icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ),
                                    },
                                };
                                return badges[status as keyof typeof badges] || badges['PENDING_REVIEW'];
                            };

                            const statusBadge = getStatusBadge(idea.status);

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
                                    className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-primary/20"
                                >
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusBadge.color}`}>
                                        {statusBadge.icon}
                                        <span>{statusBadge.label}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-900 dark:text-white font-medium">{idea.title}</p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{getTimeAgo(idea.createdAt)}</p>
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
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                                            />
                                                        </svg>
                                                        {idea.voteCount === 1
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
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">No ideas yet. Be the first to submit one!</p>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="panel bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('innovation.dashboard.proTip.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">{t('innovation.dashboard.proTip.message')}</p>
                        <Link to="/innovation/ideas/new" className="text-primary hover:underline font-semibold">
                            {t('innovation.dashboard.proTip.action')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Trust & Security */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('common.security.iso9001', { defaultValue: 'ISO 9001' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-3.866-3.582-7-8-7v14c4.418 0 8-3.134 8-7z" />
                            </svg>
                            {t('common.security.encrypted', { defaultValue: 'Encrypted at rest' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 8a4 4 0 100 8 4 4 0 000-8z" />
                            </svg>
                            {t('common.sla.uptime', { defaultValue: '99.9% Uptime' })}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('common.lastUpdated', { defaultValue: 'Updated just now' })}</div>
                </div>
            </div>
        </div>
    );
};

export default InnovationDashboard;
