/**
 * Procurement Requests Routes
 * Handles procurement request operations
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

// Mock data for now - in a real implementation, this would use a database
let mockRequests: any[] = [
    {
        id: 'REQ-20251117-1001',
        title: 'Office Supplies',
        department: 'IT',
        requestedBy: 'John Doe',
        status: 'Pending Finance',
        totalAmount: 2400,
        createdAt: new Date().toISOString(),
        items: [{ description: 'Laptop (14")', quantity: 2, unitPrice: 1200 }],
    },
];

// Get all requests
router.get(
    '/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        logger.info('Fetching procurement requests');
        res.json(mockRequests);
    })
);

// Get request by ID
router.get(
    '/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const request = mockRequests.find((r) => r.id === id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);
    })
);

// Create new request
router.post(
    '/',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const newRequest = {
            id: `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString(),
            status: 'Draft',
        };

        mockRequests.push(newRequest);
        logger.info('Created new procurement request', { requestId: newRequest.id });

        res.status(201).json(newRequest);
    })
);

// Update request
router.put(
    '/:id',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const requestIndex = mockRequests.findIndex((r) => r.id === id);

        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Request not found' });
        }

        mockRequests[requestIndex] = {
            ...mockRequests[requestIndex],
            ...req.body,
            updatedAt: new Date().toISOString(),
        };

        logger.info('Updated procurement request', { requestId: id });
        res.json(mockRequests[requestIndex]);
    })
);

// Submit request for approval
router.post(
    '/:id/submit',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const requestIndex = mockRequests.findIndex((r) => r.id === id);

        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Request not found' });
        }

        mockRequests[requestIndex].status = 'Pending Finance';
        mockRequests[requestIndex].submittedAt = new Date().toISOString();

        logger.info('Submitted procurement request', { requestId: id });
        res.json(mockRequests[requestIndex]);
    })
);

// Approve/reject request
router.post(
    '/:id/action',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { action, notes } = req.body;
        const requestIndex = mockRequests.findIndex((r) => r.id === id);

        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (action === 'approve') {
            mockRequests[requestIndex].status = 'Approved';
            mockRequests[requestIndex].approvedAt = new Date().toISOString();
        } else if (action === 'reject') {
            mockRequests[requestIndex].status = 'Rejected';
            mockRequests[requestIndex].rejectedAt = new Date().toISOString();
        }

        if (notes) {
            mockRequests[requestIndex].notes = notes;
        }

        logger.info('Processed procurement request action', { requestId: id, action });
        res.json(mockRequests[requestIndex]);
    })
);

// Get PDF (mock)
router.get(
    '/:id/pdf',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const request = mockRequests.find((r) => r.id === id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // In a real implementation, this would generate and return a PDF
        res.json({ message: 'PDF generation not implemented', requestId: id });
    })
);

export { router as requestsRoutes };
