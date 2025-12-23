import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUser } from '../utils/auth';
import { detectUserRoles, getDashboardPath, DetectedRoles } from '../utils/roleDetection';

interface RoleDashboardGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallbackPath?: string;
}

const normalizeRole = (role: string): string => role.trim().toUpperCase();

const resolveDetectedRoles = (roles: DetectedRoles): Set<string> => {
    const resolved = new Set<string>();
    if (roles.isAdmin) resolved.add('ADMIN');
    if (roles.isHeadOfDivision) {
        resolved.add('HEAD_OF_DIVISION');
        resolved.add('HOD');
    }
    if (roles.isExecutiveDirector) resolved.add('EXECUTIVE_DIRECTOR');
    if (roles.isSeniorDirector) resolved.add('SENIOR_DIRECTOR');
    if (roles.isProcurementManager) resolved.add('PROCUREMENT_MANAGER');
    if (roles.isProcurementOfficer) resolved.add('PROCUREMENT_OFFICER');
    if (roles.isFinanceManager) resolved.add('FINANCE_MANAGER');
    if (roles.isBudgetManager) resolved.add('BUDGET_MANAGER');
    if (roles.isFinanceOfficer) resolved.add('FINANCE_OFFICER');
    if (roles.isFinancePaymentStage) resolved.add('FINANCE_PAYMENT_STAGE');
    if (roles.isDepartmentHead) resolved.add('DEPARTMENT_HEAD');
    if (roles.isDepartmentManager) {
        resolved.add('DEPARTMENT_MANAGER');
        resolved.add('DEPT_MANAGER');
    }
    if (roles.isInnovationCommittee) resolved.add('INNOVATION_COMMITTEE');
    if (roles.isAuditor) resolved.add('AUDITOR');
    if (roles.isSupplier) resolved.add('SUPPLIER');
    resolved.add(roles.primaryRole);
    return resolved;
};

const RoleDashboardGuard: React.FC<RoleDashboardGuardProps> = ({ children, allowedRoles, fallbackPath }) => {
    const currentUser = getUser();

    if (!currentUser) {
        return <Navigate to="/auth/login" replace />;
    }

    const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
    const detectedRoles = detectUserRoles(userRoles);
    const resolvedRoles = resolveDetectedRoles(detectedRoles);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    const hasAccess = normalizedAllowed.some((role) => resolvedRoles.has(role));

    if (!hasAccess) {
        const targetPath = fallbackPath ?? getDashboardPath(detectedRoles, typeof window !== 'undefined' ? window.location.pathname : '');
        return <Navigate to={targetPath} replace />;
    }

    return <>{children}</>;
};

export default RoleDashboardGuard;
