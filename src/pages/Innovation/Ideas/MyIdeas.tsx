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
    upvoteCount: number;
    downvoteCount: number;
    viewCount: number;
    commentCount: number;
    status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'UNDER_REVIEW' | 'IMPLEMENTED' | 'REJECTED' | 'PROMOTED_TO_PROJECT';
    feedback?: string;
    comments?: IdeaComment[];
    firstAttachmentUrl?: string | null;
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
        let active = true;
        loadMyIdeas();
        const id = setInterval(() => {
            if (active) loadMyIdeas(true);
        }, 15000);
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') loadMyIdeas(true);
        };
        const createdHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail as Partial<Idea> | undefined;
            if (detail && detail.id && detail.title) {
                setIdeas((prev) => {
                    // Avoid duplicates
                    if (prev.some((i) => i.id === String(detail.id))) return prev;
                    const optimistic: MyIdea = {
                        id: String(detail.id),
                        title: detail.title || 'Untitled',
                        description: detail.description || '',
                        category: (detail as any).category || 'OTHER',
                        submittedAt: new Date().toISOString(),
                        voteCount: 0,
                        upvoteCount: 0,
                        downvoteCount: 0,
                        viewCount: 0,
                        commentCount: 0,
                        status: 'PENDING_REVIEW',
                        feedback: undefined,
                        comments: [],
                    };
                    return [optimistic, ...prev];
                });
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        document.addEventListener('idea:created', createdHandler as EventListener);
        return () => {
            active = false;
            clearInterval(id);
            document.removeEventListener('visibilitychange', visibilityHandler);
            document.removeEventListener('idea:created', createdHandler as EventListener);
        };
    }, [dispatch, t]);

    const loadMyIdeas = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            // Use mine=true parameter to filter server-side
            const response = await fetchIdeas({ includeAttachments: true, mine: true, limit: 100 });
            // Handle both paginated and legacy response formats
            const myIdeas = response.ideas || response;

            const formattedIdeas = myIdeas.map((idea) => ({
                id: String(idea.id),
                title: idea.title,
                description: idea.description,
                category: idea.category,
                submittedAt: idea.submittedAt,
                voteCount: idea.voteCount,
                upvoteCount: Math.max(0, idea.upvoteCount || 0),
                downvoteCount: Math.max(0, idea.downvoteCount || 0),
                viewCount: idea.viewCount,
                commentCount: (idea as any).commentCount || 0,
                status: idea.status as any,
                feedback: idea.reviewNotes || undefined,
                comments: [],
                // include first attachment url if available from API
                // @ts-ignore
                firstAttachmentUrl: (idea as any).firstAttachmentUrl || (idea as any).attachments?.[0]?.fileUrl || null,
            }));

            // Preserve any comments already fetched locally to avoid them disappearing
            setIdeas((prev) =>
                formattedIdeas.map((i) => {
                    const existing = prev.find((p) => p.id === i.id);
                    return {
                        ...i,
                        comments: existing?.comments && existing.comments.length > 0 ? existing.comments : i.comments,
                    };
                })
            );
        } catch (error) {
            console.error('[MyIdeas] Error loading ideas:', error);
            // Only show error on initial load, not silent background refreshes
            if (!silent && !ideas.length) {
                Swal.fire({
                    icon: 'error',
                    title: 'Unable to Load Ideas',
                    text: 'We encountered a problem loading your ideas. Please try again.',
                    toast: true,
                    position: 'bottom-end',
                    timer: 3500,
                    showConfirmButton: false,
                });
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; icon: JSX.Element; bg: string; label: string }> = {
            DRAFT: {
                color: 'text-gray-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                ),
                bg: 'bg-gray-100 dark:bg-gray-800',
                label: t('innovation.myIdeas.status.draft'),
            },
            PENDING_REVIEW: {
                color: 'text-yellow-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                    </svg>
                ),
                bg: 'bg-yellow-100 dark:bg-yellow-900',
                label: t('innovation.myIdeas.status.underReview'),
            },
            UNDER_REVIEW: {
                color: 'text-yellow-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                    </svg>
                ),
                bg: 'bg-yellow-100 dark:bg-yellow-900',
                label: t('innovation.myIdeas.status.underReview'),
            },
            APPROVED: {
                color: 'text-green-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                bg: 'bg-green-100 dark:bg-green-900',
                label: t('innovation.myIdeas.status.approved'),
            },
            IMPLEMENTED: {
                color: 'text-purple-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                    </svg>
                ),
                bg: 'bg-purple-100 dark:bg-purple-900',
                label: t('innovation.myIdeas.status.implemented'),
            },
            REJECTED: {
                color: 'text-red-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                bg: 'bg-red-100 dark:bg-red-900',
                label: t('innovation.myIdeas.status.rejected'),
            },
            PROMOTED_TO_PROJECT: {
                color: 'text-purple-600',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                ),
                bg: 'bg-purple-100 dark:bg-purple-900',
                label: t('innovation.myIdeas.status.implemented'),
            },
        };
        return configs[status] || configs.DRAFT;
    };

    const filteredIdeas = filterStatus === 'all' ? ideas : ideas.filter((i) => i.status === filterStatus);

    const toggleExpanded = async (id: string) => {
        const isCurrentlyExpanded = expanded[id];
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

        // Fetch comments when expanding
        if (!isCurrentlyExpanded) {
            await fetchCommentsForIdea(id);
        }
    };

    const fetchCommentsForIdea = async (ideaId: string) => {
        try {
            const response = await fetch(`/api/ideas/${ideaId}/comments`, {
                headers: {
                    'x-user-id': String(currentUser?.id || ''),
                },
            });

            if (response.ok) {
                const comments = await response.json();
                setIdeas((prev) =>
                    prev.map((i) => {
                        if (i.id !== ideaId) return i;
                        return {
                            ...i,
                            comments: comments.map((c: any) => ({
                                id: c.id,
                                author: c.userName,
                                text: c.text,
                                createdAt: c.createdAt,
                                isCommittee: false,
                            })),
                        };
                    })
                );
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleAddComment = async (ideaId: string) => {
        const text = (newComment[ideaId] || '').trim();
        if (!text) {
            void Swal.fire({
                icon: 'info',
                title: t('innovation.myIdeas.comments.required', { defaultValue: 'Please enter a comment.' }),
                timer: 1400,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
            });
            return;
        }
        if (text.length > 500) {
            void Swal.fire({
                icon: 'warning',
                title: t('innovation.myIdeas.comments.tooLong', { defaultValue: 'Comment is too long (max 500 characters).' }),
                timer: 1600,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
            });
            return;
        }

        try {
            const response = await fetch(`/api/ideas/${ideaId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUser?.id || ''),
                    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
                },
                body: JSON.stringify({ text }),
            });

            if (response.ok) {
                const newEntry = await response.json();
                setIdeas((prev) =>
                    prev.map((i) => {
                        if (i.id !== ideaId) return i;
                        const comment: IdeaComment = {
                            id: String(newEntry.id),
                            author: currentUser?.name || 'You',
                            text: newEntry.text,
                            createdAt: newEntry.createdAt,
                        };
                        const comments = [...(i.comments || []), comment];
                        return { ...i, comments, commentCount: (i.commentCount || 0) + 1 };
                    })
                );
                setNewComment((prev) => ({ ...prev, [ideaId]: '' }));
                void Swal.fire({
                    icon: 'success',
                    title: t('innovation.myIdeas.comments.added', { defaultValue: 'Comment added' }),
                    timer: 1200,
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                });
            } else {
                throw new Error('Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            void Swal.fire({
                icon: 'error',
                title: t('innovation.myIdeas.comments.error', { defaultValue: 'Failed to post comment' }),
                timer: 1600,
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
            });
        }
    };

    const stats = {
        total: ideas.length,
        approved: ideas.filter((i) => i.status === 'APPROVED').length,
        implemented: ideas.filter((i) => i.status === 'IMPLEMENTED').length,
        pending: ideas.filter((i) => i.status === 'PENDING_REVIEW' || i.status === 'UNDER_REVIEW').length,
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
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                </svg>
                                {t('innovation.myIdeas.title')}
                            </h1>
                            <p className="text-white/90 text-lg mb-6">{t('innovation.myIdeas.subtitle')}</p>
                            <button onClick={() => navigate('/innovation/ideas/new')} className="btn bg-white text-primary hover:bg-gray-100 gap-2 shadow-xl">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
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
                    {
                        label: t('innovation.myIdeas.stats.approved'),
                        value: stats.approved,
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ),
                        color: 'from-green-500 to-emerald-500',
                    },
                    {
                        label: t('innovation.myIdeas.stats.inReview'),
                        value: stats.pending,
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        ),
                        color: 'from-yellow-500 to-orange-500',
                    },
                    {
                        label: t('innovation.myIdeas.stats.totalViews'),
                        value: stats.totalViews,
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                            </svg>
                        ),
                        color: 'from-blue-500 to-cyan-500',
                    },
                    {
                        label: t('innovation.myIdeas.stats.completed'),
                        value: stats.implemented,
                        icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ),
                        color: 'from-purple-500 to-pink-500',
                    },
                ].map((stat, idx) => (
                    <div key={idx} className="panel hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>{stat.icon}</div>
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
                        {status === 'all' ? (
                            t('innovation.myIdeas.filters.allIdeas')
                        ) : (
                            <span className="inline-flex items-center gap-2">
                                {getStatusConfig(status as MyIdea['status']).icon}
                                <span>{getStatusConfig(status as MyIdea['status']).label}</span>
                            </span>
                        )}
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
                            {index !== filteredIdeas.length - 1 && <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -mb-4"></div>}

                            <div className="panel hover:shadow-xl transition-all group">
                                <div className="flex gap-4">
                                    {/* Timeline Dot */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${statusConfig.bg} flex items-center justify-center text-2xl z-10`}>{statusConfig.icon}</div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    {/* Thumbnail if present */}
                                                    {/** @ts-ignore */}
                                                    {idea.firstAttachmentUrl ? (
                                                        <img
                                                            src={idea.firstAttachmentUrl as any}
                                                            alt={t('innovation.myIdeas.thumbnailAlt', { defaultValue: 'Idea image' })}
                                                            className="w-12 h-12 rounded object-cover border"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400" aria-hidden="true">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <Link to={`/innovation/ideas/${idea.id}`} className="text-2xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors">
                                                        {idea.title}
                                                    </Link>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>{statusConfig.label}</span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 mb-3">{idea.description}</p>

                                                {/* Feedback Section */}
                                                {idea.feedback && (
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary p-4 rounded-r-lg mb-3">
                                                        <div className="flex items-start gap-2">
                                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                                                />
                                                            </svg>
                                                            <div>
                                                                <div className="font-semibold text-gray-900 dark:text-white mb-1">Committee Feedback</div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300">{idea.feedback}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Meta Info */}
                                                <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                        </svg>
                                                        <span className="font-semibold">{idea.upvoteCount}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
                                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                        </svg>
                                                        <span className="font-semibold">{idea.downvoteCount}</span>
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
                                                        <span className="font-semibold">{idea.viewCount}</span> views
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                                            />
                                                        </svg>
                                                        {t('innovation.myIdeas.engagement.comments', { count: idea.commentCount, defaultValue: '{{count}} comments' })}
                                                    </span>
                                                    <span className="flex items-center gap-1 ml-auto">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
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
                                                                    <div
                                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                                                            c.isCommittee ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                                        }`}
                                                                        aria-hidden="true"
                                                                    >
                                                                        {c.isCommittee ? 'IC' : c.author[0]}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                            {c.author}{' '}
                                                                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
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
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">{newComment[idea.id]?.length || 0}/500</span>
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
                                                <Link to={`/innovation/ideas/${idea.id}`} className="btn btn-sm btn-outline-primary">
                                                    {t('innovation.myIdeas.actions.view')}
                                                </Link>
                                                {idea.status === 'DRAFT' && (
                                                    <button onClick={() => handleEditIdea(idea.id)} className="btn btn-sm btn-primary">
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
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="thinking face">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                    </svg>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {filterStatus === 'all' ? t('innovation.myIdeas.empty.all.title') : t('innovation.myIdeas.empty.filtered.title', { status: getStatusConfig(filterStatus).label })}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{filterStatus === 'all' ? t('innovation.myIdeas.empty.all.message') : t('innovation.myIdeas.empty.filtered.message')}</p>
                    {filterStatus === 'all' ? (
                        <button onClick={() => navigate('/innovation/ideas/new')} className="btn btn-primary gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('innovation.myIdeas.empty.all.action')}
                        </button>
                    ) : (
                        <button onClick={() => setFilterStatus('all')} className="btn btn-outline-primary">
                            {t('innovation.myIdeas.empty.filtered.action')}
                        </button>
                    )}
                </div>
            )}

            {/* Trust & Security Footer */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('common.security.autoSave', { defaultValue: 'Auto-saved' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                            {t('common.security.privateIdeas', { defaultValue: 'Your ideas are private' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                            {t('common.security.realTimeSync', { defaultValue: 'Real-time sync' })}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('common.lastUpdated', { defaultValue: 'Updated just now' })}</div>
                </div>
            </div>
        </div>
    );
};

export default MyIdeas;
