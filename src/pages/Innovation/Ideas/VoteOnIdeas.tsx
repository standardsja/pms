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
    const [statusFilters, setStatusFilters] = useState<string[]>(['APPROVED']); // Show approved ideas for public voting
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
                const response = await fetchIdeas({
                    includeAttachments: true,
                    status: statusFilters.length ? statusFilters : undefined,
                    category: categoryFilters.length ? categoryFilters : undefined,
                    sort: sortBy,
                    limit: 50, // Load 50 ideas at a time
                });

                // Handle both paginated and legacy response formats
                const apiIdeas = response.ideas || response;

                setIdeas(
                    apiIdeas.map((idea) => ({
                        id: String(idea.id),
                        title: idea.title,
                        description: idea.description,
                        category: idea.category,
                        submittedBy: idea.submittedBy || 'Unknown',
                        submittedAt: idea.createdAt ? new Date(idea.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        upvotes: Math.max(0, idea.upvoteCount || 0),
                        downvotes: Math.max(0, idea.downvoteCount || 0),
                        voteCount: idea.voteCount || 0,
                        hasVoted: (idea as any).hasVoted || null,
                        viewCount: idea.viewCount || 0,
                        trendingScore: idea.voteCount || 0,
                        firstAttachmentUrl: (idea as any).firstAttachmentUrl || (idea as any).attachments?.[0]?.fileUrl || null,
                        attachmentsCount: (idea as any).attachments?.length || 0,
                    }))
                );
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
        // Polling for real-time updates - reduced from 15s to 60s with caching
        const intervalId = setInterval(() => {
            loadIdeas();
        }, 60000);
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
        setIdeas(
            ideas.map((i) =>
                i.id === String(updatedIdea.id)
                    ? {
                          ...i,
                          upvotes: updatedIdea.upvoteCount || 0,
                          downvotes: updatedIdea.downvoteCount || 0,
                          voteCount: updatedIdea.voteCount || 0,
                          hasVoted: updatedIdea.hasVoted || null,
                          viewCount: updatedIdea.viewCount || i.viewCount,
                      }
                    : i
            )
        );
    };

    const handleVote = async (ideaId: string, voteType: 'up' | 'down') => {
        const idea = ideas.find((i) => i.id === ideaId);
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
                    title: voteType === 'up' ? t('innovation.vote.actions.removeUpvote') : t('innovation.vote.actions.removeDownvote', { defaultValue: 'Downvote removed' }),
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
                    title: voteType === 'up' ? t('innovation.vote.actions.upvote') : t('innovation.vote.actions.downvote', { defaultValue: 'Downvoted!' }),
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
        const icons: Record<string, JSX.Element> = {
            TECHNOLOGY: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            SUSTAINABILITY: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
            CUSTOMER_SERVICE: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
            ),
            PROCESS_IMPROVEMENT: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            COST_REDUCTION: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
            PRODUCT_INNOVATION: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                </svg>
            ),
            OTHER: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                </svg>
            ),
        };
        return icons[category] || icons.OTHER;
    };

    const sortedIdeas = [...ideas].sort((a, b) => {
        if (sortBy === 'trending') return b.trendingScore - a.trendingScore;
        if (sortBy === 'popular') return b.voteCount - a.voteCount;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    const filteredIdeas = showVotedOnly ? sortedIdeas.filter((i) => i.hasVoted !== null) : sortedIdeas;

    const totalVotes = ideas.filter((i) => i.hasVoted !== null).length;
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
                                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="ballot">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                    />
                                </svg>
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
                        <div className="hidden lg:block opacity-50">
                            <div className="flex items-center gap-4">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                    />
                                </svg>
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                                    />
                                </svg>
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
                                aria-label={sort === 'trending' ? t('innovation.vote.sort.trending') : sort === 'popular' ? t('innovation.vote.sort.popular') : t('innovation.vote.sort.recent')}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    {sort === 'trending' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    )}
                                    {sort === 'popular' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                            />
                                        </svg>
                                    )}
                                    {sort === 'recent' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    {t(`innovation.vote.sort.${sort}`)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status:</span>
                    <div className="flex flex-wrap gap-2">
                        {['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROJECT'].map((s) => {
                            const active = statusFilters.includes(s);
                            const labels: Record<string, string> = {
                                PENDING_REVIEW: 'Pending Review',
                                APPROVED: 'Approved',
                                REJECTED: 'Rejected',
                                PROMOTED_TO_PROJECT: 'Promoted',
                            };
                            return (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilters(active ? statusFilters.filter((x) => x !== s) : [...statusFilters, s])}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                        active ? 'bg-secondary text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
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
                        {['Process Improvement', 'Technology', 'Customer Service', 'Sustainability', 'Cost Reduction', 'Product Innovation', 'Other'].map((cat, idx) => {
                            const catKey = ['PROCESS_IMPROVEMENT', 'TECHNOLOGY', 'CUSTOMER_SERVICE', 'SUSTAINABILITY', 'COST_REDUCTION', 'PRODUCT_INNOVATION', 'OTHER'][idx];
                            const active = categoryFilters.includes(catKey);
                            return (
                                <button
                                    key={catKey}
                                    onClick={() => setCategoryFilters(active ? categoryFilters.filter((c) => c !== catKey) : [...categoryFilters, catKey])}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                        active ? 'bg-primary text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    aria-pressed={active}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox" checked={showVotedOnly} onChange={(e) => setShowVotedOnly(e.target.checked)} aria-checked={showVotedOnly} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show only voted ideas</span>
                </label>
                <button
                    type="button"
                    onClick={() => {
                        setStatusFilters(['PENDING_REVIEW']);
                        setCategoryFilters([]);
                        setSortBy('trending');
                        setShowVotedOnly(false);
                    }}
                    className="btn btn-outline-danger btn-sm"
                >
                    Clear Filters
                </button>
            </div>

            {/* Ideas Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredIdeas.map((idea, index) => (
                    <div key={idea.id} className={`panel hover:shadow-xl transition-all duration-300 ${voteAnimation === idea.id ? 'scale-105' : ''}`}>
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
                                                : votingPower === 0
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
                                                : votingPower === 0
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
                                    <div
                                        className={`text-2xl font-black inline-flex items-center gap-1 ${
                                            idea.voteCount > 0 ? 'text-green-600 dark:text-green-400' : idea.voteCount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        {idea.voteCount > 0 ? '▲' : idea.voteCount < 0 ? '▼' : '•'} {idea.voteCount > 0 ? '+' : ''}
                                        {idea.voteCount}
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
                                    <div className="mt-1 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 rounded text-xs font-bold inline-flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                        {idea.trendingScore}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="text-3xl">{getCategoryIcon(idea.category)}</span>
                                    <div className="flex-1">
                                        <Link to={`/innovation/ideas/${idea.id}`} className="text-xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-2">
                                            {idea.title}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            <span>{t('innovation.view.submittedBy', { name: idea.submittedBy })}</span>
                                            <span>•</span>
                                            <span>{new Date(idea.submittedAt).toLocaleDateString()}</span>
                                            {idea.firstAttachmentUrl && (
                                                <span className="ml-2 inline-flex items-center gap-1">
                                                    <img src={idea.firstAttachmentUrl} alt="thumb" className="w-6 h-6 rounded object-cover border" loading="lazy" />
                                                    {idea.attachmentsCount && idea.attachmentsCount > 1 && <span className="text-xs text-gray-400">+{idea.attachmentsCount - 1}</span>}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">{idea.description}</p>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="ballot">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                    </svg>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{showVotedOnly ? t('innovation.vote.empty.noVoted.title') : t('innovation.vote.empty.noIdeas.title')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{showVotedOnly ? t('innovation.vote.empty.noVoted.message') : t('innovation.vote.empty.noIdeas.message')}</p>
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
                        <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="warning">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-300">{t('innovation.vote.warning.noVotesLeft.title')}</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">{t('innovation.vote.warning.noVotesLeft.message')}</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Trust & Security Footer */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {t('common.security.anonymousVoting', { defaultValue: 'Anonymous Voting' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            {t('common.security.encrypted', { defaultValue: 'Encrypted votes' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            {t('common.security.fairVoting', { defaultValue: 'Fair & Transparent' })}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('common.votingPower.dailyRefresh', { defaultValue: 'Voting power refreshes daily' })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoteOnIdeas;
