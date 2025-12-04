/**
 * Utility functions for role-based access control
 */

export interface UserRoleChecker {
    isAdmin: boolean;
    isProcurementUser: boolean;
    isProcurementOfficer: boolean;
    isProcurementManager: boolean;
    isDepartmentHead: boolean;
    isFinanceUser: boolean;
    isExecutiveDirector: boolean;
    isCommitteeMember: boolean;
    canCombineRequests: boolean;
    canApproveRequests: boolean;
}

/**
 * Check user roles and return comprehensive role information
 * NOTE: Admin users automatically have ALL permissions and all role flags
 */
export function checkUserRoles(userRoles: string[] = []): UserRoleChecker {
    // Normalize roles to uppercase for consistent checking
    const normalizedRoles = userRoles.map((role) => role?.toUpperCase() || '');

    // Admin roles
    const isAdmin = normalizedRoles.some((role) => ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes(role));

    // If user is admin, automatically grant all permissions and role flags
    if (isAdmin) {
        return {
            isAdmin: true,
            isProcurementUser: true,
            isProcurementOfficer: true,
            isProcurementManager: true,
            isDepartmentHead: true,
            isFinanceUser: true,
            isExecutiveDirector: true,
            isCommitteeMember: true,
            canCombineRequests: true,
            canApproveRequests: true,
        };
    }

    // Procurement roles - be more specific to avoid matching non-procurement managers
    const isProcurementOfficer = normalizedRoles.some(
        (role) => ['PROCUREMENT_OFFICER', 'PROCUREMENT OFFICER', 'PROCUREMENT'].includes(role) || (role.includes('PROCUREMENT') && role.includes('OFFICER'))
    );

    const isProcurementManager = normalizedRoles.some((role) => ['PROCUREMENT_MANAGER', 'PROCUREMENT MANAGER'].includes(role) || (role.includes('PROCUREMENT') && role.includes('MANAGER')));

    // Only actual procurement roles, not generic managers
    const isProcurementUser = isProcurementOfficer || isProcurementManager;

    // Department management roles
    const isDepartmentHead = normalizedRoles.some((role) => ['DEPARTMENT_HEAD', 'DEPT_MANAGER', 'HEAD_OF_DIVISION', 'DEPARTMENT HEAD'].includes(role));

    // Finance roles
    const isFinanceUser = normalizedRoles.some((role) => ['FINANCE', 'FINANCE_OFFICER', 'BUDGET_MANAGER', 'FINANCE OFFICER'].includes(role));

    // Executive roles
    const isExecutiveDirector = normalizedRoles.some((role) => ['EXECUTIVE_DIRECTOR', 'EXECUTIVE DIRECTOR', 'CEO', 'DIRECTOR'].includes(role));

    // Innovation/Committee roles
    const isCommitteeMember = normalizedRoles.some((role) => ['INNOVATION_COMMITTEE', 'COMMITTEE_MEMBER', 'EVALUATION_COMMITTEE'].includes(role));

    // Derived permissions - only procurement officers and procurement managers can combine requests
    const canCombineRequests = isProcurementOfficer || isProcurementManager;
    const canApproveRequests = isProcurementUser || isDepartmentHead || isFinanceUser || isExecutiveDirector;

    return {
        isAdmin,
        isProcurementUser,
        isProcurementOfficer,
        isProcurementManager,
        isDepartmentHead,
        isFinanceUser,
        isExecutiveDirector,
        isCommitteeMember,
        canCombineRequests,
        canApproveRequests,
    };
}

/**
 * Check if user has specific permission
 * NOTE: Admin users automatically have all permissions
 */
export function hasPermission(userRoles: string[], permission: string): boolean {
    const roles = checkUserRoles(userRoles);

    // Admin users automatically have all permissions
    if (roles.isAdmin) {
        return true;
    }

    switch (permission) {
        case 'combine_requests':
            return roles.canCombineRequests;
        case 'approve_requests':
            return roles.canApproveRequests;
        case 'view_all_requests':
            return roles.isProcurementUser;
        case 'manage_procurement':
            return roles.isProcurementManager;
        case 'admin_access':
            return roles.isAdmin;
        default:
            return false;
    }
}

/**
 * Get user's primary role for display purposes
 */
export function getPrimaryRole(userRoles: string[]): string {
    const roles = checkUserRoles(userRoles);

    if (roles.isAdmin) return 'Administrator';
    if (roles.isProcurementManager) return 'Procurement Manager';
    if (roles.isProcurementOfficer) return 'Procurement Officer';
    if (roles.isExecutiveDirector) return 'Executive Director';
    if (roles.isDepartmentHead) return 'Department Head';
    if (roles.isFinanceUser) return 'Finance Officer';
    if (roles.isCommitteeMember) return 'Committee Member';

    return 'User';
}
