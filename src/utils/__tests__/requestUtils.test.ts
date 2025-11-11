import { describe, it, expect } from 'vitest';
import {
  searchRequests,
  filterRequests,
  paginate,
  sortRequestsByDateDesc,
  formatDate,
} from '../requestUtils';
import type { Request } from '../../types/request.types';

const makeReq = (overrides: Partial<Request> = {}): Request => ({
  id: overrides.id ?? 'REQ-001',
  title: overrides.title ?? 'Office Chairs',
  requester: overrides.requester ?? 'Alice',
  department: overrides.department ?? 'Operations',
  status: overrides.status ?? 'Pending Finance',
  date: overrides.date ?? '2024-07-01',
  items: overrides.items ?? [],
  totalEstimated: overrides.totalEstimated ?? 0,
  justification: overrides.justification ?? '',
  comments: overrides.comments ?? [],
  statusHistory: overrides.statusHistory ?? [],
  fundingSource: overrides.fundingSource,
  budgetCode: overrides.budgetCode,
});

describe('requestUtils', () => {
  const data: Request[] = [
    makeReq({ id: 'REQ-002', title: 'Laptops', requester: 'Bob', department: 'IT', status: 'Approved', date: '2024-08-12' }),
    makeReq({ id: 'REQ-001', title: 'Office Chairs', requester: 'Alice', department: 'Operations', status: 'Pending Finance', date: '2024-08-14' }),
    makeReq({ id: 'REQ-003', title: 'Coffee', requester: 'Chris', department: 'HR', status: 'Rejected', date: 'Invalid Date' }),
  ];

  it('searchRequests filters by multiple fields and is case-insensitive', () => {
    expect(searchRequests(data, '')).toHaveLength(3);
    expect(searchRequests(data, 'req-001')).toHaveLength(1);
    expect(searchRequests(data, 'laptops')).toHaveLength(1);
    expect(searchRequests(data, 'alice')).toHaveLength(1);
    expect(searchRequests(data, 'hr')).toHaveLength(1);
  });

  it('filterRequests filters by status and department', () => {
    const statusFiltered = filterRequests(data, { status: 'Approved' });
    expect(statusFiltered).toHaveLength(1);
    const deptFiltered = filterRequests(data, { department: 'IT' });
    expect(deptFiltered).toHaveLength(1);
    const both = filterRequests(data, { status: 'Approved', department: 'IT' });
    expect(both).toHaveLength(1);
  });

  it('paginate slices data correctly', () => {
    const page1 = paginate(data, 1, 2);
    expect(page1).toHaveLength(2);
    const page2 = paginate(data, 2, 2);
    expect(page2).toHaveLength(1);
  });

  it('sortRequestsByDateDesc sorts by date descending and handles invalid dates', () => {
    const sorted = sortRequestsByDateDesc(data);
    // 2024-08-14 (REQ-001) should come before 2024-08-12 (REQ-002); invalid (REQ-003) last
    expect(sorted[0].id).toBe('REQ-001');
    expect(sorted[1].id).toBe('REQ-002');
    expect(sorted[2].id).toBe('REQ-003');
  });

  it('formatDate returns formatted date or falls back', () => {
    expect(formatDate('2024-01-05')).toBeTruthy();
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
