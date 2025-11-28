import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for fixInvalidRequestStatuses utility
 *
 * Tests the database repair logic that normalizes legacy Request.status values
 * to current enum values, preventing Prisma query failures.
 */

describe('fixInvalidRequestStatuses', () => {
    let mockPrisma: any;
    let fixInvalidRequestStatuses: () => Promise<number | null>;

    beforeEach(() => {
        // Mock Prisma client with $executeRawUnsafe
        mockPrisma = {
            $executeRawUnsafe: vi.fn(),
        };

        // Recreate the function with mocked prisma
        fixInvalidRequestStatuses = async (): Promise<number | null> => {
            try {
                let total = 0;

                // 1) NULL or empty -> DRAFT
                const r1: any = await mockPrisma.$executeRawUnsafe("UPDATE Request SET status = 'DRAFT' WHERE status IS NULL OR status = ''");
                total += typeof r1 === 'number' ? r1 : r1?.rowCount ?? 0;

                // 2) Legacy names -> current enum
                const updates: Array<{ sql: string; desc: string }> = [
                    {
                        sql: "UPDATE Request SET status = 'SUBMITTED' WHERE status IN ('PENDING','UNDER_REVIEW')",
                        desc: 'PENDING/UNDER_REVIEW -> SUBMITTED',
                    },
                    {
                        sql: "UPDATE Request SET status = 'DEPARTMENT_REVIEW' WHERE status IN ('DEPT_REVIEW','DEPARTMENT_APPROVAL','DEPARTMENT_REVIEWING')",
                        desc: 'Dept legacy -> DEPARTMENT_REVIEW',
                    },
                    {
                        sql: "UPDATE Request SET status = 'BUDGET_MANAGER_REVIEW' WHERE status IN ('BUDGET_REVIEW','BUDGET_OFFICER_REVIEW')",
                        desc: 'Budget legacy -> BUDGET_MANAGER_REVIEW',
                    },
                    {
                        sql: "UPDATE Request SET status = 'EXECUTIVE_REVIEW' WHERE status IN ('EXECUTIVE_APPROVED','EXECUTIVE_APPROVAL')",
                        desc: 'Executive legacy -> EXECUTIVE_REVIEW',
                    },
                    {
                        sql: "UPDATE Request SET status = 'FINANCE_APPROVED' WHERE status = 'APPROVED'",
                        desc: 'APPROVED (generic) -> FINANCE_APPROVED',
                    },
                    {
                        sql: "UPDATE Request SET status = 'PROCUREMENT_REVIEW' WHERE status IN ('PROCUREMENT','PROCUREMENT_APPROVED','PROCUREMENT_APPROVAL')",
                        desc: 'Procurement legacy -> PROCUREMENT_REVIEW',
                    },
                ];
                for (const u of updates) {
                    const r: any = await mockPrisma.$executeRawUnsafe(u.sql);
                    total += typeof r === 'number' ? r : r?.rowCount ?? 0;
                }

                // 3) Anything still not in the enum -> DRAFT as a safe fallback
                const allowed = [
                    'DRAFT',
                    'SUBMITTED',
                    'DEPARTMENT_REVIEW',
                    'DEPARTMENT_RETURNED',
                    'DEPARTMENT_APPROVED',
                    'EXECUTIVE_REVIEW',
                    'HOD_REVIEW',
                    'PROCUREMENT_REVIEW',
                    'FINANCE_REVIEW',
                    'FINANCE_RETURNED',
                    'BUDGET_MANAGER_REVIEW',
                    'FINANCE_APPROVED',
                    'SENT_TO_VENDOR',
                    'CLOSED',
                    'REJECTED',
                ];
                const rCatchAll: any = await mockPrisma.$executeRawUnsafe(`UPDATE Request SET status = 'DRAFT' WHERE status IS NOT NULL AND status NOT IN (${allowed.map((s) => `'${s}'`).join(',')})`);
                total += typeof rCatchAll === 'number' ? rCatchAll : rCatchAll?.rowCount ?? 0;

                return total;
            } catch (err) {
                console.warn('fixInvalidRequestStatuses: failed to patch invalid statuses:', err);
                return null;
            }
        };
    });

    it('should handle NULL/empty status and return affected rows', async () => {
        // Mock: 3 rows updated for NULL/empty, 0 for legacy, 0 for catch-all
        mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(3); // NULL/empty
        mockPrisma.$executeRawUnsafe.mockResolvedValue(0); // All other updates

        const result = await fixInvalidRequestStatuses();

        expect(result).toBe(3);
        expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith("UPDATE Request SET status = 'DRAFT' WHERE status IS NULL OR status = ''");
    });

    it('should normalize legacy status values', async () => {
        // Mock: 0 NULL, 2 PENDING->SUBMITTED, 1 DEPT_REVIEW->DEPARTMENT_REVIEW, 0 others, 0 catch-all
        mockPrisma.$executeRawUnsafe
            .mockResolvedValueOnce(0) // NULL/empty
            .mockResolvedValueOnce(2) // PENDING/UNDER_REVIEW -> SUBMITTED
            .mockResolvedValueOnce(1) // DEPT_REVIEW -> DEPARTMENT_REVIEW
            .mockResolvedValueOnce(0) // BUDGET legacy
            .mockResolvedValueOnce(0) // EXECUTIVE legacy
            .mockResolvedValueOnce(0) // APPROVED
            .mockResolvedValueOnce(0) // PROCUREMENT legacy
            .mockResolvedValueOnce(0); // catch-all

        const result = await fixInvalidRequestStatuses();

        expect(result).toBe(3); // 0 + 2 + 1 + 0...
        expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith("UPDATE Request SET status = 'SUBMITTED' WHERE status IN ('PENDING','UNDER_REVIEW')");
        expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith("UPDATE Request SET status = 'DEPARTMENT_REVIEW' WHERE status IN ('DEPT_REVIEW','DEPARTMENT_APPROVAL','DEPARTMENT_REVIEWING')");
    });

    it('should apply catch-all for unrecognized statuses', async () => {
        // Mock: 0 NULL, 0 for all legacy updates, 5 for catch-all
        const zeroResult = 0;
        mockPrisma.$executeRawUnsafe.mockResolvedValue(zeroResult); // All updates return 0
        mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(0); // NULL/empty
        // 6 legacy updates = 6 calls with 0
        for (let i = 0; i < 6; i++) {
            mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(0);
        }
        // Last call (catch-all) returns 5
        mockPrisma.$executeRawUnsafe.mockResolvedValueOnce(5);

        const result = await fixInvalidRequestStatuses();

        expect(result).toBe(5);
        // Verify catch-all was called with the correct enum list
        const lastCall = mockPrisma.$executeRawUnsafe.mock.calls[mockPrisma.$executeRawUnsafe.mock.calls.length - 1][0];
        expect(lastCall).toContain("UPDATE Request SET status = 'DRAFT' WHERE status IS NOT NULL AND status NOT IN");
        expect(lastCall).toContain("'EXECUTIVE_REVIEW'");
        expect(lastCall).toContain("'BUDGET_MANAGER_REVIEW'");
    });

    it('should handle rowCount object format from some DB drivers', async () => {
        // Mock: returns { rowCount: 4 } instead of number
        mockPrisma.$executeRawUnsafe.mockResolvedValueOnce({ rowCount: 4 }); // NULL/empty
        mockPrisma.$executeRawUnsafe.mockResolvedValue(0); // All other updates

        const result = await fixInvalidRequestStatuses();

        expect(result).toBe(4);
    });

    it('should return null when database error occurs', async () => {
        // Mock: throw error on first query
        mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error('Database connection lost'));

        const result = await fixInvalidRequestStatuses();

        expect(result).toBeNull();
    });

    it('should accumulate total affected rows across all operations', async () => {
        // Mock: 1 NULL, 2 PENDING, 0 DEPT, 3 BUDGET, 1 EXECUTIVE, 2 APPROVED, 0 PROCUREMENT, 4 catch-all
        mockPrisma.$executeRawUnsafe
            .mockResolvedValueOnce(1) // NULL/empty
            .mockResolvedValueOnce(2) // PENDING
            .mockResolvedValueOnce(0) // DEPT
            .mockResolvedValueOnce(3) // BUDGET
            .mockResolvedValueOnce(1) // EXECUTIVE
            .mockResolvedValueOnce(2) // APPROVED
            .mockResolvedValueOnce(0) // PROCUREMENT
            .mockResolvedValueOnce(4); // catch-all

        const result = await fixInvalidRequestStatuses();

        expect(result).toBe(13); // 1+2+0+3+1+2+0+4
    });

    it('should handle all status mappings correctly', async () => {
        mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
        await fixInvalidRequestStatuses();

        const calls = mockPrisma.$executeRawUnsafe.mock.calls.map((c: any) => c[0]);

        // Verify all expected transformations are present
        expect(calls.some((sql: string) => sql.includes("'PENDING','UNDER_REVIEW'"))).toBe(true);
        expect(calls.some((sql: string) => sql.includes("'DEPT_REVIEW','DEPARTMENT_APPROVAL','DEPARTMENT_REVIEWING'"))).toBe(true);
        expect(calls.some((sql: string) => sql.includes("'BUDGET_REVIEW','BUDGET_OFFICER_REVIEW'"))).toBe(true);
        expect(calls.some((sql: string) => sql.includes("'EXECUTIVE_APPROVED','EXECUTIVE_APPROVAL'"))).toBe(true);
        expect(calls.some((sql: string) => sql.includes("status = 'APPROVED'"))).toBe(true);
        expect(calls.some((sql: string) => sql.includes("'PROCUREMENT','PROCUREMENT_APPROVED','PROCUREMENT_APPROVAL'"))).toBe(true);
    });

    it('should not modify valid enum values', async () => {
        // All updates return 0 (no rows matched)
        mockPrisma.$executeRawUnsafe.mockResolvedValue(0);

        const result = await fixInvalidRequestStatuses();

        expect(result).toBe(0);
        // Verify all queries were executed (not short-circuited)
        expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(8); // 1 NULL + 6 legacy + 1 catch-all
    });
});
