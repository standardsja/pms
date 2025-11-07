import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { fetchIdeas, Idea } from '../../../utils/ideasApi';
import { getUser } from '../../../utils/auth';

interface MyIdea {
    id: string;
    title: string;
    description: string;
    category: string;
    submittedAt: string;
    voteCount: number;
    viewCount: number;
    commentCount: number;
    status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'UNDER_REVIEW' | 'IMPLEMENTED' | 'REJECTED' | 'PROMOTED_TO_PROJECT';
    feedback?: string;
    comments?: IdeaComment[];
}

interface IdeaComment {
    id: string;
    author: string;
    text: string;
    createdAt: string;
    isCommittee?: boolean;
}

const MyIdeas = () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentUser = getUser();
    const [ideas, setIdeas] = useState<MyIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [newComment, setNewComment] = useState<Record<string, string>>({});

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.myIdeas.title')));
        loadMyIdeas();
    }, [dispatch, t]);

    const loadMyIdeas = async () => {
        setIsLoading(false);
        try {
            console.log('[MyIdeas] Fetching ideas for user:', currentUser?.id);
            const allIdeas = await fetchIdeas();
            
            // Filter to show only current user's ideas
            const myIdeas = allIdeas
                .filter(idea => String(idea.submittedBy) === String(currentUser?.id))
                .map(idea => ({
                    id: String(idea.id),
                    title: idea.title,
                    description: idea.description,
                    category: idea.category,
                    submittedAt: idea.submittedAt,
                    voteCount: idea.voteCount,
                    viewCount: idea.viewCount,
                    commentCount: 0, // TODO: fetch comment count
                    status: idea.status as any,
                    feedback: idea.reviewNotes || undefined,
                    comments: [], // TODO: fetch comments
                }));
            
            console.log('[MyIdeas] Loaded ideas:', myIdeas.length);
            setIdeas(myIdeas);
        } catch (error) {
            console.error('[MyIdeas] Error loading ideas:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load your ideas. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; icon: string; bg: string; label: string }> = {
            DRAFT: { color: 'text-gray-600', icon: '📝', bg: 'bg-gray-100 dark:bg-gray-800', label: t('innovation.myIdeas.status.draft') },
            PENDING_REVIEW: { color: 'text-blue-600', icon: '⏰', bg: 'bg-blue-100 dark:bg-blue-900', label: t('innovation.myIdeas.status.pending') },
            UNDER_REVIEW: { color: 'text-yellow-600', icon: '🔍', bg: 'bg-yellow-100 dark:bg-yellow-900', label: t('innovation.myIdeas.status.underReview') },
            APPROVED: { color: 'text-green-600', icon: '✅', bg: 'bg-green-100 dark:bg-green-900', label: t('innovation.myIdeas.status.approved') },
            IMPLEMENTED: { color: 'text-purple-600', icon: '🎉', bg: 'bg-purple-100 dark:bg-purple-900', label: t('innovation.myIdeas.status.implemented') },
            REJECTED: { color: 'text-red-600', icon: '❌', bg: 'bg-red-100 dark:bg-red-900', label: t('innovation.myIdeas.status.rejected') },
        };
        return configs[status] || configs.DRAFT;
    };

    const filteredIdeas = filterStatus === 'all' ? ideas : ideas.filter(i => i.status === filterStatus);

    const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const handleAddComment = (ideaId: string) => {
        const text = (newComment[ideaId] || '').trim();
        if (!text) {
            void Swal.fire({ icon: 'info', title: t('innovation.myIdeas.comments.required', { defaultValue: 'Please enter a comment.' }), timer: 1400, toast: true, position: 'bottom-end', showConfirmButton: false });
            return;
        }
        if (text.length > 500) {
            void Swal.fire({ icon: 'warning', title: t('innovation.myIdeas.comments.tooLong', { defaultValue: 'Comment is too long (max 500 characters).' }), timer: 1600, toast: true, position: 'bottom-end', showConfirmButton: false });
            return;
        }
        setIdeas((prev) => prev.map((i) => {
            if (i.id !== ideaId) return i;
            const newEntry: IdeaComment = {
                id: `${Date.now()}`,
                author: 'You',
                text,
                createdAt: new Date().toISOString().slice(0, 10),
            };
            const comments = [...(i.comments || []), newEntry];
            return { ...i, comments, commentCount: (i.commentCount || 0) + 1 };
        }));
        setNewComment((prev) => ({ ...prev, [ideaId]: '' }));
        void Swal.fire({ icon: 'success', title: t('innovation.myIdeas.comments.added', { defaultValue: 'Comment added' }), timer: 1200, toast: true, position: 'bottom-end', showConfirmButton: false });
    };

    const stats = {
        total: ideas.length,
        approved: ideas.filter(i => i.status === 'APPROVED').length,
        implemented: ideas.filter(i => i.status === 'IMPLEMENTED').length,
        pending: ideas.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'UNDER_REVIEW').length,
        totalVotes: ideas.reduce((sum, i) => sum + i.voteCount, 0),
        totalViews: ideas.reduce((sum, i) => sum + i.viewCount, 0),
    };

    const handleEditIdea = (ideaId: string) => {
        navigate(`/innovation/ideas/edit/${ideaId}`);
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
                                <span className="text-5xl" role="img" aria-label="lightbulb">💡</span>
                                {t('innovation.myIdeas.title')}
                            </h1>
                            <p className="text-white/90 text-lg mb-6">
                                {t('innovation.myIdeas.subtitle')}
                            </p>
                            <button
                                onClick={() => navigate('/innovation/ideas/new')}
                                className="btn bg-white text-primary hover:bg-gray-100 gap-2 shadow-xl"
                            >
                                <span className="text-xl" role="img" aria-hidden="true">✨</span>
                                {t('innovation.dashboard.submitNewIdea')}
                            </button>
                        </div>
                        <div className="hidden lg:grid grid-cols-3 gap-4">
                            <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                                <div className="text-4xl font-black">{stats.total}</div>
                                <div className="text-sm text-white/80 mt-1">{t('innovation.myIdeas.filters.allIdeas')}</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                                <div className="text-4xl font-black">{stats.totalVotes}</div>
                                <div className="text-sm text-white/80 mt-1">{t('innovation.dashboard.stats.totalVotes')}</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                                <div className="text-4xl font-black">{stats.implemented}</div>
                                <div className="text-sm text-white/80 mt-1">{t('innovation.myIdeas.stats.completed')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t('innovation.myIdeas.stats.approved'), value: stats.approved, icon: '✅', color: 'from-green-500 to-emerald-500' },
                    { label: t('innovation.myIdeas.stats.inReview'), value: stats.pending, icon: '🔍', color: 'from-yellow-500 to-orange-500' },
                    { label: t('innovation.myIdeas.stats.totalViews'), value: stats.totalViews, icon: '👁️', color: 'from-blue-500 to-cyan-500' },
                    { label: t('innovation.myIdeas.stats.completed'), value: stats.implemented, icon: '🎉', color: 'from-purple-500 to-pink-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="panel hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`} role="img" aria-hidden="true">
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
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('innovation.myIdeas.filters.status')}</span>
                {['all', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'IMPLEMENTED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            filterStatus === status
                                ? 'bg-primary text-white shadow-lg scale-105'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        aria-pressed={filterStatus === status}
                    >
                        {status === 'all' ? t('innovation.myIdeas.filters.allIdeas') : getStatusConfig(status).icon + ' ' + getStatusConfig(status).label}
                    </button>
                ))}
            </div>

            {/* Ideas Timeline */}
            <div className="space-y-4">
                {filteredIdeas.map((idea, index) => {
                    const statusConfig = getStatusConfig(idea.status);
                    const isOpen = !!expanded[idea.id];
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
                                                        {t('innovation.myIdeas.engagement.comments', { count: idea.commentCount, defaultValue: '{{count}} comments' })}
                                                    </span>
                                                    <span className="flex items-center gap-1 ml-auto">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {new Date(idea.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>

                                                {/* Comments Toggle */}
                                                <div className="mt-3">
                                                    <button
                                                        className="text-primary font-semibold inline-flex items-center gap-2"
                                                        onClick={() => toggleExpanded(idea.id)}
                                                        aria-expanded={isOpen}
                                                        aria-controls={`comments-${idea.id}`}
                                                    >
                                                        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        {isOpen
                                                            ? t('innovation.myIdeas.comments.hide', { defaultValue: 'Hide comments' })
                                                            : t('innovation.myIdeas.comments.show', { count: idea.commentCount, defaultValue: 'Show comments ({{count}})' })}
                                                    </button>
                                                </div>

                                                {/* Comments Section */}
                                                {isOpen && (
                                                    <div id={`comments-${idea.id}`} className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/40">
                                                        <div className="space-y-3">
                                                            {(idea.comments || []).map((c) => (
                                                                <div key={c.id} className="flex items-start gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${c.isCommittee ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`} aria-hidden="true">{c.isCommittee ? 'IC' : c.author[0]}</div>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            {c.author} <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-700 dark:text-gray-300">{c.text}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(!idea.comments || idea.comments.length === 0) && (
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {t('innovation.myIdeas.comments.empty', { defaultValue: 'No comments yet' })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Add Comment */}
                                                        <div className="mt-4">
                                                            <label htmlFor={`new-comment-${idea.id}`} className="sr-only">
                                                                {t('innovation.myIdeas.comments.addLabel', { defaultValue: 'Add a comment' })}
                                                            </label>
                                                            <textarea
                                                                id={`new-comment-${idea.id}`}
                                                                className="form-textarea w-full"
                                                                rows={2}
                                                                maxLength={500}
                                                                placeholder={t('innovation.myIdeas.comments.placeholder', { defaultValue: 'Write a comment (max 500 characters)' })}
                                                                value={newComment[idea.id] || ''}
                                                                onChange={(e) => setNewComment((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                                                            />
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {(newComment[idea.id]?.length || 0)}/500
                                                                </span>
                                                                <button onClick={() => handleAddComment(idea.id)} className="btn btn-sm btn-primary">
                                                                    {t('innovation.myIdeas.comments.post', { defaultValue: 'Post Comment' })}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2">
                                                <Link
                                                    to={`/innovation/ideas/${idea.id}`}
                                                    className="btn btn-sm btn-outline-primary"
                                                >
                                                    {t('innovation.myIdeas.actions.view')}
                                                </Link>
                                                {idea.status === 'DRAFT' && (
                                                    <button 
                                                        onClick={() => handleEditIdea(idea.id)}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        {t('innovation.myIdeas.actions.edit')}
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
                    <div className="text-6xl mb-4" role="img" aria-label="thinking face">💭</div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {filterStatus === 'all' 
                            ? t('innovation.myIdeas.empty.all.title')
                            : t('innovation.myIdeas.empty.filtered.title', { status: getStatusConfig(filterStatus).label })}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {filterStatus === 'all'
                            ? t('innovation.myIdeas.empty.all.message')
                            : t('innovation.myIdeas.empty.filtered.message')}
                    </p>
                    {filterStatus === 'all' ? (
                        <button onClick={() => navigate('/innovation/ideas/new')} className="btn btn-primary gap-2">
                            <span className="text-xl" role="img" aria-hidden="true">✨</span>
                            {t('innovation.myIdeas.empty.all.action')}
                        </button>
                    ) : (
                        <button onClick={() => setFilterStatus('all')} className="btn btn-outline-primary">
                            {t('innovation.myIdeas.empty.filtered.action')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyIdeas;
