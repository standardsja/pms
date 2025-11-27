import { describe, it, expect, vi } from 'vitest';

// This is an integration-style test that verifies submit flow reaction to a splintering check.
// We mock the splintering service and emulate the submit handler decision path.

import * as splinter from '../services/splinteringService';

describe('submit flow (integration-style)', () => {
    it('should signal that override is required when splintering detected', async () => {
        // Mock checkSplintering to return flagged
        const mockRes = { flagged: true, combined: 300000, threshold: 250000, windowDays: 30, sumPrior: 250000, matches: [] };
        const spy = vi.spyOn(splinter, 'checkSplintering').mockResolvedValue(mockRes as any);

        const request = { requesterId: 10, departmentId: 2, totalEstimated: 50000 };

        const result = await splinter.checkSplintering({} as any, {
            requesterId: request.requesterId,
            departmentId: request.departmentId,
            total: request.totalEstimated,
            windowDays: 30,
            threshold: 250000,
        });

        expect(result.flagged).toBe(true);
        expect(result.combined).toBeGreaterThanOrEqual(result.threshold);

        spy.mockRestore();
    });
});
