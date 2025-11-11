import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getUser } from '../../../utils/auth';
import { fetchIdeas, voteForIdea, removeVote, fetchIdeaById } from '../../../utils/ideasApi';

interface Idea {
    id: string;
    title: string;
    description: string;
    category: string;
    submittedBy: string;
    submittedAt: string;
    upvotes: number;
    downvotes: number;
    voteCount: number;
    hasVoted: 'up' | 'down' | null;
    viewCount: number;
    trendingScore: number;
    firstAttachmentUrl?: string | null;
    attachmentsCount?: number;
}

const VoteOnIdeas = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentUser = getUser();
    const isCommittee = currentUser?.role === 'INNOVATION_COMMITTEE';
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [sortBy, setSortBy] = useState<'trending' | 'popular' | 'recent'>('trending');
    const [showVotedOnly, setShowVotedOnly] = useState(false);
    const [statusFilters, setStatusFilters] = useState<string[]>(['PENDING_REVIEW']);
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [voteAnimation, setVoteAnimation] = useState<string | null>(null);

    useEffect(() => {
        if (isCommittee) {
            // Committee members don't need voting; redirect them to their dashboard
            navigate('/innovation/committee/dashboard', { replace: true });
            return;
        }
        dispatch(setPageTitle(t('innovation.vote.title')));
        
        // Load ideas from API
        const loadIdeas = async () => {
            try {
                const apiIdeas = await fetchIdeas({ 
                    includeAttachments: true,
                    status: statusFilters.length ? statusFilters : undefined,
                    category: categoryFilters.length ? categoryFilters : undefined,
                    sort: sortBy,
                });
                
                setIdeas(apiIdeas.map(idea => ({
                    id: String(idea.id),
                    title: idea.title,
                    description: idea.description,
                    category: idea.category,
                    submittedBy: idea.submittedBy || 'Unknown',
                    submittedAt: idea.createdAt ? new Date(idea.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    upvotes: Math.max(0, idea.upvoteCount || 0),
                    downvotes: Math.max(0, idea.downvoteCount || 0),
                    voteCount: idea.voteCount || 0,
                    hasVoted: idea.userVoteType === 'UPVOTE' ? 'up' : idea.userVoteType === 'DOWNVOTE' ? 'down' : null,
                    viewCount: idea.viewCount || 0,
                    trendingScore: idea.voteCount || 0,
                    firstAttachmentUrl: (idea as any).firstAttachmentUrl || (idea as any).attachments?.[0]?.fileUrl || null,
                    attachmentsCount: (idea as any).attachments?.length || 0,
                })));
            } catch (error) {
                console.error('[VoteOnIdeas] Error loading ideas:', error);
                // Only show error on first load, not background polling
                if (!ideas.length) {
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
            }
        };
        
        loadIdeas();
        // Polling for real-time updates
        const intervalId = setInterval(() => {
            loadIdeas();
        }, 15000);
        return () => clearInterval(intervalId);
    }, [dispatch, t, isCommittee, navigate, statusFilters, categoryFilters, sortBy]);

    // Persist filters
    useEffect(() => {
        const saved = localStorage.getItem('voteIdeasFilters');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.status)) setStatusFilters(parsed.status);
                if (Array.isArray(parsed.category)) setCategoryFilters(parsed.category);
                if (parsed.sort) setSortBy(parsed.sort);
                if (typeof parsed.votedOnly === 'boolean') setShowVotedOnly(parsed.votedOnly);
            } catch {}
        }
    }, []);
    useEffect(() => {
        const payload = JSON.stringify({ status: statusFilters, category: categoryFilters, sort: sortBy, votedOnly: showVotedOnly });
        localStorage.setItem('voteIdeasFilters', payload);
    }, [statusFilters, categoryFilters, sortBy, showVotedOnly]);

    // Helper function to update idea state from server response
    const updateIdeaState = (updatedIdea: any) => {
        setIdeas(ideas.map(i => 
            i.id === String(updatedIdea.id)
                ? {
                    ...i,
                    upvotes: updatedIdea.upvoteCount || 0,
                    downvotes: updatedIdea.downvoteCount || 0,
                    voteCount: updatedIdea.voteCount || 0,
                    hasVoted: updatedIdea.userVoteType === 'UPVOTE' ? 'up' : updatedIdea.userVoteType === 'DOWNVOTE' ? 'down' : null,
                    viewCount: updatedIdea.viewCount || i.viewCount,
                }
                : i
        ));
    };

    const handleVote = async (ideaId: string, voteType: 'up' | 'down') => {
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) return;

        setVoteAnimation(ideaId);
        setTimeout(() => setVoteAnimation(null), 600);

        try {
            // If user clicks same vote type, remove vote
            if (idea.hasVoted === voteType) {
                await removeVote(ideaId);
                const updatedIdea = await fetchIdeaById(ideaId);
                updateIdeaState(updatedIdea);
                
                void Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 1500,
                    icon: 'info',
                    title: voteType === 'up' 
                        ? t('innovation.vote.actions.removeUpvote')
                        : t('innovation.vote.actions.removeDownvote', { defaultValue: 'Downvote removed' }),
                });
            } else {
                // Add or switch vote
                await voteForIdea(ideaId, voteType === 'up' ? 'UPVOTE' : 'DOWNVOTE');
                const updatedIdea = await fetchIdeaById(ideaId);
                updateIdeaState(updatedIdea);
                
                void Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 1500,
                    icon: 'success',
                    title: voteType === 'up'
                        ? t('innovation.vote.actions.upvote')
                        : t('innovation.vote.actions.downvote', { defaultValue: 'Downvoted!' }),
                });
            }
        } catch (error) {
            console.error('[VoteOnIdeas] Error voting:', error);
            
            // Check if vote limit reached
            if (error instanceof Error && error.message === 'VOTE_LIMIT_REACHED') {
                void Swal.fire({
                    icon: 'warning',
                    title: t('innovation.vote.warning.noVotesLeft.title'),
                    text: t('innovation.vote.warning.noVotesLeft.message'),
                    confirmButtonText: 'OK',
                });
                return;
            }
            
            // Check if it's a duplicate vote error
            if (error instanceof Error && error.message.includes('already voted')) {
                void Swal.fire({
                    icon: 'warning',
                    title: 'Already Voted',
                    text: 'You have already voted for this idea',
                    toast: true,
                    position: 'top-end',
                    timer: 4000,
                    showConfirmButton: false,
                    timerProgressBar: true,
                });
                
                // Refresh from server to get correct state
                try {
                    const updatedIdea = await fetchIdeaById(ideaId);
                    updateIdeaState(updatedIdea);
                } catch {}
            } else {
                // Generic error
                void Swal.fire({
                    icon: 'error',
                    title: 'Vote Failed',
                    text: 'We were unable to process your vote. Please try again.',
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 3000,
                });
            }
        }
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            TECHNOLOGY: '🤖',
            SUSTAINABILITY: '🌱',
            CUSTOMER_SERVICE: '🎯',
            PROCESS_IMPROVEMENT: '⚡',
            COST_REDUCTION: '💰',
            PRODUCT_INNOVATION: '🚀',
            OTHER: '💡',
        };
        return icons[category] || icons.OTHER;
    };

    const sortedIdeas = [...ideas].sort((a, b) => {
        if (sortBy === 'trending') return b.trendingScore - a.trendingScore;
        if (sortBy === 'popular') return b.voteCount - a.voteCount;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    const filteredIdeas = showVotedOnly ? sortedIdeas.filter(i => i.hasVoted !== null) : sortedIdeas;

    const totalVotes = ideas.filter(i => i.hasVoted !== null).length;
    const votingPower = Math.max(0, 10 - totalVotes);

    return (
        <div className="space-y-6">
            {/* Hero Header */}
            <div className="panel bg-gradient-to-r from-primary to-purple-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>
                <div className="relative z-10 p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                                <span className="text-5xl" role="img" aria-label="ballot">🗳️</span>
                                {t('innovation.vote.title')}
                            </h1>
                            <p className="text-white/90 text-lg mb-4">{t('innovation.vote.subtitle')}</p>
                            <div className="flex items-center gap-6">
                                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                    <div className="text-3xl font-bold">{totalVotes}</div>
                                    <div className="text-sm text-white/80">{t('innovation.vote.votingPower.used', { used: totalVotes, total: 10 })}</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                    <div className="text-3xl font-bold">{votingPower}</div>
                                    <div className="text-sm text-white/80">{t('innovation.vote.votingPower.remaining', { count: votingPower })}</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                    <div className="text-3xl font-bold">{ideas.length}</div>
                                    <div className="text-sm text-white/80">Total Ideas</div>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:block text-6xl opacity-50">
                            <div className="flex items-center gap-4">
                                <span>👍</span>
                                <span>👎</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('innovation.vote.sort.label')}</span>
                    <div className="flex gap-2">
                        {(['trending', 'popular', 'recent'] as const).map((sort) => (
                            <button
                                key={sort}
                                onClick={() => setSortBy(sort)}
                                className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                                    sortBy === sort
                                        ? 'bg-primary text-white shadow-lg scale-105'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                                aria-pressed={sortBy === sort}
                                aria-label={
                                    sort === 'trending'
                                        ? t('innovation.vote.sort.trending')
                                        : sort === 'popular'
                                        ? t('innovation.vote.sort.popular')
                                        : t('innovation.vote.sort.recent')
                                }
                            >
                                {sort === 'trending' && '🔥'} {sort === 'popular' && '⭐'} {sort === 'recent' && '🆕'} {t(`innovation.vote.sort.${sort}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status:</span>
                    <div className="flex flex-wrap gap-2">
                        {['PENDING_REVIEW','APPROVED','REJECTED','PROMOTED_TO_PROJECT'].map((s) => {
                            const active = statusFilters.includes(s);
                            const labels: Record<string, string> = {
                                'PENDING_REVIEW': 'Pending Review',
                                'APPROVED': 'Approved',
                                'REJECTED': 'Rejected',
                                'PROMOTED_TO_PROJECT': 'Promoted'
                            };
                            return (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilters(active ? statusFilters.filter(x => x !== s) : [...statusFilters, s])}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? 'bg-secondary text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                    aria-pressed={active}
                                >
                                    {labels[s] || s}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category:</span>
                    <div className="flex flex-wrap gap-2">
                        {['Process Improvement','Technology','Customer Service','Sustainability','Cost Reduction','Product Innovation','Other'].map((cat, idx) => {
                            const catKey = ['PROCESS_IMPROVEMENT','TECHNOLOGY','CUSTOMER_SERVICE','SUSTAINABILITY','COST_REDUCTION','PRODUCT_INNOVATION','OTHER'][idx];
                            const active = categoryFilters.includes(catKey);
                            return (
                                <button
                                    key={catKey}
                                    onClick={() => setCategoryFilters(active ? categoryFilters.filter(c => c !== catKey) : [...categoryFilters, catKey])}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${active ? 'bg-primary text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                    aria-pressed={active}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={showVotedOnly}
                        onChange={(e) => setShowVotedOnly(e.target.checked)}
                        aria-checked={showVotedOnly}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show only voted ideas</span>
                </label>
                <button
                    type="button"
                    onClick={() => { setStatusFilters(['PENDING_REVIEW']); setCategoryFilters([]); setSortBy('trending'); setShowVotedOnly(false); }}
                    className="btn btn-outline-danger btn-sm"
                >
                    Clear Filters
                </button>
            </div>

            {/* Ideas Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredIdeas.map((idea, index) => (
                    <div
                        key={idea.id}
                        className={`panel hover:shadow-xl transition-all duration-300 ${
                            voteAnimation === idea.id ? 'scale-105' : ''
                        }`}
                    >
                        {/* Rank Badge */}
                        {sortBy === 'trending' && index < 3 && (
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg z-10 animate-pulse">
                                <span className="text-white font-black text-lg">#{index + 1}</span>
                            </div>
                        )}

                        <div className="flex gap-4">
                            {/* Vote Column */}
                            <div className="flex flex-col items-center gap-3">
                                {/* Vote Buttons Side by Side */}
                                <div className="flex items-center gap-2">
                                    {/* Upvote Button */}
                                    <button
                                        onClick={() => handleVote(idea.id, 'up')}
                                        disabled={idea.hasVoted !== 'up' && votingPower === 0}
                                        className={`group relative p-3 rounded-xl transition-all transform ${
                                            idea.hasVoted === 'up'
                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg scale-110'
                                                : (votingPower === 0)
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-500 hover:to-emerald-600 hover:text-white hover:scale-110 hover:shadow-lg'
                                        }`}
                                        aria-pressed={idea.hasVoted === 'up'}
                                        aria-label={t('innovation.vote.actions.upvote')}
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                    </button>

                                    {/* Downvote Button */}
                                    <button
                                        onClick={() => handleVote(idea.id, 'down')}
                                        disabled={idea.hasVoted !== 'down' && votingPower === 0}
                                        className={`group relative p-3 rounded-xl transition-all transform ${
                                            idea.hasVoted === 'down'
                                                ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg scale-110'
                                                : (votingPower === 0)
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-red-500 hover:to-rose-600 hover:text-white hover:scale-110 hover:shadow-lg'
                                        }`}
                                        aria-pressed={idea.hasVoted === 'down'}
                                        aria-label={t('innovation.vote.actions.downvote')}
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {/* Vote Count Display */}
                                <div className="text-center">
                                    <div className={`text-2xl font-black inline-flex items-center gap-1 ${
                                        idea.voteCount > 0 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : idea.voteCount < 0 
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {idea.voteCount > 0 ? '▲' : idea.voteCount < 0 ? '▼' : '•'} {idea.voteCount > 0 ? '+' : ''}{idea.voteCount}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">score</div>
                                    {/* Vote breakdown */}
                                    <div className="flex items-center justify-center gap-2 mt-2 text-xs">
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                            </svg>
                                            {idea.upvotes}
                                        </span>
                                        <span className="text-gray-400">|</span>
                                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                            </svg>
                                            {idea.downvotes}
                                        </span>
                                    </div>
                                </div>

                                {sortBy === 'trending' && idea.trendingScore > 0 && (
                                    <div className="mt-1 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 rounded text-xs font-bold">
                                        🔥 {idea.trendingScore}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="text-3xl">{getCategoryIcon(idea.category)}</span>
                                    <div className="flex-1">
                                        <Link
                                            to={`/innovation/ideas/${idea.id}`}
                                            className="text-xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-2"
                                        >
                                            {idea.title}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            <span>{t('innovation.view.submittedBy', { name: idea.submittedBy })}</span>
                                            <span>•</span>
                                            <span>{new Date(idea.submittedAt).toLocaleDateString()}</span>
                                            {idea.firstAttachmentUrl && (
                                                <span className="ml-2 inline-flex items-center gap-1">
                                                    <img src={idea.firstAttachmentUrl} alt="thumb" className="w-6 h-6 rounded object-cover border" loading="lazy" />
                                                    {idea.attachmentsCount && idea.attachmentsCount > 1 && (
                                                        <span className="text-xs text-gray-400">+{idea.attachmentsCount - 1}</span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                                    {idea.description}
                                </p>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            {t('innovation.view.engagement.views', { count: idea.viewCount })}
                                        </span>
                                    </div>
                                    <Link
                                        to={`/innovation/ideas/${idea.id}`}
                                        className="text-primary hover:text-primary-dark font-semibold text-sm inline-flex items-center gap-1 group"
                                        aria-label={t('innovation.view.viewDetails', { defaultValue: 'View Details' })}
                                    >
                                        {t('innovation.view.viewDetails', { defaultValue: 'View Details' })}
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredIdeas.length === 0 && (
                <div className="panel text-center py-16">
                    <div className="text-6xl mb-4" role="img" aria-label="ballot">🗳️</div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {showVotedOnly ? t('innovation.vote.empty.noVoted.title') : t('innovation.vote.empty.noIdeas.title')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {showVotedOnly ? t('innovation.vote.empty.noVoted.message') : t('innovation.vote.empty.noIdeas.message')}
                    </p>
                    {showVotedOnly && (
                        <button onClick={() => setShowVotedOnly(false)} className="btn btn-primary">
                            {t('innovation.vote.empty.noVoted.action')}
                        </button>
                    )}
                </div>
            )}

            {/* Voting Power Warning */}
            {votingPower === 0 && (
                <div className="panel bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl" role="img" aria-label="warning">⚠️</span>
                        <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-300">{t('innovation.vote.warning.noVotesLeft.title')}</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">{t('innovation.vote.warning.noVotesLeft.message')}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoteOnIdeas;
