import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';

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
}

const VoteOnIdeas = () => {
    const dispatch = useDispatch();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [sortBy, setSortBy] = useState<'trending' | 'popular' | 'recent'>('trending');
    const [showVotedOnly, setShowVotedOnly] = useState(false);
    const [voteAnimation, setVoteAnimation] = useState<string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Vote on Ideas'));
        // Mock data
        setIdeas([
            {
                id: '1',
                title: 'AI-Powered Document Analysis',
                description: 'Implement AI to automatically analyze and categorize incoming documents, reducing manual processing time by 70%. This will streamline our workflow significantly.',
                category: 'TECHNOLOGY',
                submittedBy: 'John Doe',
                submittedAt: '2025-11-01',
                upvotes: 45,
                downvotes: 3,
                voteCount: 42,
                hasVoted: null,
                viewCount: 128,
                trendingScore: 92,
            },
            {
                id: '2',
                title: 'Green Energy Initiative',
                description: 'Install solar panels on all BSJ buildings to reduce electricity costs and carbon footprint. This is a sustainable long-term investment.',
                category: 'SUSTAINABILITY',
                submittedBy: 'Jane Smith',
                submittedAt: '2025-11-03',
                upvotes: 38,
                downvotes: 5,
                voteCount: 33,
                hasVoted: 'up',
                viewCount: 95,
                trendingScore: 85,
            },
            {
                id: '3',
                title: 'Mobile App for Standards Lookup',
                description: 'Create a mobile application that allows customers to quickly search and access standards on the go. Improve customer experience dramatically.',
                category: 'CUSTOMER_SERVICE',
                submittedBy: 'Bob Johnson',
                submittedAt: '2025-11-04',
                upvotes: 52,
                downvotes: 2,
                voteCount: 50,
                hasVoted: null,
                viewCount: 142,
                trendingScore: 95,
            },
            {
                id: '4',
                title: 'Automated Meeting Scheduler',
                description: 'Develop an intelligent system that automatically schedules meetings based on participant availability and preferences.',
                category: 'PROCESS_IMPROVEMENT',
                submittedBy: 'Alice Brown',
                submittedAt: '2025-11-05',
                upvotes: 28,
                downvotes: 8,
                voteCount: 20,
                hasVoted: null,
                viewCount: 67,
                trendingScore: 78,
            },
        ]);
    }, [dispatch]);

    const handleVote = (ideaId: string, voteType: 'up' | 'down') => {
        setVoteAnimation(ideaId);
        setTimeout(() => setVoteAnimation(null), 600);
        
        setIdeas(ideas.map(idea => {
            if (idea.id === ideaId) {
                let newUpvotes = idea.upvotes;
                let newDownvotes = idea.downvotes;
                let newHasVoted: 'up' | 'down' | null = voteType;

                // If clicking the same vote type, remove the vote
                if (idea.hasVoted === voteType) {
                    newHasVoted = null;
                    if (voteType === 'up') {
                        newUpvotes--;
                    } else {
                        newDownvotes--;
                    }
                } else {
                    // If switching vote type, remove old vote and add new one
                    if (idea.hasVoted === 'up') {
                        newUpvotes--;
                    } else if (idea.hasVoted === 'down') {
                        newDownvotes--;
                    }
                    
                    if (voteType === 'up') {
                        newUpvotes++;
                    } else {
                        newDownvotes++;
                    }
                }

                return {
                    ...idea,
                    upvotes: newUpvotes,
                    downvotes: newDownvotes,
                    voteCount: newUpvotes - newDownvotes,
                    hasVoted: newHasVoted,
                };
            }
            return idea;
        }));
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
                                <span className="text-5xl">🗳️</span>
                                Vote & Shape the Future
                            </h1>
                            <p className="text-white/90 text-lg mb-4">
                                Your vote matters! Support the ideas you believe will make the biggest impact.
                            </p>
                            <div className="flex items-center gap-6">
                                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                    <div className="text-3xl font-bold">{totalVotes}</div>
                                    <div className="text-sm text-white/80">Ideas Voted</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                    <div className="text-3xl font-bold">{votingPower}</div>
                                    <div className="text-sm text-white/80">Votes Remaining</div>
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
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sort by:</span>
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
                            >
                                {sort === 'trending' && '🔥'} {sort === 'popular' && '⭐'} {sort === 'recent' && '🆕'} {sort}
                            </button>
                        ))}
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={showVotedOnly}
                        onChange={(e) => setShowVotedOnly(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show only voted ideas</span>
                </label>
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
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {/* Vote Count Display */}
                                <div className="text-center">
                                    <div className={`text-2xl font-black ${
                                        idea.voteCount > 0 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : idea.voteCount < 0 
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {idea.voteCount > 0 ? '+' : ''}{idea.voteCount}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">score</div>
                                </div>

                                {sortBy === 'trending' && (
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
                                            <span>by {idea.submittedBy}</span>
                                            <span>•</span>
                                            <span>{new Date(idea.submittedAt).toLocaleDateString()}</span>
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
                                            {idea.viewCount} views
                                        </span>
                                    </div>
                                    <Link
                                        to={`/innovation/ideas/${idea.id}`}
                                        className="text-primary hover:text-primary-dark font-semibold text-sm inline-flex items-center gap-1 group"
                                    >
                                        View Details
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
                    <div className="text-6xl mb-4">🗳️</div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {showVotedOnly ? "You haven't voted yet" : 'No Ideas Available'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {showVotedOnly
                            ? 'Start voting for ideas you believe in!'
                            : 'Check back later for new innovative ideas'}
                    </p>
                    {showVotedOnly && (
                        <button onClick={() => setShowVotedOnly(false)} className="btn btn-primary">
                            View All Ideas
                        </button>
                    )}
                </div>
            )}

            {/* Voting Power Warning */}
            {votingPower === 0 && (
                <div className="panel bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <h4 className="font-bold text-amber-900 dark:text-amber-300">Vote Limit Reached</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                You've used all your votes. You can change your votes by clicking on already voted ideas.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoteOnIdeas;
