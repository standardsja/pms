import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useDebounce } from '../../../utils/useDebounce';
import { fetchIdeas } from '../../../utils/ideasApi';

interface Idea {
    id: string;
    title: string;
    description: string;
    category: string;
    submittedBy: string;
    submittedAt: string;
    voteCount: number;
    upvoteCount: number;
    downvoteCount: number;
    hasVoted: boolean;
    viewCount: number;
    status: 'APPROVED' | 'UNDER_REVIEW' | 'IMPLEMENTED';
    tags: string[];
    firstAttachmentUrl?: string | null;
    attachmentsCount?: number;
}

const ViewIdeas = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [filter, setFilter] = useState('all');
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(true);
    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.view.title')));
        let active = true;

        const mapIdeas = (apiIdeas: any[]): Idea[] =>
            apiIdeas.map((idea) => ({
                id: String(idea.id),
                title: idea.title,
                description: idea.description,
                category: idea.category,
                submittedBy: idea.submittedBy || 'Unknown',
                submittedAt: idea.createdAt ? new Date(idea.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                voteCount: idea.voteCount || 0,
                upvoteCount: Math.max(0, idea.upvoteCount || 0),
                downvoteCount: Math.max(0, idea.downvoteCount || 0),
                hasVoted: idea.hasVoted || false,
                viewCount: idea.viewCount || 0,
                status: (idea.status === 'APPROVED' ? 'APPROVED' : idea.status === 'PROMOTED_TO_PROJECT' ? 'IMPLEMENTED' : 'UNDER_REVIEW') as Idea['status'],
                tags: Array.isArray(idea.tags) ? idea.tags : [],
                firstAttachmentUrl: (idea as any).firstAttachmentUrl || (idea as any).attachments?.[0]?.fileUrl || null,
                attachmentsCount: (idea as any).attachments?.length || 0,
            }));

        const loadIdeas = async (showLoader = true) => {
            if (showLoader) setIsLoading(true);
            try {
                const response = await fetchIdeas({
                    includeAttachments: true,
                    status: statusFilters.length ? statusFilters : undefined,
                    category: categoryFilters.length ? categoryFilters : undefined,
                    sort: sortBy,
                    limit: 50,
                });
                // Handle both paginated and legacy response formats
                const apiIdeas = response.ideas || response;
                if (active) setIdeas(mapIdeas(apiIdeas));
            } catch (error) {
                console.error('[ViewIdeas] Error loading ideas:', error);
                // Only show error on initial load, not background polling
                if (active && !ideas.length) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Unable to Load Ideas',
                        text: 'We encountered a problem loading ideas. Please check your connection and try again.',
                        toast: true,
                        position: 'bottom-end',
                        showConfirmButton: false,
                        timer: 3500,
                    });
                }
            } finally {
                if (active) setIsLoading(false);
            }
        };

        loadIdeas();
        const intervalId = setInterval(() => loadIdeas(false), 60000);
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') loadIdeas(false);
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        return () => {
            active = false;
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', visibilityHandler);
        };
    }, [dispatch, t, statusFilters, categoryFilters, sortBy]);

    // Persist filters
    useEffect(() => {
        const saved = localStorage.getItem('ideasFilters');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.status)) setStatusFilters(parsed.status);
                if (Array.isArray(parsed.category)) setCategoryFilters(parsed.category);
                if (parsed.sort) setSortBy(parsed.sort);
            } catch {}
        }
    }, []);

    useEffect(() => {
        const payload = JSON.stringify({ status: statusFilters, category: categoryFilters, sort: sortBy });
        localStorage.setItem('ideasFilters', payload);
    }, [statusFilters, categoryFilters, sortBy]);

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            TECHNOLOGY: 'from-blue-500 to-cyan-500',
            SUSTAINABILITY: 'from-green-500 to-emerald-500',
            CUSTOMER_SERVICE: 'from-purple-500 to-pink-500',
            PROCESS_IMPROVEMENT: 'from-orange-500 to-amber-500',
            COST_REDUCTION: 'from-yellow-500 to-orange-500',
            PRODUCT_INNOVATION: 'from-pink-500 to-rose-500',
            OTHER: 'from-gray-500 to-slate-500',
        };
        return colors[category] || colors.OTHER;
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { color: string; icon: JSX.Element }> = {
            APPROVED: {
                color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                icon: (
                    <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ),
            },
            UNDER_REVIEW: {
                color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                icon: (
                    <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            },
            IMPLEMENTED: {
                color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                icon: (
                    <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                    </svg>
                ),
            },
        };
        return badges[status] || badges.APPROVED;
    };

    const filteredIdeas = ideas.filter((idea) => {
        const matchesCategoryUI = filter === 'all' || idea.category === filter;
        const matchesMultiCategory = categoryFilters.length ? categoryFilters.includes(idea.category) : true;
        const matchesMultiStatus = statusFilters.length
            ? statusFilters.includes(idea.status === 'UNDER_REVIEW' ? 'PENDING_REVIEW' : idea.status === 'IMPLEMENTED' ? 'PROMOTED_TO_PROJECT' : idea.status)
            : true;
        const matchesSearch =
            idea.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            idea.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            idea.tags.some((tag) => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));
        return matchesCategoryUI && matchesMultiCategory && matchesMultiStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="diamond">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                        </svg>
                        {t('innovation.view.title')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">{t('innovation.view.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                        aria-label={t('innovation.view.viewMode.grid')}
                        aria-pressed={viewMode === 'grid'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                        aria-label={t('innovation.view.viewMode.list')}
                        aria-pressed={viewMode === 'list'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="panel">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('innovation.view.search.placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input pl-10 pr-4"
                            />
                            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('innovation.view.filters.category')}</span>
                        <div className="flex flex-wrap gap-2">
                            {['PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER'].map((cat) => {
                                const active = categoryFilters.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoryFilters(active ? categoryFilters.filter((c) => c !== cat) : [...categoryFilters, cat])}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                            active ? 'bg-primary text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                        aria-pressed={active}
                                    >
                                        {t(`innovation.categories.${cat}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('innovation.view.filters.status')}</span>
                        <div className="flex flex-wrap gap-2">
                            {['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROJECT', 'DRAFT'].map((s) => {
                                const active = statusFilters.includes(s);
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilters(active ? statusFilters.filter((x) => x !== s) : [...statusFilters, s])}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                            active ? 'bg-secondary text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                        aria-pressed={active}
                                    >
                                        {t(`innovation.view.statusFilter.${s}`, { defaultValue: s })}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('innovation.view.filters.sort')}</span>
                        <div className="flex gap-2">
                            {(['recent', 'popular', 'trending'] as const).map((srt) => (
                                <button
                                    key={srt}
                                    onClick={() => setSortBy(srt)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                        sortBy === srt ? 'bg-primary/80 text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    aria-pressed={sortBy === srt}
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        {srt === 'recent' && (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        {srt === 'popular' && (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                                />
                                            </svg>
                                        )}
                                        {srt === 'trending' && (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        )}
                                        {t(`innovation.view.sort.${srt}`, { defaultValue: srt })}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setCategoryFilters([]);
                                setStatusFilters([]);
                                setSortBy('recent');
                                setFilter('all');
                            }}
                            className="btn btn-outline-danger btn-sm"
                        >
                            {t('innovation.view.filters.clearAll', { defaultValue: 'Clear Filters' })}
                        </button>
                    </div>
                </div>
            </div>

            {/* Ideas Display */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-2xl overflow-hidden shadow-md animate-pulse bg-white dark:bg-gray-800 h-64"></div>
                    ))}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredIdeas.map((idea) => {
                        const statusBadge = getStatusBadge(idea.status);
                        return (
                            <Link
                                key={idea.id}
                                to={`/innovation/ideas/${idea.id}`}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                            >
                                {/* Gradient Header */}
                                <div className={`h-32 bg-gradient-to-br ${getCategoryColor(idea.category)} relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-black/10"></div>
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color} backdrop-blur-sm`}>
                                            {statusBadge.icon} {t(`innovation.view.status.${idea.status === 'UNDER_REVIEW' ? 'underReview' : idea.status.toLowerCase()}`)}
                                        </span>
                                    </div>
                                    {/* Thumbnail overlay */}
                                    {idea.firstAttachmentUrl && (
                                        <div className="absolute bottom-3 right-3">
                                            <div className="relative">
                                                <img
                                                    src={idea.firstAttachmentUrl}
                                                    alt={t('innovation.view.thumbnailAlt', { defaultValue: 'Idea image' })}
                                                    className="w-12 h-12 rounded object-cover border-2 border-white shadow"
                                                    loading="lazy"
                                                />
                                                {idea.attachmentsCount && idea.attachmentsCount > 1 && (
                                                    <span className="absolute -top-2 -right-2 bg-black/80 text-white text-xs rounded-full px-2 py-0.5">+{idea.attachmentsCount - 1}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <h3 className="text-white font-bold text-lg line-clamp-2 drop-shadow-lg">{idea.title}</h3>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">{idea.description}</p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {idea.tags.slice(0, 3).map((tag, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Stats + CTA */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                                {idea.upvoteCount}
                                            </span>
                                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                                {idea.downvoteCount}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                    />
                                                </svg>
                                                {t('innovation.view.engagement.views', { count: idea.viewCount })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">{new Date(idea.submittedAt).toLocaleDateString()}</span>
                                            <span className="text-primary font-semibold text-sm inline-flex items-center gap-1 group-hover:translate-x-0">
                                                {t('innovation.view.viewDetails', { defaultValue: 'View Details' })}
                                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Effect */}
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-all pointer-events-none"></div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredIdeas.map((idea) => {
                        const statusBadge = getStatusBadge(idea.status);
                        return (
                            <Link key={idea.id} to={`/innovation/ideas/${idea.id}`} className="panel hover:shadow-lg transition-all group">
                                <div className="flex gap-4">
                                    <div className={`w-2 rounded-full bg-gradient-to-b ${getCategoryColor(idea.category)}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{idea.title}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color} whitespace-nowrap`}>
                                                {statusBadge.icon} {t(`innovation.view.status.${idea.status === 'UNDER_REVIEW' ? 'underReview' : idea.status.toLowerCase()}`)}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 mb-3">{idea.description}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap gap-2">
                                                {idea.tags.map((tag, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    {idea.upvoteCount}
                                                </span>
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    {idea.downvoteCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                        />
                                                    </svg>
                                                    {t('innovation.view.engagement.views', { count: idea.viewCount })}
                                                </span>
                                                <span className="text-primary font-semibold inline-flex items-center gap-1">
                                                    {t('innovation.view.viewDetails', { defaultValue: 'View Details' })}
                                                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredIdeas.length === 0 && (
                <div className="panel text-center py-16">
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="magnifying glass">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('innovation.view.empty.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{t('innovation.view.empty.message')}</p>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setFilter('all');
                        }}
                        className="btn btn-outline-primary"
                    >
                        {t('innovation.view.empty.action')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ViewIdeas;
