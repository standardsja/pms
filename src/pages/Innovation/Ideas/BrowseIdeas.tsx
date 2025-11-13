import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { fetchIdeas, voteForIdea, removeVote } from '../../../utils/ideasApi';
import Swal from 'sweetalert2';

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
}

const BrowseIdeas = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('popular');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.browse.title')));
        loadIdeas();
        // Polling for near real-time updates
        const intervalId = setInterval(() => {
            loadIdeas();
        }, 15000);
        return () => clearInterval(intervalId);
    }, [dispatch, t, sortBy]);

    const loadIdeas = async () => {
        setIsLoading(true);
        try {
            const sort = sortBy === 'popular' ? 'popularity' : 'recent';
            const response = await fetchIdeas({ sort, limit: 50 });
            // Handle both paginated and legacy response formats
            const data = response.ideas || response;
            setIdeas(data.map(idea => ({
                id: String(idea.id),
                title: idea.title,
                description: idea.description,
                category: idea.category,
                submittedBy: String(idea.submittedBy),
                submittedAt: idea.submittedAt,
                voteCount: idea.voteCount,
                hasVoted: idea.hasVoted || false,
                viewCount: idea.viewCount,
            })));
        } catch (error) {
            console.error('[BrowseIdeas] Error loading ideas:', error);
            // Only show error on initial load, not background refreshes
            if (!ideas.length) {
                Swal.fire({
                    icon: 'error',
                    title: 'Unable to Load Ideas',
                    text: 'We encountered a problem loading ideas. Please check your connection and try again.',
                    toast: true,
                    position: 'bottom-end',
                    timer: 3500,
                    showConfirmButton: false,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = async (ideaId: string) => {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        try {
            if (idea.hasVoted) {
                // Remove vote
                await removeVote(ideaId);
                // Refetch single idea for authoritative counts
                const response = await fetchIdeas();
                const updated = response.ideas || response;
                const fresh = updated.find(i => String(i.id) === ideaId);
                setIdeas(prev => prev.map(i => i.id === ideaId && fresh ? { ...i, voteCount: fresh.voteCount, hasVoted: false } : i));
            } else {
                // Add vote
                await voteForIdea(ideaId);
                const response = await fetchIdeas();
                const updated = response.ideas || response;
                const fresh = updated.find(i => String(i.id) === ideaId);
                setIdeas(prev => prev.map(i => i.id === ideaId && fresh ? { ...i, voteCount: fresh.voteCount, hasVoted: true } : i));
            }
        } catch (error) {
            console.error('[BrowseIdeas] Vote error:', error);
            
            // Check if it's a duplicate vote error
            if (error instanceof Error && error.message === 'ALREADY_VOTED') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Already Voted',
                    text: 'You are only able to vote once per idea',
                    toast: true,
                    position: 'top-end',
                    timer: 4000,
                    showConfirmButton: false,
                    timerProgressBar: true,
                });
                
                // Update local state to reflect they've already voted
                // Sync state with backend counts
                const updated = await fetchIdeas();
                const fresh = updated.find(i => String(i.id) === ideaId);
                setIdeas(prev => prev.map(i => i.id === ideaId && fresh ? { ...i, voteCount: fresh.voteCount, hasVoted: true } : i));
            } else {
                // Generic error
                const errorMessage = error instanceof Error ? error.message : 'Failed to vote';
                Swal.fire({
                    icon: 'error',
                    title: 'Vote Failed',
                    text: 'We were unable to process your vote. Please try again.',
                    toast: true,
                    position: 'bottom-end',
                    timer: 3000,
                    showConfirmButton: false,
                });
            }
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            TECHNOLOGY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            SUSTAINABILITY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            CUSTOMER_SERVICE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            PROCESS_IMPROVEMENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            COST_REDUCTION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            PRODUCT_INNOVATION: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
            OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        };
        return colors[category] || colors.OTHER;
    };

    const getCategoryLabel = (category: string) => {
        return t(`innovation.categories.${category}`);
    };

    // CRITICAL FIX: Apply filter and sort to ideas
    const filteredAndSortedIdeas = ideas
        .filter(idea => filter === 'all' || idea.category === filter)
        .sort((a, b) => {
            if (sortBy === 'popular') return b.voteCount - a.voteCount;
            if (sortBy === 'recent') return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
            if (sortBy === 'views') return b.viewCount - a.viewCount;
            return 0;
        });

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedIdeas.length / itemsPerPage);
    const paginatedIdeas = filteredAndSortedIdeas.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when filter/sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, sortBy]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 id="browse-ideas-title" className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="magnifying glass">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {t('innovation.browse.title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {t('innovation.browse.subtitle')}
                </p>
            </div>

            {/* Filters */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <label htmlFor="category-filter" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('innovation.browse.filters.category')}
                        </label>
                        <select
                            id="category-filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="form-select w-auto"
                            aria-label={t('innovation.browse.filters.category')}
                        >
                            <option value="all">{t('innovation.browse.filters.allCategories')}</option>
                            <option value="TECHNOLOGY">{t('innovation.categories.TECHNOLOGY')}</option>
                            <option value="SUSTAINABILITY">{t('innovation.categories.SUSTAINABILITY')}</option>
                            <option value="CUSTOMER_SERVICE">{t('innovation.categories.CUSTOMER_SERVICE')}</option>
                            <option value="PROCESS_IMPROVEMENT">{t('innovation.categories.PROCESS_IMPROVEMENT')}</option>
                            <option value="COST_REDUCTION">{t('innovation.categories.COST_REDUCTION')}</option>
                            <option value="PRODUCT_INNOVATION">{t('innovation.categories.PRODUCT_INNOVATION')}</option>
                            <option value="OTHER">{t('innovation.categories.OTHER')}</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <label htmlFor="sort-filter" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('innovation.browse.filters.sortBy')}
                        </label>
                        <select
                            id="sort-filter"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="form-select w-auto"
                            aria-label={t('innovation.browse.filters.sortBy')}
                        >
                            <option value="popular">{t('innovation.browse.filters.mostPopular')}</option>
                            <option value="recent">{t('innovation.browse.filters.mostRecent')}</option>
                            <option value="views">{t('innovation.browse.filters.mostViewed')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Ideas Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="panel animate-pulse">
                            <div className="flex gap-6">
                                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                    <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {paginatedIdeas.map((idea) => (
                        <div key={idea.id} className="panel hover:shadow-lg transition-shadow">
                            <div className="flex gap-6">
                                {/* Vote Section */}
                                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                                    <button
                                        onClick={() => handleVote(idea.id)}
                                        className={`p-3 rounded-lg transition-all ${
                                            idea.hasVoted
                                                ? 'bg-primary text-white scale-110'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white'
                                        }`}
                                        aria-label={idea.hasVoted ? t('innovation.browse.vote.removeVote') : t('innovation.browse.vote.upvote')}
                                        aria-pressed={idea.hasVoted}
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                    </button>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {idea.voteCount}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('innovation.browse.vote.votes')}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                            <Link
                                                to={`/innovation/ideas/${idea.id}`}
                                                className="text-xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors"
                                            >
                                                {idea.title}
                                            </Link>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(idea.category)}`}>
                                                    {getCategoryLabel(idea.category)}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {t('innovation.browse.submittedBy', { name: idea.submittedBy })}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    • {new Date(idea.submittedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            {t('innovation.browse.viewCount', { count: idea.viewCount })}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                                        {idea.description}
                                    </p>
                                    <Link
                                        to={`/innovation/ideas/${idea.id}`}
                                        className="text-primary hover:underline font-semibold text-sm inline-flex items-center gap-1"
                                    >
                                        {t('innovation.browse.viewDetails')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Previous page"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn btn-outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Next page"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredAndSortedIdeas.length === 0 && (
                <div className="panel text-center py-12">
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="magnifying glass">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('innovation.browse.empty.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('innovation.browse.empty.message')}
                    </p>
                    <Link to="/innovation/ideas/new" className="btn btn-primary gap-2 inline-flex">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('innovation.browse.empty.action')}
                    </Link>
                </div>
            )}
        </div>
    );
};

export default BrowseIdeas;
