import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { checkUserRoles } from '../utils/roleUtils.js';
import { sendPOAwardNotification } from '../services/notificationService.js';

const router = Router();
const prisma = new PrismaClient();

// Get all purchase orders with filtering
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, search } = req.query;
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        // Only procurement users, finance, and admins can view purchase orders
        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isFinanceUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement and finance users can view purchase orders',
            });
        }

        let whereClause: any = {};

        // Filter by status if provided
        if (status && status !== 'all') {
            whereClause.status = status as string;
        }

        // Search by PO number, supplier name, or description
        if (search) {
            whereClause.OR = [{ poNumber: { contains: search as string } }, { supplierName: { contains: search as string } }, { description: { contains: search as string } }];
        }

        const purchaseOrders = await (prisma as any).purchaseOrder.findMany({
            where: whereClause,
            include: {
                creator: { select: { name: true, email: true } },
                approver: { select: { name: true, email: true } },
                request: { select: { reference: true, title: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const transformed = purchaseOrders.map((po: any) => ({
            id: po.id,
            poNumber: po.poNumber,
            requestId: po.requestId,
            rfqNumber: po.request?.reference || null,
            supplier: po.supplierName,
            description: po.description,
            poDate: po.poDate.toISOString().split('T')[0],
            deliveryDate: po.deliveryDate?.toISOString().split('T')[0] || null,
            amount: Number(po.amount),
            currency: po.currency,
            status: po.status,
            paymentStatus: po.paymentStatus,
            deliveryStatus: po.deliveryStatus,
            createdBy: po.creator?.name || 'Unknown',
            approvedBy: po.approver?.name || null,
            approvedAt: po.approvedAt?.toISOString() || null,
            itemsCount: po.items.length,
            createdAt: po.createdAt,
            updatedAt: po.updatedAt,
        }));

        res.json(transformed);
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({
            error: 'Failed to fetch purchase orders',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Get single purchase order by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isFinanceUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement and finance users can view purchase orders',
            });
        }

        const purchaseOrder = await (prisma as any).purchaseOrder.findUnique({
            where: { id: parseInt(id) },
            include: {
                creator: { select: { name: true, email: true } },
                approver: { select: { name: true, email: true } },
                request: {
                    select: {
                        reference: true,
                        title: true,
                        department: { select: { name: true } },
                    },
                },
                items: true,
            },
        });

        if (!purchaseOrder) {
            return res.status(404).json({
                error: 'Purchase order not found',
            });
        }

        res.json({
            ...purchaseOrder,
            amount: Number(purchaseOrder.amount),
        });
    } catch (error) {
        console.error('Error fetching purchase order:', error);
        res.status(500).json({
            error: 'Failed to fetch purchase order',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Create new purchase order
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { requestId, supplierName, supplierEmail, description, deliveryDate, amount, currency, items, terms, notes } = req.body;

        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        // Only procurement users can create purchase orders
        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only procurement users can create purchase orders',
            });
        }

        // Validate required fields
        if (!supplierName || !description || !amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'supplierName, description, and amount are required',
            });
        }

        // Generate PO number
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8);
        const count = await (prisma as any).purchaseOrder.count();
        const poNumber = `PO-${timestamp}-${String(count + 1).padStart(3, '0')}`;

        // Get creator details for notification
        const creator = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });

        const purchaseOrder = await (prisma as any).purchaseOrder.create({
            data: {
                poNumber,
                requestId: requestId || null,
                supplierName,
                description,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                amount,
                currency: currency || 'JMD',
                terms,
                notes,
                createdBy: userId,
                status: 'Draft',
                items: {
                    create:
                        items?.map((item: any) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            partNumber: item.partNumber,
                            unitOfMeasure: item.unitOfMeasure,
                        })) || [],
                },
            },
            include: {
                items: true,
            },
        });

        // Send notification to supplier if email provided
        if (supplierEmail) {
            await sendPOAwardNotification({
                poNumber,
                poId: purchaseOrder.id,
                supplierName,
                supplierEmail,
                description,
                amount: Number(amount),
                currency: currency || 'JMD',
                deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
                createdBy: creator?.name || 'Procurement Team',
                terms,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            purchaseOrder: {
                ...purchaseOrder,
                amount: Number(purchaseOrder.amount),
            },
        });
    } catch (error) {
        console.error('Error creating purchase order:', error);
        res.status(500).json({
            error: 'Failed to create purchase order',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Update purchase order status
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus, deliveryStatus, supplierEmail } = req.body;

        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.sub;
        const userRoles = authReq.user.roles || [];

        const userRoleInfo = checkUserRoles(userRoles);

        if (!userRoleInfo.isProcurementUser && !userRoleInfo.isFinanceUser && !userRoleInfo.isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
            });
        }

        // Get existing PO to check for supplier email
        const existingPO = await (prisma as any).purchaseOrder.findUnique({
            where: { id: parseInt(id) },
            select: {
                supplierName: true,
                description: true,
                amount: true,
                currency: true,
                deliveryDate: true,
                poNumber: true,
                terms: true,
            },
        });

        const updateData: any = {};
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;

        // If approving, set approver and approval date
        if (status === 'Approved') {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
        }

        const purchaseOrder = await (prisma as any).purchaseOrder.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        // Send notification to supplier when PO is approved
        if (status === 'Approved' && existingPO) {
            const approver = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true },
            });

            // Try to get supplier email from vendor record or from request body
            let emailToUse = supplierEmail;

            if (!emailToUse && existingPO.supplierName) {
                const vendor = await (prisma as any).vendor.findFirst({
                    where: { name: existingPO.supplierName },
                    select: { email: true, contact: true },
                });

                if (vendor?.email) {
                    emailToUse = vendor.email;
                } else if (vendor?.contact) {
                    const contact = vendor.contact as any;
                    emailToUse = contact?.email;
                }
            }

            if (emailToUse) {
                await sendPOAwardNotification({
                    poNumber: existingPO.poNumber,
                    poId: parseInt(id),
                    supplierName: existingPO.supplierName,
                    supplierEmail: emailToUse,
                    description: existingPO.description,
                    amount: Number(existingPO.amount),
                    currency: existingPO.currency,
                    deliveryDate: existingPO.deliveryDate,
                    createdBy: approver?.name || 'Procurement Team',
                    terms: existingPO.terms,
                });
            }
        }

        res.json({
            success: true,
            message: 'Purchase order updated successfully',
            purchaseOrder,
        });
    } catch (error) {
        console.error('Error updating purchase order:', error);
        res.status(500).json({
            error: 'Failed to update purchase order',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Delete purchase order
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

        await (prisma as any).purchaseOrder.delete({
            where: { id: parseInt(id) },
        });

        res.json({
            success: true,
            message: 'Purchase order deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        res.status(500).json({
            error: 'Failed to delete purchase order',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
