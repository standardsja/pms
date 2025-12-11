/**
 * Centralized Role Detection Utility
 * Provides strict, prioritized role checking for all user roles
 *
 * This utility ensures consistent role detection across the application
 * and eliminates ad-hoc role matching logic scattered throughout components.
 */

/**
 * Represents detected roles for a user
 */
export interface DetectedRoles {
    // Admin roles (highest priority)
    isAdmin: boolean;
    isHeadOfDivision: boolean;

    // Executive roles
    isExecutiveDirector: boolean;
    isSeniorDirector: boolean;

    // Procurement roles
    isProcurementManager: boolean;
    isProcurementOfficer: boolean;

    // Finance roles
    isFinanceManager: boolean;
    isBudgetManager: boolean;
    isFinanceOfficer: boolean;
    isFinancePaymentStage: boolean;

    // Department roles
    isDepartmentHead: boolean;
    isDepartmentManager: boolean;

    // Committee roles
    isInnovationCommittee: boolean;
    isEvaluationCommittee: boolean;

    // Support roles
    isAuditor: boolean;
    isSupplier: boolean;
    isRequester: boolean;

    // Primary role (highest priority match)
    primaryRole: string;

    // All roles
    allRoles: string[];
}

/**
 * Detects and normalizes user roles
 * @param userRoles Array of role names from user (can be strings or objects with 'name' property)
 * @returns Normalized role detection object
 */
export function detectUserRoles(userRoles: (string | { name: string } | any)[] = []): DetectedRoles {
    // Normalize all role names to uppercase for comparison
    // Handle both string arrays and objects with 'name' property
    const normalizedRoles = userRoles
        .map((r) => {
            if (!r) return '';
            if (typeof r === 'string') return r.toUpperCase();
            if (typeof r === 'object' && r.name) return r.name.toUpperCase();
            return '';
        })
        .filter(Boolean); // Remove empty strings

    // Helper function for role matching
    const hasRole = (roleNames: string | string[]): boolean => {
        const names = Array.isArray(roleNames) ? roleNames : [roleNames];
        return names.some((name) => normalizedRoles.includes(name));
    };

    // Helper function for contains matching
    const containsAll = (terms: string[]): boolean => {
        return normalizedRoles.some((role) => terms.every((term) => role.includes(term)));
    };

    // Helper function for contains any matching
    const containsAny = (terms: string[]): boolean => {
        return normalizedRoles.some((role) => terms.some((term) => role.includes(term)));
    };

    // Detect each role category (in priority order)

    // 1. ADMIN ROLES (highest priority)
    const isAdmin = hasRole(['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN']);
    const isHeadOfDivision = hasRole(['HEAD_OF_DIVISION', 'HOD', 'HEAD_OF_DEPARTMENT']) || hasRole('ADMIN');

    // 2. EXECUTIVE ROLES
    const isExecutiveDirector = hasRole('EXECUTIVE_DIRECTOR');
    const isSeniorDirector = hasRole('SENIOR_DIRECTOR');

    // 3. PROCUREMENT ROLES (must be specific to procurement, not generic MANAGER)
    const isProcurementManager = containsAll(['PROCUREMENT', 'MANAGER']) || hasRole('PROCUREMENT_MANAGER');
    const isProcurementOfficer = hasRole(['PROCUREMENT_OFFICER', 'PROCUREMENT']) && !isProcurementManager;

    // 4. FINANCE ROLES (must check before generic MANAGER keywords)
    const isBudgetManager = hasRole('BUDGET_MANAGER') || (containsAll(['BUDGET', 'MANAGER']) && !isProcurementManager);
    const isFinanceManager =
        hasRole('FINANCE_MANAGER') || (containsAll(['FINANCE', 'MANAGER']) && !isProcurementManager && !isBudgetManager);

    // Treat generic 'FINANCE' role as a Finance Officer for compatibility with legacy role names
    const isFinanceOfficer = hasRole(['FINANCE_OFFICER', 'FINANCE']) && !isFinanceManager && !isBudgetManager;
    const isFinancePaymentStage = hasRole('FINANCE_PAYMENT_STAGE') && !isFinanceManager && !isBudgetManager && !isFinanceOfficer;

    // 5. DEPARTMENT ROLES
    const isDepartmentHead = hasRole('DEPARTMENT_HEAD') && !isAdmin && !isHeadOfDivision && !isExecutiveDirector;
    const isDepartmentManager =
        !isProcurementManager && !isFinanceManager && (hasRole(['DEPT_MANAGER', 'DEPARTMENT_MANAGER']) || (hasRole('MANAGER') && !containsAny(['PROCUREMENT', 'FINANCE', 'BUDGET'])));
    // Also treat compound role names that include both department and procurement keywords
    // e.g. 'PROCUREMENT_DEPT_MANAGER', 'DEPT_MANAGER_PROCUREMENT', etc.
    const isCompoundDeptProcurement = normalizedRoles.some((role) => {
        return (role.includes('DEPT') || role.includes('DEPARTMENT')) && role.includes('PROCUREMENT');
    });

    const finalIsDepartmentManager = isDepartmentManager || isCompoundDeptProcurement;

    // 6. COMMITTEE ROLES
    const isInnovationCommittee = hasRole('INNOVATION_COMMITTEE');
    const isEvaluationCommittee = hasRole('EVALUATION_COMMITTEE');

    // 7. SUPPORT ROLES
    const isAuditor = hasRole('AUDITOR');
    const isSupplier = hasRole('SUPPLIER') || containsAny(['SUPPLIER']);
    const isRequester = hasRole('REQUESTER') || (containsAny(['REQUEST']) && !isProcurementManager && !isProcurementOfficer && !isFinanceManager && !isDepartmentManager && !isAuditor);

    // Determine primary role (in priority order for dashboard routing)
    let primaryRole = 'REQUESTER'; // default

    if (isAdmin || isHeadOfDivision) {
        primaryRole = 'ADMIN';
    } else if (isEvaluationCommittee) {
        primaryRole = 'EVALUATION_COMMITTEE';
    } else if (isInnovationCommittee) {
        primaryRole = 'INNOVATION_COMMITTEE';
    } else if (isExecutiveDirector) {
        primaryRole = 'EXECUTIVE_DIRECTOR';
    } else if (isSeniorDirector) {
        primaryRole = 'SENIOR_DIRECTOR';
    } else if (isDepartmentHead) {
        primaryRole = 'DEPARTMENT_HEAD';
    } else if (isAuditor) {
        primaryRole = 'AUDITOR';
    } else if (isFinancePaymentStage) {
        primaryRole = 'FINANCE_PAYMENT_STAGE';
    } else if (isBudgetManager) {
        primaryRole = 'BUDGET_MANAGER';
    } else if (isFinanceManager) {
        primaryRole = 'FINANCE_MANAGER';
    } else if (isFinanceOfficer) {
        primaryRole = 'FINANCE_OFFICER';
    } else if (isProcurementManager) {
        primaryRole = 'PROCUREMENT_MANAGER';
    } else if (isProcurementOfficer) {
        primaryRole = 'PROCUREMENT_OFFICER';
    } else if (isDepartmentManager) {
        primaryRole = 'DEPARTMENT_MANAGER';
    } else if (isSupplier) {
        primaryRole = 'SUPPLIER';
    }

    return {
        isAdmin,
        isHeadOfDivision,
        isExecutiveDirector,
        isSeniorDirector,
        isProcurementManager,
        isProcurementOfficer,
        isFinanceManager,
        isBudgetManager,
        isFinanceOfficer,
        isFinancePaymentStage,
        isDepartmentHead,
        isDepartmentManager,
        isInnovationCommittee,
        isEvaluationCommittee,
        isAuditor,
        isSupplier,
        isRequester,
        primaryRole,
        allRoles: userRoles,
    };
}

/**
 * Gets the dashboard path for a user based on their detected roles
 * @param roles Detected roles object from detectUserRoles()
 * @param currentPathname Current location pathname
 * @returns Dashboard path to navigate to
 */
export function getDashboardPath(roles: DetectedRoles, currentPathname: string = ''): string {
    const isInnovationHub = currentPathname.startsWith('/innovation');

    // Priority order for dashboard routing
    if (roles.isAdmin) {
        return '/procurement/admin';
    }
    if (roles.isHeadOfDivision) {
        return '/procurement/hod';
    }
    if (roles.isEvaluationCommittee) {
        return '/evaluation/committee/dashboard';
    }
    if (roles.isInnovationCommittee) {
        return '/innovation/committee/dashboard';
    }
    if (isInnovationHub) {
        return '/innovation/dashboard';
    }
    if (roles.isExecutiveDirector) {
        return '/executive/dashboard';
    }
    if (roles.isSeniorDirector) {
        return '/director/dashboard';
    }
    if (roles.isDepartmentHead) {
        return '/department-head/dashboard';
    }
    if (roles.isAuditor) {
        return '/audit/dashboard';
    }
    if (roles.isFinancePaymentStage) {
        return '/payments/dashboard';
    }
    if (roles.isBudgetManager) {
        return '/finance';
    }
    if (roles.isFinanceManager) {
        return '/finance';
    }
    if (roles.isFinanceOfficer) {
        return '/procurement/dashboard/finance-officer';
    }
    if (roles.isProcurementManager) {
        return '/procurement/manager';
    }
    if (roles.isProcurementOfficer) {
        return '/procurement/dashboard';
    }
    if (roles.isDepartmentManager) {
        return '/apps/requests/pending-approval';
    }
    if (roles.isSupplier) {
        return '/supplier';
    }

    // Default to requester
    return '/apps/requests';
}

/**
 * Gets sidebar label for a user based on their primary role
 * @param roles Detected roles object
 * @returns Human-readable role label
 */
export function getRoleLabel(roles: DetectedRoles): string {
    if (roles.isAdmin || roles.isHeadOfDivision) {
        return 'Administrator';
    }
    if (roles.isExecutiveDirector) {
        return 'Executive Director';
    }
    if (roles.isSeniorDirector) {
        return 'Senior Director';
    }
    if (roles.isDepartmentHead) {
        return 'Department Head';
    }
    if (roles.isAuditor) {
        return 'Auditor';
    }
    if (roles.isFinancePaymentStage) {
        return 'Finance - Payment Stage';
    }
    if (roles.isFinanceManager) {
        return 'Finance Manager';
    }
    if (roles.isFinanceOfficer) {
        return 'Finance Officer';
    }
    if (roles.isProcurementManager) {
        return 'Procurement Manager';
    }
    if (roles.isProcurementOfficer) {
        return 'Procurement Officer';
    }
    if (roles.isDepartmentManager) {
        return 'Department Manager';
    }
    if (roles.isInnovationCommittee) {
        return 'Innovation Committee';
    }
    if (roles.isEvaluationCommittee) {
        return 'Evaluation Committee';
    }
    if (roles.isSupplier) {
        return 'Supplier';
    }

    return 'Requester';
}
