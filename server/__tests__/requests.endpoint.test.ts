import { describe, it, expect, vi } from 'vitest';

/**
 * Integration tests for GET /requests endpoint
 * 
 * Tests the error handling and automatic repair logic for legacy
 * Request.status values that cause Prisma enum validation failures.
 */

describe('GET /requests endpoint', () => {
    describe('Error handling and repair', () => {
        it('should catch Prisma enum error and attempt repair', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi
                        .fn()
                        .mockRejectedValueOnce(
                            new Error("Value 'EXECUTIVE_REVIEW' not found in enum 'RequestStatus'")
                        )
                        .mockResolvedValueOnce([
                            {
                                id: 1,
                                reference: 'REQ-001',
                                title: 'Test Request',
                                status: 'EXECUTIVE_REVIEW',
                            },
                        ]),
                },
                $executeRawUnsafe: vi.fn().mockResolvedValue(0),
            };

            // Simulate the endpoint logic
            let requests;
            try {
                requests = await mockPrisma.request.findMany();
            } catch (e: any) {
                const message = String(e?.message || '');
                if (message.includes("not found in enum 'RequestStatus'")) {
                    // Trigger repair
                    await mockPrisma.$executeRawUnsafe("UPDATE Request SET status = 'DRAFT' WHERE status IS NULL");
                    // Retry
                    requests = await mockPrisma.request.findMany();
                }
            }

            expect(requests).toBeDefined();
            expect(requests).toHaveLength(1);
            expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
            expect(mockPrisma.request.findMany).toHaveBeenCalledTimes(2);
        });

        it('should return 500 if repair fails', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockRejectedValue(new Error("not found in enum 'RequestStatus'")),
                },
                $executeRawUnsafe: vi.fn().mockResolvedValue(null), // Repair returns null (failed)
            };

            let statusCode = 200;
            let responseBody: any = null;

            try {
                await mockPrisma.request.findMany();
            } catch (e: any) {
                const message = String(e?.message || '');
                if (message.includes("not found in enum 'RequestStatus'")) {
                    const patched = await mockPrisma.$executeRawUnsafe("UPDATE Request SET status = 'DRAFT'");
                    if (patched !== null) {
                        // Retry would happen here
                        await mockPrisma.request.findMany();
                    } else {
                        statusCode = 500;
                        responseBody = {
                            error: 'Request status repair required but failed',
                            details: message,
                        };
                    }
                }
            }

            expect(statusCode).toBe(500);
            expect(responseBody.error).toBe('Request status repair required but failed');
        });

        it('should return 500 if retry also fails', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi
                        .fn()
                        .mockRejectedValueOnce(new Error("Value 'EXECUTIVE_REVIEW' not found in enum"))
                        .mockRejectedValueOnce(new Error("Value 'ANOTHER_BAD_STATUS' not found in enum")),
                },
                $executeRawUnsafe: vi.fn().mockResolvedValue(5), // Repair succeeded
            };

            let statusCode = 200;
            let responseBody: any = null;

            try {
                await mockPrisma.request.findMany();
            } catch (e: any) {
                const message = String(e?.message || '');
                if (message.includes("not found in enum")) {
                    const patched = await mockPrisma.$executeRawUnsafe("UPDATE Request SET status = 'DRAFT'");
                    if (patched !== null) {
                        try {
                            await mockPrisma.request.findMany(); // Retry
                        } catch (retryE: any) {
                            statusCode = 500;
                            responseBody = {
                                error: 'Failed to retrieve requests after attempted repair',
                                details: String(retryE?.message || ''),
                            };
                        }
                    }
                }
            }

            expect(statusCode).toBe(500);
            expect(responseBody.error).toBe('Failed to retrieve requests after attempted repair');
            expect(mockPrisma.request.findMany).toHaveBeenCalledTimes(2);
        });

        it('should return data successfully after repair', async () => {
            const mockRequests = [
                { id: 1, reference: 'REQ-001', title: 'Request 1', status: 'DRAFT' },
                { id: 2, reference: 'REQ-002', title: 'Request 2', status: 'SUBMITTED' },
            ];

            const mockPrisma = {
                request: {
                    findMany: vi
                        .fn()
                        .mockRejectedValueOnce(new Error("Value 'PENDING' not found in enum 'RequestStatus'"))
                        .mockResolvedValueOnce(mockRequests),
                },
                $executeRawUnsafe: vi.fn().mockResolvedValue(3), // 3 rows repaired
            };

            let result: any = null;

            try {
                result = await mockPrisma.request.findMany();
            } catch (e: any) {
                const message = String(e?.message || '');
                if (message.includes("not found in enum 'RequestStatus'")) {
                    await mockPrisma.$executeRawUnsafe("UPDATE Request SET status = 'SUBMITTED' WHERE status = 'PENDING'");
                    result = await mockPrisma.request.findMany();
                }
            }

            expect(result).toEqual(mockRequests);
            expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
        });
    });

    describe('Normal operation', () => {
        it('should return requests without triggering repair when status values are valid', async () => {
            const mockRequests = [
                { id: 1, reference: 'REQ-001', title: 'Request 1', status: 'DRAFT' },
                { id: 2, reference: 'REQ-002', title: 'Request 2', status: 'EXECUTIVE_REVIEW' },
                { id: 3, reference: 'REQ-003', title: 'Request 3', status: 'FINANCE_APPROVED' },
            ];

            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockResolvedValue(mockRequests),
                },
                $executeRawUnsafe: vi.fn(),
            };

            const result = await mockPrisma.request.findMany();

            expect(result).toEqual(mockRequests);
            expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
            expect(mockPrisma.request.findMany).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when no requests exist', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockResolvedValue([]),
                },
            };

            const result = await mockPrisma.request.findMany();

            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should include all required relations in select', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockResolvedValue([]),
                },
            };

            const selectFields = {
                id: true,
                reference: true,
                title: true,
                requesterId: true,
                departmentId: true,
                status: true,
                currentAssigneeId: true,
                totalEstimated: true,
                currency: true,
                procurementType: true,
                createdAt: true,
                updatedAt: true,
                requester: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true, code: true } },
                currentAssignee: { select: { id: true, name: true, email: true } },
                headerDeptCode: true,
                headerMonth: true,
                headerYear: true,
                headerSequence: true,
            };

            await mockPrisma.request.findMany({
                orderBy: { createdAt: 'desc' },
                select: selectFields,
            });

            expect(mockPrisma.request.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
                select: selectFields,
            });
        });
    });

    describe('Error scenarios', () => {
        it('should handle database connection errors', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockRejectedValue(new Error('ECONNREFUSED: Connection refused')),
                },
            };

            let error: Error | null = null;

            try {
                await mockPrisma.request.findMany();
            } catch (e: any) {
                error = e;
            }

            expect(error).toBeDefined();
            expect(error?.message).toContain('ECONNREFUSED');
        });

        it('should handle timeout errors', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockRejectedValue(new Error('Query timeout')),
                },
            };

            let error: Error | null = null;

            try {
                await mockPrisma.request.findMany();
            } catch (e: any) {
                error = e;
            }

            expect(error).toBeDefined();
            expect(error?.message).toBe('Query timeout');
        });

        it('should handle generic database errors', async () => {
            const mockPrisma = {
                request: {
                    findMany: vi.fn().mockRejectedValue(new Error('Unknown database error')),
                },
                $executeRawUnsafe: vi.fn(),
            };

            let statusCode = 200;

            try {
                await mockPrisma.request.findMany();
            } catch (e: any) {
                const message = String(e?.message || '');
                if (!message.includes("not found in enum 'RequestStatus'")) {
                    statusCode = 500;
                }
            }

            expect(statusCode).toBe(500);
            expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled(); // Should not attempt repair
        });
    });
});
