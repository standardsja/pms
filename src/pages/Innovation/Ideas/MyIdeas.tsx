import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';

interface MyIdea {
    id: string;
    title: string;
    description: string;
    category: string;
    submittedAt: string;
    voteCount: number;
    viewCount: number;
    commentCount: number;
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'UNDER_REVIEW' | 'IMPLEMENTED' | 'REJECTED';
    feedback?: string;
}

const MyIdeas = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [ideas, setIdeas] = useState<MyIdea[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        dispatch(setPageTitle('My Ideas'));
        // Mock data
        setIdeas([
            {
                id: '1',
                title: 'AI-Powered Document Analysis',
                description: 'Implement AI to automatically analyze and categorize incoming documents, reducing manual processing time by 70%.',
                category: 'TECHNOLOGY',
                submittedAt: '2025-11-01',
                voteCount: 45,
                viewCount: 128,
                commentCount: 12,
                status: 'APPROVED',
                feedback: 'Great idea! The committee is very interested. We\'re moving forward with a pilot program.',
            },
            {
                id: '2',
                title: 'Employee Wellness Program',
                description: 'Introduce a comprehensive wellness program including fitness classes, mental health support, and healthy cafeteria options.',
                category: 'SUSTAINABILITY',
                submittedAt: '2025-10-28',
                voteCount: 23,
                viewCount: 67,
                commentCount: 8,
                status: 'UNDER_REVIEW',
            },
            {
                id: '3',
                title: 'Automated Report Generation',
                description: 'Create automated monthly reports to save time and reduce errors in data compilation.',
                category: 'PROCESS_IMPROVEMENT',
                submittedAt: '2025-10-15',
                voteCount: 18,
                viewCount: 45,
                commentCount: 5,
                status: 'IMPLEMENTED',
                feedback: 'Successfully implemented! This has reduced report generation time by 60%.',
            },
            {
                id: '4',
                title: 'Customer Portal Redesign',
                description: 'Modernize the customer portal with improved UX and mobile responsiveness.',
                category: 'CUSTOMER_SERVICE',
                submittedAt: '2025-11-02',
                voteCount: 8,
                viewCount: 24,
                commentCount: 2,
                status: 'PENDING',
            },
        ]);
    }, [dispatch]);

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; icon: string; bg: string; label: string }> = {
            DRAFT: { color: 'text-gray-600', icon: '📝', bg: 'bg-gray-100 dark:bg-gray-800', label: 'Draft' },
            PENDING: { color: 'text-blue-600', icon: '⏰', bg: 'bg-blue-100 dark:bg-blue-900', label: 'Pending Review' },
            UNDER_REVIEW: { color: 'text-yellow-600', icon: '🔍', bg: 'bg-yellow-100 dark:bg-yellow-900', label: 'Under Review' },
            APPROVED: { color: 'text-green-600', icon: '✅', bg: 'bg-green-100 dark:bg-green-900', label: 'Approved' },
            IMPLEMENTED: { color: 'text-purple-600', icon: '🎉', bg: 'bg-purple-100 dark:bg-purple-900', label: 'Implemented' },
            REJECTED: { color: 'text-red-600', icon: '❌', bg: 'bg-red-100 dark:bg-red-900', label: 'Not Selected' },
        };
        return configs[status] || configs.DRAFT;
    };

    const filteredIdeas = filterStatus === 'all' ? ideas : ideas.filter(i => i.status === filterStatus);

    const stats = {
        total: ideas.length,
        approved: ideas.filter(i => i.status === 'APPROVED').length,
        implemented: ideas.filter(i => i.status === 'IMPLEMENTED').length,
        pending: ideas.filter(i => i.status === 'PENDING' || i.status === 'UNDER_REVIEW').length,
        totalVotes: ideas.reduce((sum, i) => sum + i.voteCount, 0),
        totalViews: ideas.reduce((sum, i) => sum + i.viewCount, 0),
    };

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="panel bg-gradient-to-br from-purple-600 via-primary to-blue-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                </div>
                <div className="relative z-10 p-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                                <span className="text-5xl">💡</span>
                                My Innovation Portfolio
                            </h1>
                            <p className="text-white/90 text-lg mb-6">
                                Track your ideas from concept to implementation
                            </p>
                            <button
                                onClick={() => navigate('/innovation/ideas/new')}
                                className="btn bg-white text-primary hover:bg-gray-100 gap-2 shadow-xl"
                            >
                                <span className="text-xl">✨</span>
                                Submit New Idea
                            </button>
                        </div>
                        <div className="hidden lg:grid grid-cols-3 gap-4">
                            <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                                <div className="text-4xl font-black">{stats.total}</div>
                                <div className="text-sm text-white/80 mt-1">Total Ideas</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                                <div className="text-4xl font-black">{stats.totalVotes}</div>
                                <div className="text-sm text-white/80 mt-1">Total Votes</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                                <div className="text-4xl font-black">{stats.implemented}</div>
                                <div className="text-sm text-white/80 mt-1">Implemented</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Approved', value: stats.approved, icon: '✅', color: 'from-green-500 to-emerald-500' },
                    { label: 'In Review', value: stats.pending, icon: '🔍', color: 'from-yellow-500 to-orange-500' },
                    { label: 'Total Views', value: stats.totalViews, icon: '👁️', color: 'from-blue-500 to-cyan-500' },
                    { label: 'Completed', value: stats.implemented, icon: '🎉', color: 'from-purple-500 to-pink-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="panel hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`}>
                                {stat.icon}
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter by Status:</span>
                {['all', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            filterStatus === status
                                ? 'bg-primary text-white shadow-lg scale-105'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {status === 'all' ? 'All Ideas' : getStatusConfig(status).icon + ' ' + getStatusConfig(status).label}
                    </button>
                ))}
            </div>

            {/* Ideas Timeline */}
            <div className="space-y-4">
                {filteredIdeas.map((idea, index) => {
                    const statusConfig = getStatusConfig(idea.status);
                    return (
                        <div key={idea.id} className="relative">
                            {/* Timeline Connector */}
                            {index !== filteredIdeas.length - 1 && (
                                <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -mb-4"></div>
                            )}

                            <div className="panel hover:shadow-xl transition-all group">
                                <div className="flex gap-4">
                                    {/* Timeline Dot */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${statusConfig.bg} flex items-center justify-center text-2xl z-10`}>
                                        {statusConfig.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link
                                                        to={`/innovation/ideas/${idea.id}`}
                                                        className="text-2xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors"
                                                    >
                                                        {idea.title}
                                                    </Link>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 mb-3">
                                                    {idea.description}
                                                </p>

                                                {/* Feedback Section */}
                                                {idea.feedback && (
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary p-4 rounded-r-lg mb-3">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xl">💬</span>
                                                            <div>
                                                                <div className="font-semibold text-gray-900 dark:text-white mb-1">Committee Feedback</div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300">{idea.feedback}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Meta Info */}
                                                <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                        </svg>
                                                        <span className="font-semibold">{idea.voteCount}</span> votes
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        <span className="font-semibold">{idea.viewCount}</span> views
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                        </svg>
                                                        <span className="font-semibold">{idea.commentCount}</span> comments
                                                    </span>
                                                    <span className="flex items-center gap-1 ml-auto">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {new Date(idea.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2">
                                                <Link
                                                    to={`/innovation/ideas/${idea.id}`}
                                                    className="btn btn-sm btn-outline-primary"
                                                >
                                                    View Details
                                                </Link>
                                                {idea.status === 'DRAFT' && (
                                                    <button className="btn btn-sm btn-primary">
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredIdeas.length === 0 && (
                <div className="panel text-center py-16">
                    <div className="text-6xl mb-4">💭</div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {filterStatus === 'all' ? "You haven't submitted any ideas yet" : `No ${getStatusConfig(filterStatus).label} ideas`}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {filterStatus === 'all'
                            ? 'Start your innovation journey by submitting your first idea!'
                            : 'Try selecting a different status filter'}
                    </p>
                    {filterStatus === 'all' ? (
                        <button onClick={() => navigate('/innovation/ideas/new')} className="btn btn-primary gap-2">
                            <span className="text-xl">✨</span>
                            Submit Your First Idea
                        </button>
                    ) : (
                        <button onClick={() => setFilterStatus('all')} className="btn btn-outline-primary">
                            View All Ideas
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyIdeas;
