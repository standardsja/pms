import { describe, it, expect } from 'vitest';
import { adaptRequestsResponse } from '../requestUtils';

const apiArray = [
  {
    request_id: 'R-1',
    subject: 'Laptops',
    created_by: { name: 'Bob' },
    dept_name: 'IT',
    state: 'approved',
    created_at: '2024-08-12T10:00:00Z',
    lines: [ { description: 'Laptop', quantity: 2, unitPrice: 1000 } ],
    total: 2000,
    reason: 'Refresh'
  },
];

const apiObject = {
  data: [
    {
      id: 'R-2',
      title: 'Office Chairs',
      requester: 'Alice',
      department: { name: 'Operations' },
      status: 'Pending Finance',
      date: '2024-08-14',
      items: [],
      totalEstimated: 0,
      justification: 'New hires',
    }
  ]
};

describe('adaptRequestsResponse', () => {
  it('adapts array payloads with aliased fields and nested objects', () => {
    const out = adaptRequestsResponse(apiArray);
    expect(out).toHaveLength(1);
    const r = out[0];
    expect(r.id).toBe('R-1');
    expect(r.title).toBe('Laptops');
    expect(r.requester).toBe('Bob');
    expect(r.department).toBe('IT');
    expect(r.status).toBe('Approved');
    expect(r.date).toBe('2024-08-12T10:00:00Z');
    expect(r.totalEstimated).toBe(2000);
    expect(r.justification).toBe('Refresh');
  });

  it('adapts object payloads with data property', () => {
    const out = adaptRequestsResponse(apiObject);
    expect(out).toHaveLength(1);
    const r = out[0];
    expect(r.id).toBe('R-2');
    expect(r.title).toBe('Office Chairs');
    expect(r.requester).toBe('Alice');
    expect(r.department).toBe('Operations');
    expect(r.status).toBe('Pending Finance');
    expect(r.date).toBe('2024-08-14');
    expect(r.totalEstimated).toBe(0);
    expect(r.justification).toBe('New hires');
  });
});
