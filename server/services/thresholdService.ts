import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Procurement threshold service for determining approval workflows
 */

export interface ThresholdResult {
    requiresExecutiveApproval: boolean;
    thresholdAmount: number;
    reason: string;
    category: 'works' | 'goods_services' | 'other';
}

/**
 * Check if a request requires Executive Director approval based on value thresholds
 */
export function checkProcurementThresholds(totalValue: number, procurementTypes: string[], currency: string = 'USD'): ThresholdResult {
    // Convert all types to lowercase for comparison
    const types = procurementTypes.map((type) => type.toLowerCase());

    // Define threshold amounts (in USD)
    const WORKS_THRESHOLD = 5000000; // $5M
    const GOODS_SERVICES_THRESHOLD = 3000000; // $3M

    // Determine category and applicable threshold
    const isWorks = types.includes('works') || types.includes('construction') || types.includes('infrastructure');
    const isGoodsOrServices = types.some((type) => ['goods', 'services', 'consulting', 'supplies', 'equipment', 'materials'].includes(type));

    let category: 'works' | 'goods_services' | 'other';
    let thresholdAmount: number;
    let reason: string;

    if (isWorks) {
        category = 'works';
        thresholdAmount = WORKS_THRESHOLD;
        reason = `Works procurement over ${currency} ${WORKS_THRESHOLD.toLocaleString()}`;
    } else if (isGoodsOrServices) {
        category = 'goods_services';
        thresholdAmount = GOODS_SERVICES_THRESHOLD;
        reason = `Goods/Services procurement over ${currency} ${GOODS_SERVICES_THRESHOLD.toLocaleString()}`;
    } else {
        category = 'other';
        thresholdAmount = GOODS_SERVICES_THRESHOLD; // Default to goods/services threshold
        reason = `High-value procurement over ${currency} ${GOODS_SERVICES_THRESHOLD.toLocaleString()}`;
    }

    const requiresExecutiveApproval = totalValue >= thresholdAmount;

    return {
        requiresExecutiveApproval,
        thresholdAmount,
        reason: requiresExecutiveApproval ? reason : 'Below executive approval threshold',
        category,
    };
}

/**
 * Get the next approver in the workflow based on current status and threshold requirements
 */
export async function getNextApprover(requestId: number, currentStatus: string, thresholdResult: ThresholdResult): Promise<{ nextStatus: string; nextAssigneeId: number | null; comment: string }> {
    const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { department: true },
    });

    if (!request) {
        throw new Error('Request not found');
    }

    let nextStatus = currentStatus;
    let nextAssigneeId: number | null = null;
    let comment = '';

    if (currentStatus === 'DEPARTMENT_REVIEW' && thresholdResult.requiresExecutiveApproval) {
        // High-value requests go directly to Executive Director
        const executiveDirector = await prisma.user.findFirst({
            where: {
                roles: {
                    some: {
                        role: { name: 'EXECUTIVE_DIRECTOR' },
                    },
                },
            },
        });

        nextStatus = 'EXECUTIVE_REVIEW';
        nextAssigneeId = executiveDirector?.id || null;
        comment = `High-value ${thresholdResult.category.replace('_', '/')} request requires Executive Director approval`;
    } else if (currentStatus === 'DEPARTMENT_REVIEW') {
        // Normal flow - to HOD
        const hod = await prisma.user.findFirst({
            where: {
                departmentId: request.departmentId,
                roles: { some: { role: { name: 'HEAD_OF_DIVISION' } } },
            },
        });

        nextStatus = 'HOD_REVIEW';
        nextAssigneeId = hod?.id || null;
        comment = 'Forwarded to Head of Division for review';
    } else if (currentStatus === 'EXECUTIVE_REVIEW') {
        // Executive approved - go to Finance
        const financeOfficer = await prisma.user.findFirst({
            where: { roles: { some: { role: { name: 'FINANCE' } } } },
        });

        nextStatus = 'FINANCE_REVIEW';
        nextAssigneeId = financeOfficer?.id || null;
        comment = 'Executive Director approved - forwarded to Finance for review';
    }

    return { nextStatus, nextAssigneeId, comment };
}

/**
 * Log threshold decision for audit purposes
 */
export async function logThresholdDecision(requestId: number, userId: number, thresholdResult: ThresholdResult, totalValue: number, currency: string): Promise<void> {
    const action = thresholdResult.requiresExecutiveApproval ? 'THRESHOLD_EXECUTIVE' : 'THRESHOLD_NORMAL';
    const comment = `Threshold Analysis: ${currency} ${totalValue.toLocaleString()} - ${thresholdResult.reason}`;

    await prisma.requestAction.create({
        data: {
            requestId,
            performedById: userId,
            action: 'COMMENT',
            comment,
            metadata: {
                thresholdCheck: true,
                requiresExecutive: thresholdResult.requiresExecutiveApproval,
                category: thresholdResult.category,
                thresholdAmount: thresholdResult.thresholdAmount,
                requestValue: totalValue,
                currency,
            },
        },
    });
}
