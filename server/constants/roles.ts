/**
 * Role Constants
 * Centralized role name definitions to prevent typos and ensure consistency
 */

export const ROLES = {
    ADMIN: 'ADMIN',
    PROCUREMENT_MANAGER: 'PROCUREMENT_MANAGER',
    PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
    FINANCE_OFFICER: 'FINANCE_OFFICER',
    DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
    HEAD_OF_DIVISION: 'HEAD_OF_DIVISION',
    EXECUTIVE_DIRECTOR: 'EXECUTIVE_DIRECTOR',
    REQUESTER: 'REQUESTER',
    EVALUATION_COMMITTEE: 'EVALUATION_COMMITTEE',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export default ROLES;
