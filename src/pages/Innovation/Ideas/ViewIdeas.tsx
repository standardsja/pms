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
    hasVoted: boolean;
    viewCount: number;
    status: 'APPROVED' | 'UNDER_REVIEW' | 'IMPLEMENTED';
    tags: string[];
}

const ViewIdeas = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(true);
    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.view.title')));
        
        // Load ideas from API
        const loadIdeas = async () => {
            setIsLoading(true);
            try {
                console.log('[ViewIdeas] Fetching ideas from API...');
                const apiIdeas = await fetchIdeas();
                console.log('[ViewIdeas] Ideas loaded:', apiIdeas);
                
                setIdeas(apiIdeas.map(idea => ({
                    id: String(idea.id),
                    title: idea.title,
                    description: idea.description,
                    category: idea.category,
                    submittedBy: idea.submittedBy || 'Unknown',
                    submittedAt: idea.createdAt ? new Date(idea.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    voteCount: idea.voteCount || 0,
                    hasVoted: idea.hasVoted || false,
                    viewCount: idea.viewCount || 0,
                    status: idea.status === 'APPROVED' ? 'APPROVED' : idea.status === 'PROMOTED_TO_PROJECT' ? 'IMPLEMENTED' : 'UNDER_REVIEW',
                    tags: [], // TODO: Add tags support
                })));
            } catch (error) {
                console.error('[ViewIdeas] Error loading ideas:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error loading ideas',
                    text: error instanceof Error ? error.message : 'Failed to load ideas',
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 3000,
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadIdeas();
    }, [dispatch, t]);

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
        const badges: Record<string, { color: string; icon: string }> = {
            APPROVED: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: '✓' },
            UNDER_REVIEW: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: '⏳' },
            IMPLEMENTED: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: '🎉' },
        };
        return badges[status] || badges.APPROVED;
    };

    const filteredIdeas = ideas.filter(idea => {
        const matchesFilter = filter === 'all' || idea.category === filter;
        const matchesSearch = idea.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            idea.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            idea.tags.some(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-5xl" role="img" aria-label="diamond">💎</span>
                        {t('innovation.view.title')}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        {t('innovation.view.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                        aria-label={t('innovation.view.viewMode.grid')}
                        aria-pressed={viewMode === 'grid'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('innovation.view.filters.category')}</span>
                        <div className="flex gap-2">
                            {['all', 'TECHNOLOGY', 'SUSTAINABILITY', 'CUSTOMER_SERVICE'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                        filter === cat
                                            ? 'bg-primary text-white shadow-lg scale-105'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {cat === 'all' ? t('innovation.view.filters.all') : t(`innovation.categories.${cat}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ideas Display */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map((i) => (
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
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <h3 className="text-white font-bold text-lg line-clamp-2 drop-shadow-lg">
                                            {idea.title}
                                        </h3>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                                        {idea.description}
                                    </p>

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
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                                {t('innovation.view.engagement.votes', { count: idea.voteCount })}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                            <Link
                                key={idea.id}
                                to={`/innovation/ideas/${idea.id}`}
                                className="panel hover:shadow-lg transition-all group"
                            >
                                <div className="flex gap-4">
                                    <div className={`w-2 rounded-full bg-gradient-to-b ${getCategoryColor(idea.category)}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                                {idea.title}
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color} whitespace-nowrap`}>
                                                {statusBadge.icon} {t(`innovation.view.status.${idea.status === 'UNDER_REVIEW' ? 'underReview' : idea.status.toLowerCase()}`)}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                                            {idea.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap gap-2">
                                                {idea.tags.map((tag, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    {t('innovation.view.engagement.votes', { count: idea.voteCount })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                    <div className="text-6xl mb-4" role="img" aria-label="magnifying glass">🔍</div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('innovation.view.empty.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{t('innovation.view.empty.message')}</p>
                    <button onClick={() => { setSearchTerm(''); setFilter('all'); }} className="btn btn-outline-primary">
                        {t('innovation.view.empty.action')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ViewIdeas;
