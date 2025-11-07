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
  viewCount: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
  hasVoted?: boolean;
  votes?: Array<{
    id: number;
    userId: number;
    userName: string;
    createdAt: string;
  }>;
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

export async function fetchIdeas(params?: { status?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.sort) qs.set('sort', params.sort);
  const res = await fetch(`/api/ideas${qs.toString() ? `?${qs.toString()}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Idea[];
}

export async function fetchIdeaById(id: string | number): Promise<Idea> {
  const res = await fetch(`/api/ideas/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Idea;
}

export async function submitIdea(data: {
  title: string;
  description: string;
  category: string;
  expectedBenefits?: string;
  implementationNotes?: string;
}) {
  const headers = authHeaders();
  console.log('[submitIdea] Headers:', headers);
  console.log('[submitIdea] Data:', data);
  
  const res = await fetch('/api/ideas', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  console.log('[submitIdea] Response status:', res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[submitIdea] Error response:', errorText);
    throw new Error(errorText);
  }
  
  const result = await res.json();
  console.log('[submitIdea] Success:', result);
  return result as Idea;
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

export async function voteForIdea(id: string | number) {
  const res = await fetch(`/api/ideas/${id}/vote`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    try {
      const errorJson = await res.json();
      if (errorJson.error === 'already voted') {
        throw new Error('ALREADY_VOTED');
      }
      throw new Error(errorJson.error || 'Failed to vote');
    } catch (e) {
      if (e instanceof Error && e.message === 'ALREADY_VOTED') {
        throw e;
      }
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to vote');
    }
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
