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

                return isProcurementOfficer || isProcurementManager || isAdmin;
            })
            .map((user) => ({
                id: user.id,
                name: user.name,
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

                return isProcurementOfficer || isProcurementManager || isAdmin;
            })
            .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
            }));
    } catch (error) {
        console.error('Failed to get procurement notification users:', error);
        return [];
    }
}
