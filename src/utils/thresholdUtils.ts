/**
 * Utility functions for checking procurement thresholds and generating notifications
 */

export interface ThresholdAlert {
    isRequired: boolean;
    message: string;
    level: 'warning' | 'error' | 'info';
    thresholdType: 'goods_services' | 'works' | 'none';
    amount: number;
    threshold: number;
}

/**
 * Check if a request requires Executive Director approval based on procurement thresholds
 */
export function checkExecutiveThreshold(totalEstimated: number | string, procurementTypes: string[] = [], currency: string = 'JMD'): ThresholdAlert {
    // Convert total to number
    const amount = typeof totalEstimated === 'string' ? parseFloat(totalEstimated) || 0 : totalEstimated || 0;

    // Normalize procurement types
    const types = procurementTypes.map((type) => type.toLowerCase().trim());

    // Define thresholds (in JMD)
    const GOODS_SERVICES_THRESHOLD = 3000000; // 3M JMD
    const WORKS_THRESHOLD = 5000000; // 5M JMD

    // Determine category and check threshold - prioritize works over goods/services
    const isWorks = types.some((type) => ['works', 'construction', 'infrastructure', 'building'].includes(type));

    const isGoodsOrServices = types.some((type) => ['goods', 'services', 'consulting service', 'non-consulting service', 'supplies', 'equipment'].includes(type));

    // Check works first (higher threshold takes precedence in mixed scenarios)
    if (isWorks) {
        if (amount >= WORKS_THRESHOLD) {
            return {
                isRequired: true,
                message: `⚠️ EXECUTIVE DIRECTOR APPROVAL REQUIRED: Works procurement (${currency} ${amount.toLocaleString()}) exceeds ${currency} ${WORKS_THRESHOLD.toLocaleString()} threshold`,
                level: 'warning',
                thresholdType: 'works',
                amount,
                threshold: WORKS_THRESHOLD,
            };
        }
        // Works under threshold don't require approval, regardless of other types
        return {
            isRequired: false,
            message: 'Standard procurement workflow applies',
            level: 'info',
            thresholdType: 'none',
            amount,
            threshold: 0,
        };
    }

    if (isGoodsOrServices && amount >= GOODS_SERVICES_THRESHOLD) {
        return {
            isRequired: true,
            message: `⚠️ EXECUTIVE DIRECTOR APPROVAL REQUIRED: Goods/Services procurement (${currency} ${amount.toLocaleString()}) exceeds ${currency} ${GOODS_SERVICES_THRESHOLD.toLocaleString()} threshold`,
            level: 'warning',
            thresholdType: 'goods_services',
            amount,
            threshold: GOODS_SERVICES_THRESHOLD,
        };
    }

    return {
        isRequired: false,
        message: 'Standard procurement workflow applies',
        level: 'info',
        thresholdType: 'none',
        amount,
        threshold: 0,
    };
}

/**
 * Generate notification badge component for threshold alerts
 */
export function getThresholdBadge(alert: ThresholdAlert): {
    show: boolean;
    className: string;
    text: string;
    icon: string;
} {
    if (!alert.isRequired) {
        return {
            show: false,
            className: '',
            text: '',
            icon: '',
        };
    }

    return {
        show: true,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        text: 'Executive Approval Required',
        icon: '⚠️',
    };
}

/**
 * Check if user should see threshold notifications (procurement officers/managers)
 */
export function shouldShowThresholdNotification(userRoles: string[] = []): boolean {
    const roles = (userRoles || []).filter(Boolean).map((role) => String(role).toUpperCase());

    // If any role mentions PROCUREMENT, show notification
    if (roles.some((r) => r.includes('PROCUREMENT'))) return true;

    // Administrators and generic managers should also see threshold notifications
    if (roles.some((r) => r === 'ADMIN' || r === 'ADMINISTRATOR' || r === 'SUPER_ADMIN')) return true;

    // Any role containing MANAGER (e.g., MANAGER, PROCUREMENT_MANAGER) should be included
    if (roles.some((r) => r.includes('MANAGER'))) return true;

    return false;
}
