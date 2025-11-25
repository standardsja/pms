/**
 * Request Combining Utility
 * Provides functionality to combine multiple procurement requests into a consolidated request
 */

import { Request } from '../types/request.types';

export interface CombinableRequest {
    id: number;
    reference: string;
    title: string;
    description?: string;
    department: string;
    requestedBy: string;
    totalEstimated: number;
    currency: string;
    priority: string;
    status: string;
    createdAt: string;
    items: Array<{
        description: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
    }>;
}

export interface CombineRequestsConfig {
    combinedTitle: string;
    combinedDescription: string;
    retainOriginalReferences: boolean;
    consolidateItems: boolean;
    newPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    targetDepartment: string;
    justification: string;
}

export interface CombineValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
}

export interface CombinePreview {
    combinedRequest: any;
    totalValue: number;
    itemCount: number;
    departmentCount: number;
    originalReferences: string[];
    estimatedSavings?: number;
}

/**
 * Validate if requests can be safely combined
 */
export function validateRequestCombination(requests: CombinableRequest[]): CombineValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Minimum validation
    if (requests.length < 2) {
        errors.push('At least 2 requests must be selected for combination');
        return { isValid: false, errors, warnings, recommendations };
    }

    if (requests.length > 10) {
        warnings.push('Combining more than 10 requests may be complex to manage');
    }

    // Status validation
    const invalidStatuses = ['CLOSED', 'REJECTED', 'SENT_TO_VENDOR'];
    const hasInvalidStatus = requests.some((req) => invalidStatuses.includes(req.status));
    if (hasInvalidStatus) {
        errors.push('Cannot combine requests that are closed, rejected, or already sent to vendor');
    }

    // Currency consistency
    const currencies = [...new Set(requests.map((req) => req.currency || 'USD').filter(Boolean))];
    if (currencies.length > 1) {
        warnings.push(`Multiple currencies detected: ${currencies.join(', ')}. Consider currency conversion.`);
    }

    // Department analysis
    const departments = [...new Set(requests.map((req) => req.department || 'Unknown').filter(Boolean))];
    if (departments.length > 1) {
        warnings.push(`Requests from ${departments.length} different departments. Ensure proper authorization.`);
        recommendations.push('Consider cross-departmental approval process');
    }

    // Priority analysis
    const priorities = [...new Set(requests.map((req) => req.priority || 'MEDIUM').filter(Boolean))];
    if (priorities.includes('URGENT') && priorities.includes('LOW')) {
        warnings.push('Mixing urgent and low priority requests may delay urgent items');
        recommendations.push('Consider keeping urgent requests separate');
    }

    // Value threshold analysis
    const totalValue = requests.reduce((sum, req) => sum + (req.totalEstimated || 0), 0);
    if (totalValue > 50000) {
        recommendations.push('Combined request exceeds $50K threshold - special procurement procedures may apply');
    }

    // Item similarity analysis
    const allItems = requests
        .flatMap((req) => {
            // Handle cases where items might be undefined or null
            if (!req.items || !Array.isArray(req.items)) {
                return [];
            }
            return req.items.map((item) => item.description?.toLowerCase() || '');
        })
        .filter((description) => description.length > 0);

    const uniqueItems = new Set(allItems);
    const similarityRatio = allItems.length > 0 ? uniqueItems.size / allItems.length : 1;

    if (similarityRatio < 0.7 && allItems.length > 0) {
        recommendations.push('Many similar items detected - consider consolidating quantities');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        recommendations,
    };
}

/**
 * Generate a preview of the combined request
 */
export function generateCombinePreview(requests: CombinableRequest[], config: CombineRequestsConfig): CombinePreview {
    const totalValue = requests.reduce((sum, req) => sum + (req.totalEstimated || 0), 0);
    const allItems = requests.flatMap((req) => {
        if (!req.items || !Array.isArray(req.items)) {
            return [];
        }
        return req.items;
    });
    const departments = [...new Set(requests.map((req) => req.department || 'Unknown').filter(Boolean))];
    const originalReferences = requests.map((req) => req.reference);

    // Estimate potential savings from bulk purchasing
    let estimatedSavings = 0;
    if (requests.length >= 3) {
        estimatedSavings = totalValue * 0.05; // 5% bulk discount estimate
    }

    const combinedRequest: any = {
        title: config.combinedTitle,
        description: `${config.combinedDescription}\n\nOriginal Requests: ${originalReferences.join(', ')}\n\nJustification: ${config.justification}`,
        totalEstimated: totalValue,
        currency: requests[0]?.currency || 'USD',
        priority: config.newPriority,
        department: config.targetDepartment,
        // Items will be processed separately
    };

    return {
        combinedRequest,
        totalValue,
        itemCount: allItems.length,
        departmentCount: departments.length,
        originalReferences,
        estimatedSavings,
    };
}

/**
 * Consolidate similar items to reduce redundancy
 */
export function consolidateItems(requests: CombinableRequest[]): Array<{
    description: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    originalRequests: string[];
}> {
    const itemMap = new Map();

    requests.forEach((request) => {
        // Handle cases where items might be undefined or null
        if (!request.items || !Array.isArray(request.items)) {
            return;
        }

        request.items.forEach((item) => {
            // Skip items with missing required data
            if (!item.description || typeof item.quantity !== 'number' || typeof item.unitCost !== 'number') {
                return;
            }

            const key = item.description.toLowerCase().trim();

            if (itemMap.has(key)) {
                const existing = itemMap.get(key);
                existing.quantity += item.quantity;
                existing.totalCost += item.totalCost || item.quantity * item.unitCost;
                existing.originalRequests.push(request.reference);
                // Use weighted average for unit cost
                existing.unitCost = existing.totalCost / existing.quantity;
            } else {
                itemMap.set(key, {
                    description: item.description,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    totalCost: item.totalCost || item.quantity * item.unitCost,
                    originalRequests: [request.reference],
                });
            }
        });
    });

    return Array.from(itemMap.values());
}

/**
 * Generate audit trail for request combination
 */
export function generateCombineAuditTrail(
    requests: CombinableRequest[],
    config: CombineRequestsConfig,
    userId: number,
    userName: string
): {
    action: string;
    details: Record<string, any>;
    timestamp: string;
} {
    return {
        action: 'REQUESTS_COMBINED',
        details: {
            combinedBy: { id: userId, name: userName },
            originalRequests: requests.map((req) => ({
                id: req.id,
                reference: req.reference,
                title: req.title,
                totalEstimated: req.totalEstimated,
            })),
            combinationConfig: config,
            totalValue: requests.reduce((sum, req) => sum + req.totalEstimated, 0),
            itemCount: requests.reduce((sum, req) => sum + req.items.length, 0),
        },
        timestamp: new Date().toISOString(),
    };
}

/**
 * Check if user has permission to combine specific requests
 */
export function checkCombinePermissions(
    userRoles: string[],
    userDepartment: string,
    requests: CombinableRequest[]
): {
    canCombine: boolean;
    requiresApproval: boolean;
    reasons: string[];
} {
    const reasons: string[] = [];
    let canCombine = false;
    let requiresApproval = false;

    // Only allow procurement officers, procurement managers, and admins to combine requests
    const isProcurementOfficer = userRoles.some((role) => {
        const roleUpper = role.toUpperCase();
        return ['PROCUREMENT_OFFICER', 'PROCUREMENT OFFICER', 'PROCUREMENT'].includes(roleUpper) || (roleUpper.includes('PROCUREMENT') && roleUpper.includes('OFFICER'));
    });

    const isProcurementManager = userRoles.some((role) => {
        const roleUpper = role.toUpperCase();
        return ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(roleUpper) || (roleUpper.includes('PROCUREMENT') && roleUpper.includes('MANAGER'));
    });

    const isAdmin = userRoles.some((role) => {
        const roleUpper = role.toUpperCase();
        return ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes(roleUpper);
    });

    if (isProcurementOfficer || isProcurementManager || isAdmin) {
        canCombine = true;
    } else {
        reasons.push('Only procurement officers, procurement managers, and administrators can combine requests');
    }

    // Cross-department combinations require approval
    const departments = [...new Set(requests.map((req) => req.department))];
    if (departments.length > 1) {
        requiresApproval = true;
        reasons.push('Cross-department combinations require additional approval');
    }

    // High-value combinations require approval
    const totalValue = requests.reduce((sum, req) => sum + req.totalEstimated, 0);
    if (totalValue > 25000) {
        requiresApproval = true;
        reasons.push('High-value combinations (>$25K) require additional approval');
    }

    if (!canCombine) {
        reasons.push('User does not have permission to combine requests');
    }

    return { canCombine, requiresApproval, reasons };
}

/**
 * Format combination summary for notifications/alerts
 */
export function formatCombineSummary(requests: CombinableRequest[], preview: CombinePreview): string {
    const requestCount = requests.length;
    const totalValue = preview.totalValue;
    const departments = preview.departmentCount;
    const savings = preview.estimatedSavings || 0;

    let summary = `📋 REQUEST COMBINATION SUMMARY\n\n`;
    summary += `• Combining ${requestCount} requests\n`;
    summary += `• Total Value: $${(totalValue || 0).toLocaleString()}\n`;
    summary += `• ${preview.itemCount} items across ${departments} department${departments > 1 ? 's' : ''}\n`;

    if (savings > 0) {
        summary += `• Estimated Savings: $${(savings || 0).toLocaleString()}\n`;
    }

    summary += `\nOriginal Requests:\n`;
    requests.forEach((req) => {
        summary += `  - ${req.reference}: ${req.title} ($${(req.totalEstimated || 0).toLocaleString()})\n`;
    });

    return summary;
}

/**
 * Default configuration for request combination
 */
export const DEFAULT_COMBINE_CONFIG: Partial<CombineRequestsConfig> = {
    retainOriginalReferences: true,
    consolidateItems: true,
    newPriority: 'MEDIUM',
};
