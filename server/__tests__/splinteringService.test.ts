import { describe, it, expect, vi } from 'vitest';
import { checkSplintering } from '../services/splinteringService';

describe('splinteringService', () => {
  it('flags when combined total >= threshold', async () => {
    const fakePrisma: any = {
      request: {
        findMany: vi.fn().mockResolvedValue([
          { id: 1, totalEstimated: 100000, createdAt: new Date(), requesterId: 2, departmentId: 3 },
          { id: 2, totalEstimated: 120000, createdAt: new Date(), requesterId: 2, departmentId: 3 },
        ]),
      },
    };

    const res = await checkSplintering(fakePrisma as any, { requesterId: 2, departmentId: 3, total: 50000, windowDays: 30, threshold: 250000 });
    expect(res.sumPrior).toBe(220000);
    expect(res.combined).toBe(270000);
    expect(res.flagged).toBe(true);
    expect(Array.isArray(res.matches)).toBe(true);
  });

  it('does not flag when combined total < threshold', async () => {
    const fakePrisma: any = {
      request: {
        findMany: vi.fn().mockResolvedValue([
          { id: 1, totalEstimated: 20000, createdAt: new Date(), requesterId: 5, departmentId: 7 },
        ]),
      },
    };

    const res = await checkSplintering(fakePrisma as any, { requesterId: 5, departmentId: 7, total: 30000, windowDays: 30, threshold: 100000 });
    expect(res.sumPrior).toBe(20000);
    expect(res.combined).toBe(50000);
    expect(res.flagged).toBe(false);
  });
});
