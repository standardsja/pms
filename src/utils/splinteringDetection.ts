/**
 * Anti-Splintering Detection System
 * Detects and prevents procurement splintering/fragmentation
 */

export interface SplinteringRule {
    id: string;
    name: string;
    description: string;
    thresholdAmount: number;
    timeWindowDays: number;
    enabled: boolean;
}

export interface SplinteringAlert {
    id: string;
    type: 'VENDOR_SPLINTERING' | 'CATEGORY_SPLINTERING' | 'DEPARTMENT_SPLINTERING' | 'DESCRIPTION_SIMILARITY';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    details: {
        totalAmount: number;
        requestCount: number;
        timeSpan: string;
        relatedRequests: any[];
        threshold: number;
        exceedsBy: number;
    };
    blockSubmission: boolean;
}

export interface ProcurementRequest {
    id?: string;
    vendorName?: string;
    category?: string;
    department?: string;
    description?: string;
    estimatedCost?: number;
    requestedDate?: string;
    requestedBy?: string;
}

// Default splintering rules
export const DEFAULT_SPLINTERING_RULES: SplinteringRule[] = [
    {
        id: 'vendor-threshold',
        name: 'Vendor Spending Threshold',
        description: 'Flags multiple requests to same vendor within time period',
        thresholdAmount: 25000, // $25K threshold
        timeWindowDays: 90,
        enabled: true,
    },
    {
        id: 'category-threshold',
        name: 'Category Spending Threshold',
        description: 'Flags multiple requests in same category within time period',
        thresholdAmount: 50000, // $50K threshold
        timeWindowDays: 180,
        enabled: true,
    },
    {
        id: 'department-threshold',
        name: 'Department Spending Threshold',
        description: 'Flags multiple similar requests from same department',
        thresholdAmount: 75000, // $75K threshold
        timeWindowDays: 365,
        enabled: true,
    },
];

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 100;

    const matrix = Array(s2.length + 1)
        .fill(null)
        .map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
        }
    }

    const maxLength = Math.max(s1.length, s2.length);
    const distance = matrix[s2.length][s1.length];
    return Math.round(((maxLength - distance) / maxLength) * 100);
}

/**
 * Check for splintering violations
 */
export async function detectSplintering(currentRequest: ProcurementRequest, existingRequests: ProcurementRequest[], rules: SplinteringRule[] = DEFAULT_SPLINTERING_RULES): Promise<SplinteringAlert[]> {
    const alerts: SplinteringAlert[] = [];
    const now = new Date();

    for (const rule of rules) {
        if (!rule.enabled) continue;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - rule.timeWindowDays);

        // Filter requests within time window
        const recentRequests = existingRequests.filter((req) => {
            const reqDate = new Date(req.requestedDate || now);
            return reqDate >= cutoffDate;
        });

        let relatedRequests: ProcurementRequest[] = [];
        let totalAmount = currentRequest.estimatedCost || 0;

        // Check different types of splintering based on rule
        switch (rule.id) {
            case 'vendor-threshold':
                if (currentRequest.vendorName) {
                    relatedRequests = recentRequests.filter((req) => req.vendorName?.toLowerCase().trim() === currentRequest.vendorName?.toLowerCase().trim());
                }
                break;

            case 'category-threshold':
                if (currentRequest.category) {
                    relatedRequests = recentRequests.filter((req) => req.category?.toLowerCase().trim() === currentRequest.category?.toLowerCase().trim());
                }
                break;

            case 'department-threshold':
                if (currentRequest.department) {
                    relatedRequests = recentRequests.filter((req) => {
                        const sameDepartment = req.department?.toLowerCase().trim() === currentRequest.department?.toLowerCase().trim();
                        const similarDescription = currentRequest.description && req.description ? calculateSimilarity(currentRequest.description, req.description) > 70 : false;
                        return sameDepartment && similarDescription;
                    });
                }
                break;
        }

        // Calculate total amount including current request
        totalAmount += relatedRequests.reduce((sum, req) => sum + (req.estimatedCost || 0), 0);

        // Check if threshold is exceeded
        if (totalAmount > rule.thresholdAmount && relatedRequests.length > 0) {
            const exceedsBy = totalAmount - rule.thresholdAmount;
            const severity: 'HIGH' | 'MEDIUM' | 'LOW' = exceedsBy > rule.thresholdAmount * 0.5 ? 'HIGH' : exceedsBy > rule.thresholdAmount * 0.2 ? 'MEDIUM' : 'LOW';

            let alertType: SplinteringAlert['type'] = 'DEPARTMENT_SPLINTERING';
            if (rule.id === 'vendor-threshold') alertType = 'VENDOR_SPLINTERING';
            else if (rule.id === 'category-threshold') alertType = 'CATEGORY_SPLINTERING';

            alerts.push({
                id: `${rule.id}-${Date.now()}`,
                type: alertType,
                severity,
                message: generateAlertMessage(rule, totalAmount, relatedRequests.length + 1, currentRequest),
                details: {
                    totalAmount,
                    requestCount: relatedRequests.length + 1,
                    timeSpan: `${rule.timeWindowDays} days`,
                    relatedRequests: relatedRequests.map((req) => ({
                        id: req.id,
                        description: req.description,
                        amount: req.estimatedCost,
                        date: req.requestedDate,
                        vendor: req.vendorName,
                    })),
                    threshold: rule.thresholdAmount,
                    exceedsBy,
                },
                blockSubmission: severity === 'HIGH' || exceedsBy > rule.thresholdAmount * 0.3,
            });
        }
    }

    return alerts;
}

/**
 * Generate human-readable alert message
 */
function generateAlertMessage(rule: SplinteringRule, totalAmount: number, requestCount: number, currentRequest: ProcurementRequest): string {
    const formattedAmount = new Intl.NumberFormat('en-JM', {
        style: 'currency',
        currency: 'JMD',
    }).format(totalAmount);

    const formattedThreshold = new Intl.NumberFormat('en-JM', {
        style: 'currency',
        currency: 'JMD',
    }).format(rule.thresholdAmount);

    switch (rule.id) {
        case 'vendor-threshold':
            return `🚨 POTENTIAL SPLINTERING DETECTED: ${requestCount} requests to vendor "${currentRequest.vendorName}" totaling ${formattedAmount} in ${rule.timeWindowDays} days exceeds the ${formattedThreshold} threshold. This may constitute procurement splintering to avoid competitive bidding requirements.`;

        case 'category-threshold':
            return `🚨 POTENTIAL SPLINTERING DETECTED: ${requestCount} requests in category "${currentRequest.category}" totaling ${formattedAmount} in ${rule.timeWindowDays} days exceeds the ${formattedThreshold} threshold. Consider consolidating these purchases for better value and compliance.`;

        case 'department-threshold':
            return `🚨 POTENTIAL SPLINTERING DETECTED: ${requestCount} similar requests from department "${currentRequest.department}" totaling ${formattedAmount} in ${rule.timeWindowDays} days exceeds the ${formattedThreshold} threshold. These purchases should be consolidated into a single procurement process.`;

        default:
            return `🚨 POTENTIAL SPLINTERING DETECTED: Multiple related requests totaling ${formattedAmount} exceed the ${formattedThreshold} threshold.`;
    }
}

/**
 * Get splintering prevention recommendations
 */
export function getSplinteringRecommendations(alerts: SplinteringAlert[]): string[] {
    const recommendations: string[] = [];

    if (alerts.length === 0) return recommendations;

    recommendations.push(
        '📋 RECOMMENDATIONS TO ADDRESS SPLINTERING:',
        '• Consolidate related purchases into a single procurement process',
        '• Conduct competitive bidding for combined requirements',
        '• Coordinate with other departments for bulk purchasing opportunities',
        '• Develop annual procurement plans to avoid fragmented purchasing',
        '• Consult with Procurement Office for guidance on proper procedures'
    );

    const highSeverityAlerts = alerts.filter((a) => a.severity === 'HIGH');
    if (highSeverityAlerts.length > 0) {
        recommendations.push(
            '',
            '⚠️ HIGH PRIORITY ACTIONS REQUIRED:',
            '• Obtain written justification for purchase separation',
            '• Secure approval from Chief Procurement Officer',
            '• Document legitimate business reasons for splitting',
            '• Consider market research to demonstrate value for money'
        );
    }

    return recommendations;
}

/**
 * Format splintering alert for display
 */
export function formatSplinteringAlert(alert: SplinteringAlert): {
    title: string;
    message: string;
    details: string;
    actions: string[];
} {
    const { details } = alert;

    return {
        title: `${alert.severity} Risk Splintering Alert`,
        message: alert.message,
        details: `
Total Amount: ${new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD' }).format(details.totalAmount)}
Request Count: ${details.requestCount}
Time Period: ${details.timeSpan}
Exceeds Threshold By: ${new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD' }).format(details.exceedsBy)}
        `.trim(),
        actions: alert.blockSubmission ? ['Contact Procurement Office', 'Provide Justification', 'Consolidate Requests'] : ['Review for Consolidation', 'Continue with Caution', 'Document Decision'],
    };
}
