import { getToken, getUser } from './auth';

export type Idea = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROMOTED_TO_PROJECT';
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
  hasVoted?: boolean;
  userVoteType?: 'UPVOTE' | 'DOWNVOTE' | null;
  votes?: Array<{
    id: number;
    userId: number;
    userName: string;
    voteType: 'UPVOTE' | 'DOWNVOTE';
    createdAt: string;
  }>;
  attachments?: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType?: string | null;
    uploadedAt: string;
  }>;
  firstAttachmentUrl?: string | null;
};

function authHeaders(): Record<string, string> {
  const token = getToken();
  const user = getUser();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Backend accepts either x-user-id or Authorization: Bearer <id>
  if (user?.id) {
    h['x-user-id'] = user.id;
  }
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  
  return h;
}

export async function fetchIdeas(params?: { status?: string; sort?: string; includeAttachments?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.includeAttachments) qs.set('include', 'attachments');
  // Cache busting to ensure fresh data in all environments
  qs.set('t', Date.now().toString());
  const res = await fetch(`/api/ideas${qs.toString() ? `?${qs.toString()}` : ''}`, {
    headers: {
      ...authHeaders(),
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  const list = (await res.json()) as Idea[];
  return list.map(i => ({ ...i, firstAttachmentUrl: i.attachments?.[0]?.fileUrl || null }));
}

export async function fetchIdeaById(id: string | number, opts?: { includeAttachments?: boolean }): Promise<Idea> {
  const qs = new URLSearchParams();
  if (opts?.includeAttachments) qs.set('include', 'attachments');
  qs.set('t', Date.now().toString());
  const url = `/api/ideas/${id}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      ...authHeaders(),
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  const idea = (await res.json()) as Idea;
  return { ...idea, firstAttachmentUrl: idea.attachments?.[0]?.fileUrl || null };
}

export async function submitIdea(
  data: {
    title: string;
    description: string;
    category: string;
    expectedBenefits?: string;
    implementationNotes?: string;
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
    form.append('category', data.category);
    if (data.expectedBenefits) form.append('expectedBenefits', data.expectedBenefits);
    if (data.implementationNotes) form.append('implementationNotes', data.implementationNotes);
    if (opts?.image) form.append('image', opts.image);
    if (opts?.images) {
      for (const f of opts.images) {
        form.append('files', f);
      }
    }

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
  const headers = authHeaders();
  const res = await fetch('/api/ideas', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Idea;
}

export async function approveIdea(id: string, notes?: string) {
  const res = await fetch(`/api/ideas/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Idea;
}

export async function rejectIdea(id: string, notes?: string) {
  const res = await fetch(`/api/ideas/${id}/reject`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Idea;
}

export async function promoteIdea(id: string, projectCode?: string) {
  const res = await fetch(`/api/ideas/${id}/promote`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ projectCode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Idea;
}

export async function voteForIdea(id: string | number, voteType: 'UPVOTE' | 'DOWNVOTE' = 'UPVOTE') {
  const res = await fetch(`/api/ideas/${id}/vote`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ voteType }),
  });
  if (!res.ok) {
    let errorMessage = 'Failed to vote';
    try {
      const errorJson = await res.json();
      if (errorJson.error === 'already voted') {
        throw new Error('ALREADY_VOTED');
      }
      errorMessage = errorJson.error || errorMessage;
    } catch (e) {
      if (e instanceof Error && e.message === 'ALREADY_VOTED') {
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
    headers: authHeaders(),
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
    return idea.hasVoted || false;
  } catch {
    return false;
  }
}
