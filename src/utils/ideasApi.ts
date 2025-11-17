/**
 * Ideas API Client
 * Production-ready API client for Innovation Hub ideas
 */
import { getToken, getUser } from './auth';

// Type definitions
export interface IdeaAttachment {
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType?: string | null;
    uploadedAt: string;
}

export interface IdeaVote {
    id: number;
    userId: number;
    userName: string;
    voteType: 'UPVOTE' | 'DOWNVOTE';
    createdAt: string;
}

export interface IdeaTag {
    id: number;
    name: string;
}

export interface IdeaChallenge {
    id: number;
    title: string;
}

export type IdeaStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROMOTED_TO_PROJECT';
export type IdeaCategory = 'PROCESS_IMPROVEMENT' | 'TECHNOLOGY' | 'CUSTOMER_SERVICE' | 'SUSTAINABILITY' | 'COST_REDUCTION' | 'PRODUCT_INNOVATION' | 'OTHER';
export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface Idea {
    id: string;
    title: string;
    description: string;
    descriptionHtml?: string | null;
    category: IdeaCategory;
    status: IdeaStatus;
    submittedBy: string;
    submittedById?: number;
    submittedAt: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNotes?: string | null;
    promotedAt?: string | null;
    projectCode?: string | null;
    voteCount: number;
    upvoteCount?: number;
    downvoteCount?: number;
    viewCount: number;
    commentCount?: number;
    createdAt: string;
    updatedAt: string;
    hasVoted?: 'up' | 'down' | null;
    userVoteType?: VoteType | null;
    votes?: IdeaVote[];
    attachments?: IdeaAttachment[];
    firstAttachmentUrl?: string | null;
    stage?: string;
    isAnonymous?: boolean;
    challenge?: IdeaChallenge | null;
    tags?: IdeaTag[];
}

/**
 * Generate authentication headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const token = getToken();
    const user = getUser();

    // Prefer Bearer token for production security
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (user?.id) {
        // Fallback to user ID header (development only)
        headers['x-user-id'] = String(user.id);
    }

    return headers;
}

/**
 * Base API configuration
 * - Development: Use relative URLs (handled by Vite proxy)
 * - Production: Use absolute URL with environment variable
 */
const API_BASE_URL = (() => {
    // In development, use relative URLs for Vite proxy
    if (import.meta.env.DEV) {
        return '/api';
    }
    // In production, use environment variable or fallback
    return import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
})();

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // Ignore JSON parsing errors
            }
            throw new Error(errorMessage);
        }

        // Handle 204 No Content responses
        if (response.status === 204) {
            return undefined as unknown as T;
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return await response.json();
        }

        return (await response.text()) as unknown as T;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Network request failed');
    }
}

export type PaginatedIdeas = {
    ideas: Idea[];
    pagination: {
        nextCursor: number | null;
        hasMore: boolean;
        limit: number;
    };
};

export async function fetchIdeas(params?: {
    status?: string | string[];
    category?: string | string[];
    sort?: 'recent' | 'popular' | 'trending' | string;
    includeAttachments?: boolean;
    tag?: string | string[];
    mine?: boolean;
    cursor?: number;
    limit?: number;
}) {
    const qs = new URLSearchParams();
    const pushParam = (key: string, value?: string | string[]) => {
        if (!value) return;
        if (Array.isArray(value)) {
            value.forEach((v) => v && qs.append(key, v));
        } else {
            qs.append(key, value);
        }
    };

    pushParam('status', params?.status);
    pushParam('category', params?.category);
    pushParam('tag', params?.tag);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.includeAttachments) qs.set('include', 'attachments');
    if (params?.mine) qs.set('mine', 'true');
    if (params?.cursor) qs.set('cursor', String(params.cursor));
    if (params?.limit) qs.set('limit', String(params.limit));
    // Cache busting to ensure fresh data in all environments
    qs.set('t', Date.now().toString());

    try {
        const res = await fetch(`/api/ideas${qs.toString() ? `?${qs.toString()}` : ''}`, {
            headers: {
                ...getAuthHeaders(),
                'Cache-Control': 'no-store',
                Pragma: 'no-cache',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            // Try to parse error response
            let errorMessage = 'Unable to load ideas. Please try again later.';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // If JSON parsing fails, use status text
                errorMessage =
                    res.status === 404 ? 'Ideas not found' : res.status === 403 ? 'Access denied' : res.status === 401 ? 'Please log in to continue' : 'Unable to load ideas. Please try again later.';
            }
            throw new Error(errorMessage);
        }

        const data = await res.json();

        // Handle both paginated and legacy responses
        if (data.ideas && data.pagination) {
            // New paginated format
            const paginated = data as PaginatedIdeas;
            return {
                ...paginated,
                ideas: paginated.ideas.map((i) => ({ ...i, firstAttachmentUrl: i.attachments?.[0]?.fileUrl || null })),
            };
        } else {
            // Legacy format (array of ideas) - for backward compatibility
            const list = data as Idea[];
            return {
                ideas: list.map((i) => ({ ...i, firstAttachmentUrl: i.attachments?.[0]?.fileUrl || null })),
                pagination: {
                    nextCursor: null,
                    hasMore: false,
                    limit: list.length,
                },
            };
        }
    } catch (error) {
        // Network or other fetch errors
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection and try again.');
    }
}

export async function fetchIdeaById(id: string | number, opts?: { includeAttachments?: boolean }): Promise<Idea> {
    const qs = new URLSearchParams();
    if (opts?.includeAttachments) qs.set('include', 'attachments');
    qs.set('t', Date.now().toString());
    const url = `/api/ideas/${id}?${qs.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                ...getAuthHeaders(),
                'Cache-Control': 'no-store',
                Pragma: 'no-cache',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            let errorMessage = 'Unable to load idea details. Please try again later.';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                errorMessage =
                    res.status === 404
                        ? 'Idea not found'
                        : res.status === 403
                        ? 'Access denied'
                        : res.status === 401
                        ? 'Please log in to continue'
                        : 'Unable to load idea details. Please try again later.';
            }
            throw new Error(errorMessage);
        }

        const idea = (await res.json()) as Idea;
        return { ...idea, firstAttachmentUrl: idea.attachments?.[0]?.fileUrl || null };
    } catch (error) {
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection and try again.');
    }
}

// (type defined above near comments helpers)

export async function fetchComments(ideaId: number | string): Promise<IdeaComment[]> {
    try {
        const res = await fetch(`/api/ideas/${ideaId}/comments?t=${Date.now()}`, {
            headers: getAuthHeaders(),
            cache: 'no-store',
        });

        if (!res.ok) {
            let errorMessage = 'Unable to load comments.';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                errorMessage = res.status === 404 ? 'Comments not found' : 'Unable to load comments.';
            }
            throw new Error(errorMessage);
        }

        return (await res.json()) as IdeaComment[];
    } catch (error) {
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error('Unable to load comments. Please try again.');
    }
}

export async function postComment(ideaId: number | string, data: { text: string; parentId?: number | null }): Promise<IdeaComment> {
    const res = await fetch(`/api/ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: data.text, parentId: data.parentId ?? null }),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as IdeaComment;
}

export async function deleteComment(commentId: number): Promise<{ ok: boolean }> {
    const res = await fetch(`/api/ideas/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as { ok: boolean };
}

export type MentionUser = { id: number; name: string; email: string };
export async function searchUsers(term: string, take = 8): Promise<MentionUser[]> {
    const qs = new URLSearchParams({ search: term, take: String(take), t: Date.now().toString() });
    const res = await fetch(`/api/users?${qs.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as MentionUser[];
}

export type RelatedIdea = { id: number; title: string; snippet: string; score: number; firstAttachmentUrl?: string | null };
export async function fetchRelatedIdeas(id: number | string): Promise<RelatedIdea[]> {
    const res = await fetch(`/api/ideas/${id}/related?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.related as RelatedIdea[];
}

export type LeaderboardRow = { userId: number; name: string; email: string; ideaCount: number; upvotes: number; comments: number; points: number; badge: string | null };
export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
    const res = await fetch(`/api/leaderboard?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.leaderboard as LeaderboardRow[];
}

export type AnalyticsData = {
    kpis: {
        totalIdeas: number;
        underReview: number;
        approved: number;
        promoted: number;
        totalEngagement: number;
    };
    submissionsByMonth: number[];
    ideasByCategory: Record<string, number>;
    statusPipeline: {
        submitted: number;
        underReview: number;
        approved: number;
        rejected: number;
        promoted: number;
    };
    topContributors: Array<{ name: string; ideas: number; votes: number }>;
    weeklyEngagement: {
        views: number[];
        votes: number[];
    };
};

export async function fetchAnalytics(): Promise<AnalyticsData> {
    try {
        const res = await fetch(`/api/innovation/analytics?t=${Date.now()}`, {
            headers: {
                ...getAuthHeaders(),
                'Cache-Control': 'no-store',
                Pragma: 'no-cache',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            let errorMessage = 'Unable to load analytics data. Please try again later.';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                errorMessage =
                    res.status === 404
                        ? 'Analytics not available'
                        : res.status === 403
                        ? 'Access denied'
                        : res.status === 401
                        ? 'Please log in to continue'
                        : 'Unable to load analytics data. Please try again later.';
            }
            throw new Error(errorMessage);
        }

        return (await res.json()) as AnalyticsData;
    } catch (error) {
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection and try again.');
    }
}

export async function submitIdea(
    data: {
        title: string;
        description: string;
        descriptionHtml?: string; // optional rich text HTML
        category: string;
        expectedBenefits?: string;
        implementationNotes?: string;
        isAnonymous?: boolean;
        challengeId?: number;
        tagIds?: number[];
    },
    opts?: { image?: File; images?: File[] }
) {
    const token = getToken();
    const user = getUser();

    // Use multipart/form-data if any file(s) provided
    if (opts?.image || (opts?.images && opts.images.length)) {
        const form = new FormData();
        form.append('title', data.title);
        form.append('description', data.description);
        if (data.descriptionHtml) form.append('descriptionHtml', data.descriptionHtml);
        form.append('category', data.category);
        if (data.expectedBenefits) form.append('expectedBenefits', data.expectedBenefits);
        if (data.implementationNotes) form.append('implementationNotes', data.implementationNotes);
        if (opts?.image) form.append('image', opts.image);
        if (opts?.images) {
            for (const f of opts.images) {
                form.append('files', f);
            }
        }
        if (data.isAnonymous) form.append('isAnonymous', String(data.isAnonymous));
        if (data.challengeId) form.append('challengeId', String(data.challengeId));
        if (data.tagIds && data.tagIds.length) form.append('tagIds', data.tagIds.join(','));

        const headers: Record<string, string> = {};
        if (user?.id) headers['x-user-id'] = user.id;
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/ideas', {
            method: 'POST',
            headers,
            body: form,
        });
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as Idea;
    }

    // Fallback to JSON
    const headers = getAuthHeaders();
    const res = await fetch('/api/ideas', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as Idea;
}

export type IdeaComment = {
    id: number;
    ideaId: number;
    userId: number;
    userName: string;
    text: string;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
};

export async function fetchTags(): Promise<Array<{ id: number; name: string }>> {
    const res = await fetch(`/api/tags?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}
export async function createTag(name: string) {
    const res = await fetch('/api/tags', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name }) });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function fetchChallenges(): Promise<Array<{ id: number; title: string; description?: string; isActive: boolean }>> {
    const res = await fetch(`/api/challenges?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}
export async function fetchChallenge(id: number | string) {
    const res = await fetch(`/api/challenges/${id}?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function transitionStage(ideaId: number | string, toStage: string, note?: string) {
    const res = await fetch(`/api/ideas/${ideaId}/stage-transition`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ toStage, note }) });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}
export async function fetchStageHistory(ideaId: number | string) {
    const res = await fetch(`/api/ideas/${ideaId}/stage-history?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function fetchAuditLog(ideaId: number | string) {
    const res = await fetch(`/api/ideas/${ideaId}/audit?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function fetchNotifications() {
    const res = await fetch(`/api/notifications?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}
export async function markNotificationRead(id: number) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST', headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function searchIdeas(q: string) {
    const qs = new URLSearchParams({ q, t: Date.now().toString() });
    const res = await fetch(`/api/ideas/search?${qs.toString()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function fetchInnovationStats() {
    const res = await fetch(`/api/innovation/stats?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

export async function fetchIdeaCounts(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    promoted: number;
    draft?: number;
    total: number;
}> {
    try {
        const res = await fetch(`/api/ideas/counts?t=${Date.now()}`, {
            headers: {
                ...getAuthHeaders(),
                'Cache-Control': 'no-store',
                Pragma: 'no-cache',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error('Unable to load idea counts');
        }

        return await res.json();
    } catch (error) {
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error('Network error. Please check your connection and try again.');
    }
}

export async function approveIdea(id: string, notes?: string) {
    const res = await fetch(`/api/ideas/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as Idea;
}

export async function rejectIdea(id: string, notes?: string) {
    const res = await fetch(`/api/ideas/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as Idea;
}

export async function promoteIdea(id: string, projectCode?: string) {
    const res = await fetch(`/api/ideas/${id}/promote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectCode }),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as Idea;
}

export async function voteForIdea(id: string | number, voteType: 'UPVOTE' | 'DOWNVOTE' = 'UPVOTE') {
    const res = await fetch(`/api/ideas/${id}/vote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ voteType }),
    });
    if (!res.ok) {
        let errorMessage = 'Failed to vote';
        try {
            const errorJson = await res.json();
            if (errorJson.error === 'already voted') {
                throw new Error('ALREADY_VOTED');
            }
            if (errorJson.error === 'vote limit reached') {
                throw new Error('VOTE_LIMIT_REACHED');
            }
            errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
            if (e instanceof Error && (e.message === 'ALREADY_VOTED' || e.message === 'VOTE_LIMIT_REACHED')) {
                throw e;
            }
            // If JSON parsing failed, leave errorMessage as is
        }
        throw new Error(errorMessage);
    }
    return (await res.json()) as Idea;
}

export async function removeVote(id: string | number) {
    const res = await fetch(`/api/ideas/${id}/vote`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
    }
    return (await res.json()) as Idea;
}

export async function checkIfVoted(id: string | number): Promise<boolean> {
    try {
        const idea = await fetchIdeaById(id);
        return Boolean(idea.hasVoted);
    } catch {
        return false;
    }
}
