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
    voteCount: number;
    hasVoted: boolean;
    viewCount: number;
}

const BrowseIdeas = () => {
    const dispatch = useDispatch();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('popular');

    useEffect(() => {
        dispatch(setPageTitle('Browse Ideas'));
        // TODO: Fetch from API
        setIdeas([
            {
                id: '1',
                title: 'AI-Powered Document Analysis',
                description: 'Implement AI to automatically analyze and categorize incoming documents, reducing manual processing time by 70%.',
                category: 'TECHNOLOGY',
                submittedBy: 'John Doe',
                submittedAt: '2025-11-01',
                voteCount: 45,
                hasVoted: false,
                viewCount: 128,
            },
            {
                id: '2',
                title: 'Green Energy Initiative',
                description: 'Install solar panels on all BSJ buildings to reduce electricity costs and carbon footprint.',
                category: 'SUSTAINABILITY',
                submittedBy: 'Jane Smith',
                submittedAt: '2025-11-03',
                voteCount: 38,
                hasVoted: true,
                viewCount: 95,
            },
            {
                id: '3',
                title: 'Mobile App for Standards Lookup',
                description: 'Create a mobile application that allows customers to quickly search and access standards on the go.',
                category: 'CUSTOMER_SERVICE',
                submittedBy: 'Bob Johnson',
                submittedAt: '2025-11-04',
                voteCount: 52,
                hasVoted: false,
                viewCount: 142,
            },
        ]);
    }, [dispatch]);

    const handleVote = (ideaId: string) => {
        setIdeas(ideas.map(idea => {
            if (idea.id === ideaId) {
                return {
                    ...idea,
                    hasVoted: !idea.hasVoted,
                    voteCount: idea.hasVoted ? idea.voteCount - 1 : idea.voteCount + 1,
                };
            }
            return idea;
        }));
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
        return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="text-4xl">🔍</span>
                    Browse Approved Ideas
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Explore innovations from your colleagues and vote for your favorites
                </p>
            </div>

            {/* Filters */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category:</label>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="form-select w-auto"
                        >
                            <option value="all">All Categories</option>
                            <option value="TECHNOLOGY">Technology</option>
                            <option value="SUSTAINABILITY">Sustainability</option>
                            <option value="CUSTOMER_SERVICE">Customer Service</option>
                            <option value="PROCESS_IMPROVEMENT">Process Improvement</option>
                            <option value="COST_REDUCTION">Cost Reduction</option>
                            <option value="PRODUCT_INNOVATION">Product Innovation</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="form-select w-auto"
                        >
                            <option value="popular">Most Popular</option>
                            <option value="recent">Most Recent</option>
                            <option value="views">Most Viewed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Ideas Grid */}
            <div className="grid grid-cols-1 gap-6">
                {ideas.map((idea) => (
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
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                </button>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {idea.voteCount}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">votes</span>
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
                                                by {idea.submittedBy}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                • {new Date(idea.submittedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {idea.viewCount}
                                    </div>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    {idea.description}
                                </p>
                                <Link
                                    to={`/innovation/ideas/${idea.id}`}
                                    className="text-primary hover:underline font-semibold text-sm inline-flex items-center gap-1"
                                >
                                    View Details
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {ideas.length === 0 && (
                <div className="panel text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Ideas Found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Try adjusting your filters or be the first to submit an idea!
                    </p>
                    <Link to="/innovation/ideas/new" className="btn btn-primary gap-2 inline-flex">
                        <span className="text-xl">✨</span>
                        Submit New Idea
                    </Link>
                </div>
            )}
        </div>
    );
};

export default BrowseIdeas;
