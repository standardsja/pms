// Lightweight in-memory/localStorage mock for Procurement requests
// Keeps the Procurement module fully frontend-only (no backend/DB required)

import type { Request, RequestItem } from '../types/request.types';

const STORE_KEY = 'pms_requisitions_v1';

type Store = {
  requests: Request[];
};

const nowIso = () => new Date().toISOString();

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedStore();
  saveStore(seeded);
  return seeded;
}

function saveStore(store: Store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function seedStore(): Store {
  // Generate a few demo requests for the UI
  const makeItems = (): RequestItem[] => [
    { description: 'Laptop (14")', quantity: 2, unitPrice: 1200 },
    { description: 'Docking Station', quantity: 2, unitPrice: 250 },
  ];
  const total = (items: RequestItem[]) => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const statuses = [
    'Pending Finance',
    'Finance Verified',
    'Pending Procurement',
    'Approved',
    'Rejected',
    'Fulfilled',
  ];

  const requests: Request[] = Array.from({ length: 12 }).map((_, idx) => {
    const items = makeItems();
    const status = statuses[idx % statuses.length];
    const id = `REQ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${(1000+idx)}`;
    return {
      id,
      title: `Equipment Purchase #${idx + 1}`,
      requester: idx % 2 ? 'Jane Smith' : 'John Doe',
      department: idx % 3 ? 'IT' : 'Finance',
      status,
      date: nowIso(),
      items,
      totalEstimated: total(items),
      fundingSource: idx % 2 ? 'Operational Budget' : 'CapEx',
      budgetCode: idx % 2 ? 'OP-2025-IT' : 'CAP-2025-01',
      justification: 'Standard equipment refresh to support staff productivity.',
      comments: [],
      statusHistory: [
        { status: 'Submitted', date: nowIso(), actor: 'System', note: 'Request created' },
      ],
    };
  });

  return { requests };
}

function nextId(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
  return `REQ-${date}-${rand}`;
}

export async function fetchRequisitions(): Promise<Request[]> {
  const store = loadStore();
  // latest first
  return [...store.requests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getRequestById(id: string): Promise<Request | null> {
  const store = loadStore();
  return store.requests.find(r => r.id === id) || null;
}

export type CreateRequisitionInput = {
  title: string;
  justification: string;
  items: RequestItem[];
  requester: string;
  department: string;
  totalEstimated?: number;
  fundingSource?: string;
  budgetCode?: string;
};

export async function createRequisition(input: CreateRequisitionInput): Promise<Request> {
  const store = loadStore();
  const items = input.items || [];
  const total = typeof input.totalEstimated === 'number'
    ? input.totalEstimated
    : items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const req: Request = {
    id: nextId(),
    title: input.title || 'Procurement Request',
    requester: input.requester,
    department: input.department,
    status: 'Pending Finance',
    date: nowIso(),
    items,
    totalEstimated: total,
    fundingSource: input.fundingSource,
    budgetCode: input.budgetCode,
    justification: input.justification || '',
    comments: [],
    statusHistory: [
      { status: 'Pending Finance', date: nowIso(), actor: input.requester || 'Requester', note: 'Submitted' },
    ],
  };
  store.requests.unshift(req);
  saveStore(store);
  return req;
}

export async function updateRequisition(id: string, patch: Partial<Request>): Promise<Request> {
  const store = loadStore();
  const idx = store.requests.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Request not found');
  const updated = { ...store.requests[idx], ...patch } as Request;
  store.requests[idx] = updated;
  saveStore(store);
  return updated;
}

export type RequisitionAction = 'APPROVE' | 'REJECT' | 'SEND_TO_VENDOR' | 'FINANCE_VERIFY' | 'FULFILL';

export async function performAction(id: string, action: RequisitionAction, actor = 'User'): Promise<Request> {
  const store = loadStore();
  const idx = store.requests.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Request not found');
  const req = store.requests[idx];
  const transitions: Record<RequisitionAction, { status: string; note: string }> = {
    APPROVE: { status: 'Approved', note: 'Approved by reviewer' },
    REJECT: { status: 'Rejected', note: 'Rejected by reviewer' },
    SEND_TO_VENDOR: { status: 'Pending Procurement', note: 'Dispatched to vendors' },
    FINANCE_VERIFY: { status: 'Finance Verified', note: 'Verified by Finance' },
    FULFILL: { status: 'Fulfilled', note: 'Order fulfilled' },
  };
  const t = transitions[action];
  const updated: Request = {
    ...req,
    status: t.status,
    statusHistory: [...req.statusHistory, { status: t.status, date: nowIso(), actor, note: t.note }],
  };
  store.requests[idx] = updated;
  saveStore(store);
  return updated;
}

export const procurementMockEnabled = (): boolean => {
  // Enabled by default; set VITE_DISABLE_API=false to force real API
  const v = (import.meta as any).env?.VITE_DISABLE_API;
  return v !== 'false';
};
