/**
 * Role-Based UI Visibility Helper
 * Determines what sections should be visible based on user roles
 */

export interface RoleContext {
    isProcurementUser: boolean;
    isInnovationUser: boolean;
    isCommitteeUser: boolean;
    isEvaluationUser: boolean;
    isDepartmentHead: boolean;
    isExecutiveDirector: boolean;
    isBudgetManager: boolean;
    isRequester: boolean;
    isAdmin: boolean;
    hasMultipleRoles: boolean;
    roles?: string[]; // Added for getRoleSpecificAccess function
}

export function computeRoleContext(roles?: string[]): RoleContext {
    if (!roles || roles.length === 0) {
        return {
            isProcurementUser: false,
            isInnovationUser: false,
            isCommitteeUser: false,
            isEvaluationUser: false,
            isDepartmentHead: false,
            isExecutiveDirector: false,
            isBudgetManager: false,
            isRequester: false,
            isAdmin: false,
            hasMultipleRoles: false,
            roles: [],
        };
    }

    const roleSet = new Set(roles);

    return {
        isProcurementUser: roleSet.has('PROCUREMENT_MANAGER') || roleSet.has('PROCUREMENT_OFFICER'),
        isInnovationUser: !roleSet.has('PROCUREMENT_MANAGER') && !roleSet.has('PROCUREMENT_OFFICER') && !roleSet.has('INNOVATION_COMMITTEE'),
        isCommitteeUser: roleSet.has('INNOVATION_COMMITTEE'),
        isEvaluationUser: roleSet.has('EVALUATION_COMMITTEE'),
        isDepartmentHead: roleSet.has('DEPARTMENT_HEAD'),
        isExecutiveDirector: roleSet.has('EXECUTIVE_DIRECTOR'),
        isBudgetManager: roleSet.has('BUDGET_MANAGER'),
        isRequester: roleSet.has('REQUESTER'),
        isAdmin: roleSet.has('ADMIN') || roleSet.has('SUPER_ADMIN'),
        hasMultipleRoles: roles.length > 1,
        roles: roles,
    };
}

/**
 * Profile Page Visibility Rules
 */
export const ProfilePageVisibility = {
    // Recent Activities section
    shouldShowRecentActivities: (context: RoleContext): boolean => {
        return context.isProcurementUser || context.isDepartmentHead || context.isEvaluationUser;
    },

    // Department Access section
    shouldShowDepartmentAccess: (context: RoleContext): boolean => {
        return true; // Always show for all users
    },

    // Performance Summary section
    shouldShowPerformanceSummary: (context: RoleContext): boolean => {
        return context.isProcurementUser || context.isInnovationUser || context.isCommitteeUser;
    },

    // Quick Actions - Innovation Hub section
    shouldShowInnovationQuickActions: (context: RoleContext): boolean => {
        return context.isInnovationUser;
    },

    // Quick Actions - Committee Dashboard
    shouldShowCommitteeDashboard: (context: RoleContext): boolean => {
        return context.isCommitteeUser;
    },

    // Quick Actions - Committee Browse (limited set)
    shouldShowCommitteeBrowse: (context: RoleContext): boolean => {
        return context.isCommitteeUser;
    },

    // Quick Actions - Procurement section
    shouldShowProcurementQuickActions: (context: RoleContext): boolean => {
        return context.isProcurementUser;
    },

    // Quick Actions - Evaluation Committee
    shouldShowEvaluationActions: (context: RoleContext): boolean => {
        return context.isEvaluationUser;
    },
};

/**
 * Account Settings Page Visibility Rules
 */
export const AccountSettingsVisibility = {
    // Procurement Access & Permissions section
    shouldShowProcurementPermissions: (context: RoleContext): boolean => {
        return context.isProcurementUser || context.isDepartmentHead || context.isBudgetManager || context.isExecutiveDirector || context.isEvaluationUser;
    },

    // Procurement preference toggles
    shouldShowProcurementPreferences: (context: RoleContext): boolean => {
        return context.isProcurementUser || context.isDepartmentHead || context.isBudgetManager;
    },

    // General preferences
    shouldShowGeneralPreferences: (context: RoleContext): boolean => {
        return true; // All users see general preferences
    },

    // LDAP sync section
    shouldShowLDAPInfo: (context: RoleContext): boolean => {
        return true; // All LDAP users should see this
    },

    // Password management
    shouldShowPasswordManagement: (context: RoleContext): boolean => {
        return true; // All users can change password
    },

    // 2FA settings
    shouldShowTwoFactorAuth: (context: RoleContext): boolean => {
        return true; // All users should have option for 2FA
    },
};

/**
 * Quick Action labels based on role
 */
export const getQuickActionLabel = (context: RoleContext): string => {
    if (context.isCommitteeUser) {
        return 'Review & Approve Ideas';
    } else if (context.isProcurementUser) {
        return 'Manage Procurement';
    } else if (context.isInnovationUser) {
        return 'Share & Discover Ideas';
    } else if (context.isDepartmentHead || context.isExecutiveDirector) {
        return 'Approval & Oversight';
    }
    return 'Quick Actions';
};

/**
 * Performance summary metrics based on role
 */
export const getPerformanceMetrics = (context: RoleContext) => {
    if (context.isCommitteeUser) {
        return [
            { label: 'Ideas Under Review', key: 'ideasUnderReview' },
            { label: 'Ideas Approved', key: 'ideasApproved' },
            { label: 'Ideas Promoted', key: 'ideasPromoted' },
        ];
    } else if (context.isProcurementUser) {
        return [
            { label: 'Evaluations Completed', key: 'evaluationsCompleted' },
            { label: 'Approvals Processed', key: 'approvalsProcessed' },
            { label: 'Requests Created', key: 'requestsCreated' },
        ];
    } else if (context.isInnovationUser) {
        return [
            { label: 'Ideas Submitted', key: 'ideasSubmitted' },
            { label: 'Ideas Approved', key: 'ideasApproved' },
            { label: 'Votes Received', key: 'votesReceived' },
        ];
    }
    return [];
};

/**
 * Department Access roles display
 */
export const getRoleSpecificAccess = (context: RoleContext) => {
    const access = [];

    if (context.isCommitteeUser) {
        access.push({
            role: 'Innovation Committee',
            description: 'Review and approve submitted ideas',
            color: 'bg-orange-500',
        });
    }

    if (context.isProcurementUser) {
        if (context.roles?.includes('PROCUREMENT_MANAGER')) {
            access.push({
                role: 'Procurement Manager',
                description: 'Full procurement management access',
                color: 'bg-blue-500',
            });
        }
        if (context.roles?.includes('PROCUREMENT_OFFICER')) {
            access.push({
                role: 'Procurement Officer',
                description: 'Procurement operations and vendor management',
                color: 'bg-cyan-500',
            });
        }
    }

    if (context.isDepartmentHead) {
        access.push({
            role: 'Department Head',
            description: 'Department oversight and approval authority',
            color: 'bg-purple-500',
        });
    }

    if (context.isExecutiveDirector) {
        access.push({
            role: 'Executive Director',
            description: 'Executive-level approvals and oversight',
            color: 'bg-red-500',
        });
    }

    if (context.isEvaluationUser) {
        access.push({
            role: 'Evaluation Committee',
            description: 'Evaluate procurement quotes and proposals',
            color: 'bg-green-500',
        });
    }

    if (context.isBudgetManager) {
        access.push({
            role: 'Budget Manager',
            description: 'Budget allocation and financial oversight',
            color: 'bg-yellow-500',
        });
    }

    return access;
};
