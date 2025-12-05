/**
 * RBAC Middleware for Express
 * Provides role-based access control for protected routes
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        sub: number;
        email: string;
        roles?: string[];
        name?: string;
    };
}

/**
 * Middleware to check if user has at least one of the required roles
 * @param allowedRoles Array of role names that can access the route
 * NOTE: Admin users automatically pass all role checks
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        const user = authReq.user;

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        const userRoles = user.roles || [];

        // Admin users automatically have all roles
        const isAdmin = userRoles.some((role) => role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ADMINISTRATOR');
        if (isAdmin) {
            return next();
        }

        const hasRole = allowedRoles.some((role) => userRoles.some((userRole) => userRole.toUpperCase() === role.toUpperCase()));

        if (!hasRole) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
                requiredRoles: allowedRoles,
                userRoles: userRoles,
            });
        }

        next();
    };
}

/**
 * Middleware to check if user has ALL of the required roles
 * NOTE: Admin users automatically pass all role checks
 */
export function requireAllRoles(...requiredRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        const user = authReq.user;

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        const userRoles = user.roles || [];

        // Admin users automatically have all roles
        const isAdmin = userRoles.some((role) => role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'ADMINISTRATOR');
        if (isAdmin) {
            return next();
        }

        const hasAllRoles = requiredRoles.every((role) => userRoles.some((userRole) => userRole.toUpperCase() === role.toUpperCase()));

        if (!hasAllRoles) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. All required roles must be present: ${requiredRoles.join(', ')}`,
                requiredRoles: requiredRoles,
                userRoles: userRoles,
            });
        }

        next();
    };
}

/**
 * Pre-configured role middleware for common roles
 */
export const requireAdmin = requireRole('ADMIN', 'ADMINISTRATOR');
export const requireCommittee = requireRole('INNOVATION_COMMITTEE');
export const requireEvaluationCommittee = requireRole('EVALUATION_COMMITTEE');
export const requireProcurement = requireRole('PROCUREMENT', 'PROCUREMENT_OFFICER', 'PROCUREMENT_MANAGER');
export const requireFinance = requireRole('FINANCE', 'FINANCE_OFFICER');
export const requireManager = requireRole('DEPT_MANAGER', 'PROCUREMENT_MANAGER', 'MANAGER');
export const requireHOD = requireRole('HEAD_OF_DIVISION', 'DEPARTMENT_HEAD');
export const requireExecutive = requireRole('EXECUTIVE_DIRECTOR');

/**
 * Check if user owns a resource or is an admin
 * Usage: Pass a function that extracts the owner ID from the request
 */
export function requireOwnerOrAdmin(getOwnerId: (req: Request) => number | Promise<number>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        const user = authReq.user;

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }

        const userRoles = user.roles || [];
        const isAdmin = userRoles.some((r) => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'ADMINISTRATOR');

        if (isAdmin) {
            return next();
        }

        try {
            const ownerId = await getOwnerId(req);
            if (user.sub === ownerId) {
                return next();
            }

            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own resources',
            });
        } catch (error: any) {
            return res.status(500).json({
                error: 'Internal Server Error',
                message: error?.message || 'Failed to verify ownership',
            });
        }
    };
}
