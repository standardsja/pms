import { getToken, getUser } from './auth';

export type Idea = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROMOTED_TO_PROJECT';
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  promotedAt?: string | null;
  projectCode?: string | null;
  voteCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
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
    const errorText = await res.text();
    throw new Error(errorText);
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
  // The backend doesn't have a specific endpoint for this, so we'll track it client-side
  // or check via the votes list when fetching ideas
  return false; // TODO: Implement proper check
}
