import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkUserRoles } from '../utils/roleUtils';

const router = Router();
const prisma = new PrismaClient();

// Get all suppliers/vendors with statistics
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, search, category } = req.query;
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        // Only procurement users and admins can view suppliers
        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement users can view suppliers',
            });
        }

        // Get all vendors with their request statistics
        const vendors = await prisma.vendor.findMany({
            include: {
                requests: {
                    select: {
                        id: true,
                        totalEstimated: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Transform vendor data with statistics
        let transformed = vendors.map((vendor) => {
            const contact = vendor.contact as any;
            const totalOrders = vendor.requests.length;
            const totalSpend = vendor.requests.reduce((sum, req) => sum + Number(req.totalEstimated || 0), 0);

            // Calculate average rating (mock for now - can be extended with actual rating system)
            const rating = totalOrders > 0 ? Math.min(5, 3.5 + totalOrders / 20) : 0;

            // Determine status based on recent activity
            const recentRequests = vendor.requests.filter((req) => {
                return req.status !== 'DRAFT' && req.status !== 'REJECTED';
            });
            const status = recentRequests.length > 0 ? 'Active' : 'Inactive';

            // Get email from vendor.email field first, then fall back to contact.email
            const email = (vendor as any).email || contact?.email || 'N/A';

            return {
                id: vendor.id,
                name: vendor.name,
                category: contact?.category || 'General',
                contact: contact?.name || 'N/A',
                email,
                phone: contact?.phone || 'N/A',
                address: vendor.address || 'N/A',
                website: vendor.website || null,
                rating: Number(rating.toFixed(1)),
                totalOrders,
                totalSpend,
                status,
                registeredDate: vendor.createdAt.toISOString().split('T')[0],
                createdAt: vendor.createdAt,
            };
        });

        // Apply filters
        if (search) {
            const searchLower = (search as string).toLowerCase();
            transformed = transformed.filter((s) => s.name.toLowerCase().includes(searchLower) || s.contact.toLowerCase().includes(searchLower) || s.email.toLowerCase().includes(searchLower));
        }

        if (status && status !== 'all') {
            transformed = transformed.filter((s) => s.status === status);
        }

        if (category && category !== 'all') {
            transformed = transformed.filter((s) => s.category === category);
        }

        res.json(transformed);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({
            error: 'Failed to fetch suppliers',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Get single supplier by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement users can view suppliers',
            });
        }

        const vendor = await prisma.vendor.findUnique({
            where: { id: parseInt(id) },
            include: {
                requests: {
                    select: {
                        id: true,
                        reference: true,
                        title: true,
                        totalEstimated: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!vendor) {
            return res.status(404).json({
                error: 'Supplier not found',
            });
        }

        const contact = vendor.contact as any;
        const totalOrders = vendor.requests.length;
        const totalSpend = vendor.requests.reduce((sum, req) => sum + Number(req.totalEstimated || 0), 0);

        res.json({
            id: vendor.id,
            name: vendor.name,
            category: contact?.category || 'General',
            contact: contact?.name || 'N/A',
            email: contact?.email || 'N/A',
            phone: contact?.phone || 'N/A',
            address: vendor.address || 'N/A',
            website: vendor.website || null,
            totalOrders,
            totalSpend,
            registeredDate: vendor.createdAt.toISOString().split('T')[0],
            recentOrders: vendor.requests.slice(0, 10).map((req) => ({
                id: req.id,
                reference: req.reference,
                title: req.title,
                amount: Number(req.totalEstimated || 0),
                status: req.status,
                date: req.createdAt.toISOString().split('T')[0],
            })),
        });
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({
            error: 'Failed to fetch supplier',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Create new supplier
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, contact, email, address, website, category } = req.body;

        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement users can create suppliers',
            });
        }

        if (!name) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Supplier name is required',
            });
        }

        const vendor = await (prisma as any).vendor.create({
            data: {
                name,
                email,
                contact: {
                    ...contact,
                    category: category || 'General',
                },
                address,
                website,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            supplier: vendor,
        });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({
            error: 'Failed to create supplier',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Update supplier
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact, email, address, website, category } = req.body;

        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
            });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (address !== undefined) updateData.address = address;
        if (website !== undefined) updateData.website = website;
        if (contact) {
            updateData.contact = {
                ...contact,
                category: category || contact.category || 'General',
            };
        }

        const vendor = await (prisma as any).vendor.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        res.json({
            success: true,
            message: 'Supplier updated successfully',
            supplier: vendor,
        });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({
            error: 'Failed to update supplier',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Delete supplier
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
            });
        }

        // Check if supplier has any requests
        const vendor = await prisma.vendor.findUnique({
            where: { id: parseInt(id) },
            include: { requests: true },
        });

        if (!vendor) {
            return res.status(404).json({
                error: 'Supplier not found',
            });
        }

        if (vendor.requests.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete supplier',
                message: 'Supplier has associated requests. Please remove or reassign them first.',
            });
        }

        await prisma.vendor.delete({
            where: { id: parseInt(id) },
        });

        res.json({
            success: true,
            message: 'Supplier deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({
            error: 'Failed to delete supplier',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
