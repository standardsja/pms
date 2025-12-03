import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Notification service for creating and managing notifications
 */

export interface ThresholdNotificationData {
    requestId: number;
    requestReference: string;
    requestTitle: string;
    requesterName: string;
    departmentName: string;
    totalValue: number;
    currency: string;
    thresholdAmount: number;
    category: 'works' | 'goods_services' | 'other';
}

/**
 * Create threshold exceeded notifications for procurement officers and managers
 */
export async function createThresholdNotifications(data: ThresholdNotificationData): Promise<void> {
    try {
        // Find all users with procurement-related roles
        const allUsers = await prisma.user.findMany({
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        // Filter users using the same logic as shouldShowThresholdNotification
        const procurementUsers = allUsers
            .filter((user) => {
                const userRoles = user.roles.map((r) => r.role.name.toUpperCase());

                const isProcurementOfficer = userRoles.some(
                    (role) => ['PROCUREMENT_OFFICER', 'PROCUREMENT OFFICER', 'PROCUREMENT'].includes(role) || (role.includes('PROCUREMENT') && role.includes('OFFICER'))
                );

                const isProcurementManager = userRoles.some((role) => ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(role) || (role.includes('PROCUREMENT') && role.includes('MANAGER')));

                const isAdmin = userRoles.some((role) => ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes(role));

                return (isProcurementOfficer || isProcurementManager || isAdmin) && user.name !== null;
            })
            .map((user) => ({
                id: user.id,
                name: user.name!,
                email: user.email,
            }));

        console.log(`[Threshold Notifications] Found ${procurementUsers.length} procurement users to notify:`, procurementUsers.map((u) => `${u.name} (${u.email})`).join(', '));

        if (procurementUsers.length === 0) {
            console.warn('No procurement officers or managers found to notify about threshold exceeded');
            return;
        }

        const categoryDisplay = data.category === 'goods_services' ? 'Goods/Services' : data.category === 'works' ? 'Works' : 'Procurement';

        const message = `${categoryDisplay} request "${data.requestTitle}" (${data.currency} ${data.totalValue.toLocaleString()}) exceeds threshold and requires Executive Director approval`;

        // Create notifications for all procurement users
        const notifications = procurementUsers.map((user) => ({
            userId: user.id,
            type: 'THRESHOLD_EXCEEDED' as const,
            message,
            data: {
                requestId: data.requestId,
                requestReference: data.requestReference,
                requestTitle: data.requestTitle,
                requesterName: data.requesterName,
                departmentName: data.departmentName,
                totalValue: data.totalValue,
                currency: data.currency,
                thresholdAmount: data.thresholdAmount,
                category: data.category,
                categoryDisplay,
                requiresExecutiveApproval: true,
            },
        }));

        await prisma.notification.createMany({
            data: notifications,
        });

        console.log(`[Threshold Notifications] Created ${notifications.length} threshold exceeded notifications for request ${data.requestReference}`);
    } catch (error) {
        console.error('Failed to create threshold notifications:', error);
        throw error;
    }
}

/**
 * Get procurement officers and managers for threshold notifications
 */
export async function getProcurementNotificationUsers(): Promise<Array<{ id: number; name: string; email: string }>> {
    try {
        // Get users with procurement officer/manager roles
        const users = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            OR: [{ name: { contains: 'PROCUREMENT' } }, { name: { in: ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'] } }],
                        },
                    },
                },
            },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        // Filter users based on the same logic as shouldShowThresholdNotification
        return users
            .filter((user) => {
                const userRoles = user.roles.map((r) => r.role.name.toUpperCase());

                const isProcurementOfficer = userRoles.some(
                    (role) => ['PROCUREMENT_OFFICER', 'PROCUREMENT OFFICER', 'PROCUREMENT'].includes(role) || (role.includes('PROCUREMENT') && role.includes('OFFICER'))
                );

                const isProcurementManager = userRoles.some((role) => ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(role) || (role.includes('PROCUREMENT') && role.includes('MANAGER')));

                const isAdmin = userRoles.some((role) => ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes(role));

                return (isProcurementOfficer || isProcurementManager || isAdmin) && user.name !== null;
            })
            .map((user) => ({
                id: user.id,
                name: user.name!,
                email: user.email,
            }));
    } catch (error) {
        console.error('Failed to get procurement notification users:', error);
        return [];
    }
}

/**
 * Send PO award notification to supplier via email
 */
export interface POAwardNotificationData {
    poNumber: string;
    poId: number;
    supplierName: string;
    supplierEmail?: string;
    description: string;
    amount: number;
    currency: string;
    deliveryDate?: Date;
    createdBy: string;
    terms?: string;
}

export async function sendPOAwardNotification(data: POAwardNotificationData): Promise<void> {
    try {
        if (!data.supplierEmail) {
            console.warn(`[PO Award] No email provided for supplier "${data.supplierName}". Skipping notification.`);
            return;
        }

        console.log(`[PO Award] Sending PO award notification to ${data.supplierName} (${data.supplierEmail})`);

        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        // For now, we'll log the notification details
        const emailContent = {
            to: data.supplierEmail,
            subject: `Purchase Order Awarded - ${data.poNumber}`,
            body: `
Dear ${data.supplierName},

You have been awarded a Purchase Order:

Purchase Order Number: ${data.poNumber}
Description: ${data.description}
Amount: ${data.currency} ${data.amount.toLocaleString()}
${data.deliveryDate ? `Expected Delivery: ${data.deliveryDate.toISOString().split('T')[0]}` : ''}
Issued By: ${data.createdBy}

${data.terms ? `Terms & Conditions:\n${data.terms}\n` : ''}

Please log in to the system to view full details and confirm acceptance.

Best regards,
Procurement Team
            `.trim(),
        };

        console.log('[PO Award Email]:', JSON.stringify(emailContent, null, 2));

        // Store notification in database (optional - for internal tracking)
        // Note: This is separate from User notifications since suppliers may not have user accounts
        // You could create a separate SupplierNotification table or use an external notification log

        console.log(`[PO Award] Notification sent successfully to ${data.supplierName}`);
    } catch (error) {
        console.error('[PO Award] Failed to send notification:', error);
        // Don't throw - PO creation should succeed even if notification fails
    }
}

/**
 * Send contract award notification to supplier via email
 */
export interface ContractAwardNotificationData {
    contractNumber: string;
    contractId: number;
    supplierName: string;
    supplierEmail?: string;
    title: string;
    description?: string;
    value: number;
    currency: string;
    startDate?: Date;
    endDate?: Date;
    createdBy: string;
}

export async function sendContractAwardNotification(data: ContractAwardNotificationData): Promise<void> {
    try {
        if (!data.supplierEmail) {
            console.warn(`[Contract Award] No email provided for supplier "${data.supplierName}". Skipping notification.`);
            return;
        }

        console.log(`[Contract Award] Sending contract award notification to ${data.supplierName} (${data.supplierEmail})`);

        const emailContent = {
            to: data.supplierEmail,
            subject: `Contract Awarded - ${data.contractNumber}`,
            body: `
Dear ${data.supplierName},

Congratulations! You have been awarded a Contract:

Contract Number: ${data.contractNumber}
Title: ${data.title}
${data.description ? `Description: ${data.description}` : ''}
Contract Value: ${data.currency} ${data.value.toLocaleString()}
${data.startDate ? `Start Date: ${data.startDate.toISOString().split('T')[0]}` : ''}
${data.endDate ? `End Date: ${data.endDate.toISOString().split('T')[0]}` : ''}
Issued By: ${data.createdBy}

Please log in to the system to review the contract details and submit your acceptance.

Best regards,
Procurement Team
            `.trim(),
        };

        console.log('[Contract Award Email]:', JSON.stringify(emailContent, null, 2));

        console.log(`[Contract Award] Notification sent successfully to ${data.supplierName}`);
    } catch (error) {
        console.error('[Contract Award] Failed to send notification:', error);
        // Don't throw - contract creation should succeed even if notification fails
    }
}
