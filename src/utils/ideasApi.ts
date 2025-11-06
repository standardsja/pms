// Mock-only ideas API to keep the frontend fully functional without any backend or database.
// All operations are performed in-memory and persisted only for the current session.

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
// --- In-memory store -------------------------------------------------------
const storageKey = 'mock_ideas_store_v1';

function nowIso() { return new Date().toISOString(); }

function loadStore(): Idea[] {
  try {
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Idea[];
    return seed();
  } catch {
    return seed();
  }
}

function saveStore(data: Idea[]) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }
}

function seed(): Idea[] {
  const initial: Idea[] = [
    {
      id: '1',
      title: 'AI-Powered Document Analysis',
      description: 'Automatically analyze and categorize incoming documents to reduce manual processing time.',
      category: 'TECHNOLOGY',
      status: 'PENDING_REVIEW',
      submittedBy: 'John Doe',
      submittedAt: '2025-11-01T10:00:00.000Z',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      promotedAt: null,
      projectCode: null,
      voteCount: 42,
      viewCount: 128,
      createdAt: '2025-11-01T10:00:00.000Z',
      updatedAt: '2025-11-01T10:00:00.000Z',
    },
    {
      id: '2',
      title: 'Green Energy Initiative',
      description: 'Install solar panels on BSJ buildings to reduce electricity costs and carbon footprint.',
      category: 'SUSTAINABILITY',
      status: 'APPROVED',
      submittedBy: 'Jane Smith',
      submittedAt: '2025-11-03T12:00:00.000Z',
      reviewedBy: 'Committee',
      reviewedAt: '2025-11-04T08:00:00.000Z',
      reviewNotes: 'Strong ROI',
      promotedAt: null,
      projectCode: null,
      voteCount: 33,
      viewCount: 95,
      createdAt: '2025-11-03T12:00:00.000Z',
      updatedAt: '2025-11-04T08:00:00.000Z',
    },
    {
      id: '3',
      title: 'Digital Standards Portal',
      description: 'Create a mobile/web portal to search and access standards.',
      category: 'CUSTOMER_SERVICE',
      status: 'PROMOTED_TO_PROJECT',
      submittedBy: 'Bob Johnson',
      submittedAt: '2025-11-04T09:30:00.000Z',
      reviewedBy: 'Committee',
      reviewedAt: '2025-11-05T11:00:00.000Z',
      reviewNotes: null,
      promotedAt: '2025-11-05T12:00:00.000Z',
      projectCode: 'BSJ-PROJ-2025-001',
      voteCount: 50,
      viewCount: 142,
      createdAt: '2025-11-04T09:30:00.000Z',
      updatedAt: '2025-11-05T12:00:00.000Z',
    },
  ];
  saveStore(initial);
  return initial;
}

let store: Idea[] = loadStore();

function delay<T>(value: T, ms = 150): Promise<T> { return new Promise(res => setTimeout(() => res(value), ms)); }

// --- Public API ------------------------------------------------------------
export async function fetchIdeas(params?: { status?: string; sort?: 'popularity' }) {
  let data = [...store];
  if (params?.status) data = data.filter(i => i.status === params.status);
  if (params?.sort === 'popularity') data = data.sort((a, b) => b.voteCount - a.voteCount);
  return delay(data);
}

export async function approveIdea(id: string, notes?: string) {
  store = store.map(i => i.id === id ? {
    ...i,
    status: 'APPROVED',
    reviewedBy: 'Committee',
    reviewedAt: nowIso(),
    reviewNotes: notes ?? i.reviewNotes ?? null,
    updatedAt: nowIso(),
  } : i);
  saveStore(store);
  const updated = store.find(i => i.id === id)!;
  return delay(updated);
}

export async function rejectIdea(id: string, notes?: string) {
  store = store.map(i => i.id === id ? {
    ...i,
    status: 'REJECTED',
    reviewedBy: 'Committee',
    reviewedAt: nowIso(),
    reviewNotes: notes ?? i.reviewNotes ?? null,
    updatedAt: nowIso(),
  } : i);
  saveStore(store);
  const updated = store.find(i => i.id === id)!;
  return delay(updated);
}

export async function promoteIdea(id: string, projectCode?: string) {
  const code = projectCode && projectCode.trim() ? projectCode.trim() : `BSJ-PROJ-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100).padStart(3,'0')}`;
  store = store.map(i => i.id === id ? {
    ...i,
    status: 'PROMOTED_TO_PROJECT',
    promotedAt: nowIso(),
    projectCode: code,
    updatedAt: nowIso(),
  } : i);
  saveStore(store);
  const updated = store.find(i => i.id === id)!;
  return delay(updated);
}
