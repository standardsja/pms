import { getToken } from './auth';

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
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
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
