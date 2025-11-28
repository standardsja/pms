import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient, LoadBalancingStrategy } from '@prisma/client';

/**
 * Unit tests for Load Balancing Service
 * 
 * Tests automatic assignment strategies and workflow integration
 */

describe('Load Balancing Service', () => {
    let mockPrisma: any;

    beforeEach(() => {
        mockPrisma = {
            loadBalancingSettings: {
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
            },
            user: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                findFirst: vi.fn(),
            },
            request: {
                count: vi.fn(),
                update: vi.fn(),
            },
            requestStatusHistory: {
                create: vi.fn(),
            },
        };
    });

    describe('getLoadBalancingSettings', () => {
        it('should return settings when they exist', async () => {
            const mockSettings = {
                id: 1,
                enabled: true,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
                updatedAt: new Date(),
                updatedBy: 1,
            };

            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(mockSettings);

            // Dynamic import to test the function
            const { getLoadBalancingSettings } = await import('../services/loadBalancingService');
            const result = await getLoadBalancingSettings(mockPrisma);

            expect(result).toEqual({
                enabled: true,
                strategy: 'LEAST_LOADED',
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            });
        });

        it('should return null when no settings exist', async () => {
            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(null);

            const { getLoadBalancingSettings } = await import('../services/loadBalancingService');
            const result = await getLoadBalancingSettings(mockPrisma);

            expect(result).toBeNull();
        });
    });

    describe('updateLoadBalancingSettings', () => {
        it('should update existing settings', async () => {
            const existing = {
                id: 1,
                enabled: false,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(existing);
            mockPrisma.loadBalancingSettings.update.mockResolvedValue({
                ...existing,
                enabled: true,
                strategy: 'ROUND_ROBIN' as LoadBalancingStrategy,
            });

            const { updateLoadBalancingSettings } = await import('../services/loadBalancingService');
            const result = await updateLoadBalancingSettings(
                mockPrisma,
                { enabled: true, strategy: 'ROUND_ROBIN' as LoadBalancingStrategy },
                42
            );

            expect(result.enabled).toBe(true);
            expect(result.strategy).toBe('ROUND_ROBIN');
            expect(mockPrisma.loadBalancingSettings.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    enabled: true,
                    strategy: 'ROUND_ROBIN',
                    updatedBy: 42,
                }),
            });
        });

        it('should create settings if none exist', async () => {
            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(null);
            mockPrisma.loadBalancingSettings.create.mockResolvedValue({
                id: 1,
                enabled: true,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            });

            const { updateLoadBalancingSettings } = await import('../services/loadBalancingService');
            const result = await updateLoadBalancingSettings(
                mockPrisma,
                { enabled: true },
                42
            );

            expect(result.enabled).toBe(true);
            expect(mockPrisma.loadBalancingSettings.create).toHaveBeenCalled();
        });
    });

    describe('autoAssignRequest - LEAST_LOADED strategy', () => {
        it('should assign to officer with lowest workload', async () => {
            const mockSettings = {
                enabled: true,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            const officers = [
                { id: 1, name: 'Officer A', email: 'a@test.com' },
                { id: 2, name: 'Officer B', email: 'b@test.com' },
                { id: 3, name: 'Officer C', email: 'c@test.com' },
            ];

            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(mockSettings);
            mockPrisma.user.findMany.mockResolvedValue(officers);
            
            // Officer 2 has 5 assignments, Officer 1 has 10, Officer 3 has 3
            mockPrisma.request.count
                .mockResolvedValueOnce(10) // Officer 1
                .mockResolvedValueOnce(5)  // Officer 2
                .mockResolvedValueOnce(3); // Officer 3 (lowest)

            mockPrisma.request.update.mockResolvedValue({ id: 100 });
            mockPrisma.requestStatusHistory.create.mockResolvedValue({});

            const { autoAssignRequest } = await import('../services/loadBalancingService');
            const result = await autoAssignRequest(mockPrisma, 100);

            expect(result).toBe(3); // Officer 3 should be selected
            expect(mockPrisma.request.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: { currentAssigneeId: 3 },
            });
        });

        it('should return null when load balancing is disabled', async () => {
            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue({
                enabled: false,
                strategy: 'LEAST_LOADED',
                autoAssignOnApproval: true,
            });

            const { autoAssignRequest } = await import('../services/loadBalancingService');
            const result = await autoAssignRequest(mockPrisma, 100);

            expect(result).toBeNull();
            expect(mockPrisma.request.update).not.toHaveBeenCalled();
        });

        it('should return null when no officers are available', async () => {
            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue({
                enabled: true,
                strategy: 'LEAST_LOADED',
            });
            mockPrisma.user.findMany.mockResolvedValue([]);

            const { autoAssignRequest } = await import('../services/loadBalancingService');
            const result = await autoAssignRequest(mockPrisma, 100);

            expect(result).toBeNull();
        });
    });

    describe('autoAssignRequest - ROUND_ROBIN strategy', () => {
        it('should cycle through officers in order', async () => {
            const mockSettings = {
                id: 1,
                enabled: true,
                strategy: 'ROUND_ROBIN' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            const officers = [
                { id: 10, name: 'Officer A', email: 'a@test.com' },
                { id: 20, name: 'Officer B', email: 'b@test.com' },
                { id: 30, name: 'Officer C', email: 'c@test.com' },
            ];

            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(mockSettings);
            mockPrisma.user.findMany.mockResolvedValue(officers);
            mockPrisma.request.count.mockResolvedValue(0);
            mockPrisma.request.update.mockResolvedValue({ id: 100 });
            mockPrisma.requestStatusHistory.create.mockResolvedValue({});
            mockPrisma.loadBalancingSettings.update.mockResolvedValue({});

            const { autoAssignRequest } = await import('../services/loadBalancingService');
            const result = await autoAssignRequest(mockPrisma, 100);

            // First officer (index 0) should be selected
            expect(result).toBe(10);

            // Counter should be incremented
            expect(mockPrisma.loadBalancingSettings.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { roundRobinCounter: 1 },
            });
        });

        it('should wrap around when counter exceeds officer count', async () => {
            const mockSettings = {
                id: 1,
                enabled: true,
                strategy: 'ROUND_ROBIN' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 5, // Greater than officer count (3)
            };

            const officers = [
                { id: 10, name: 'Officer A', email: 'a@test.com' },
                { id: 20, name: 'Officer B', email: 'b@test.com' },
                { id: 30, name: 'Officer C', email: 'c@test.com' },
            ];

            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(mockSettings);
            mockPrisma.user.findMany.mockResolvedValue(officers);
            mockPrisma.request.count.mockResolvedValue(0);
            mockPrisma.request.update.mockResolvedValue({ id: 100 });
            mockPrisma.requestStatusHistory.create.mockResolvedValue({});
            mockPrisma.loadBalancingSettings.update.mockResolvedValue({});

            const { autoAssignRequest } = await import('../services/loadBalancingService');
            const result = await autoAssignRequest(mockPrisma, 100);

            // 5 % 3 = 2, so officer at index 2 (id 30) should be selected
            expect(result).toBe(30);
        });
    });

    describe('autoAssignRequest - RANDOM strategy', () => {
        it('should select a random officer from available pool', async () => {
            const mockSettings = {
                enabled: true,
                strategy: 'RANDOM' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            const officers = [
                { id: 1, name: 'Officer A', email: 'a@test.com' },
                { id: 2, name: 'Officer B', email: 'b@test.com' },
            ];

            mockPrisma.loadBalancingSettings.findFirst.mockResolvedValue(mockSettings);
            mockPrisma.user.findMany.mockResolvedValue(officers);
            mockPrisma.request.count.mockResolvedValue(0);
            mockPrisma.request.update.mockResolvedValue({ id: 100 });
            mockPrisma.requestStatusHistory.create.mockResolvedValue({});

            const { autoAssignRequest } = await import('../services/loadBalancingService');
            const result = await autoAssignRequest(mockPrisma, 100);

            // Should be one of the officers
            expect([1, 2]).toContain(result);
            expect(mockPrisma.request.update).toHaveBeenCalled();
        });
    });

    describe('shouldAutoAssign', () => {
        it('should return true when moving to PROCUREMENT_REVIEW with autoAssignOnApproval enabled', async () => {
            const settings = {
                enabled: true,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            const { shouldAutoAssign } = await import('../services/loadBalancingService');
            expect(shouldAutoAssign('PROCUREMENT_REVIEW', settings)).toBe(true);
        });

        it('should return false when autoAssignOnApproval is disabled', async () => {
            const settings = {
                enabled: true,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: false,
                roundRobinCounter: 0,
            };

            const { shouldAutoAssign } = await import('../services/loadBalancingService');
            expect(shouldAutoAssign('PROCUREMENT_REVIEW', settings)).toBe(false);
        });

        it('should return false when load balancing is disabled', async () => {
            const settings = {
                enabled: false,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            const { shouldAutoAssign } = await import('../services/loadBalancingService');
            expect(shouldAutoAssign('PROCUREMENT_REVIEW', settings)).toBe(false);
        });

        it('should return false for non-PROCUREMENT_REVIEW statuses', async () => {
            const settings = {
                enabled: true,
                strategy: 'LEAST_LOADED' as LoadBalancingStrategy,
                autoAssignOnApproval: true,
                roundRobinCounter: 0,
            };

            const { shouldAutoAssign } = await import('../services/loadBalancingService');
            expect(shouldAutoAssign('FINANCE_REVIEW', settings)).toBe(false);
            expect(shouldAutoAssign('DEPARTMENT_REVIEW', settings)).toBe(false);
            expect(shouldAutoAssign('DRAFT', settings)).toBe(false);
        });

        it('should return false when settings is null', async () => {
            const { shouldAutoAssign } = await import('../services/loadBalancingService');
            expect(shouldAutoAssign('PROCUREMENT_REVIEW', null)).toBe(false);
        });
    });
});
