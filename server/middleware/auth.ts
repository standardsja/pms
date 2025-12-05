/**
 * Authentication Middleware
 * Handles JWT token verification and user context
 * Integrates with RoleResolver for LDAP-based role and permission resolution
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { prisma } from '../prismaClient';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { getGlobalRoleResolver } from '../services/roleResolver';
import { Permission } from '../types/rbac';

export interface AuthenticatedRequest extends Request {
    user: {
        sub: number;
        email: string;
        name?: string;
        roles?: string[];
        permissions?: Permission;
        ldapData?: Record<string, any>;
    };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        const userIdHeader = req.headers['x-user-id'];

        logger.debug('[Auth] Headers', {
            hasAuth: !!authHeader,
            authPrefix: authHeader?.substring(0, 10),
            hasUserId: !!userIdHeader,
        });

        // Try Bearer token first
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            logger.debug('[Auth] Attempting JWT verification', { tokenLength: token.length });
            try {
                const payload = jwt.verify(token, config.JWT_SECRET) as any;
                logger.debug('[Auth] JWT verified successfully', { sub: payload.sub, email: payload.email });

                // Resolve roles and permissions using RoleResolver
                const userWithRoles = await enrichUserWithRoles(payload.sub, payload.email, payload.name, payload.ldapData);

                (req as AuthenticatedRequest).user = userWithRoles;
                return next();
            } catch (error: any) {
                // Handle JWT errors explicitly and return concise JSON to callers
                const errName = error && error.name ? String(error.name) : undefined;
                const errMsg = error && error.message ? String(error.message) : String(error || 'Unknown error');

                if (errName === 'TokenExpiredError') {
                    logger.info('[Auth] JWT expired', { message: errMsg });
                    return res.status(401).json({ success: false, message: 'Token expired' });
                }

                // Malformed / invalid signature / other JWT errors
                logger.warn('[Auth] JWT verification failed', { name: errName, message: errMsg });

                // Token invalid, fall back to x-user-id only if provided; otherwise respond 401
                if (!userIdHeader) {
                    return res.status(401).json({ success: false, message: 'Invalid token' });
                }
            }
        }

        // Fallback to x-user-id header (for development/legacy support)
        if (userIdHeader) {
            const userIdNum = parseInt(String(userIdHeader), 10);
            if (!Number.isFinite(userIdNum)) {
                throw new UnauthorizedError('Invalid user ID');
            }

            // In development, hydrate roles from database
            if (config.NODE_ENV !== 'production') {
                try {
                    const user = await prisma.user.findUnique({
                        where: { id: userIdNum },
                        include: { roles: { include: { role: true } } },
                    });

                    if (!user) {
                        throw new UnauthorizedError('User not found');
                    }

                    // Resolve roles and permissions using RoleResolver
                    const userWithRoles = await enrichUserWithRoles(user.id, user.email, user.name || undefined, undefined);

                    (req as AuthenticatedRequest).user = userWithRoles;
                    return next();
                } catch (error) {
                    logger.error('Failed to hydrate user from database', { userId: userIdNum, error });
                    throw new UnauthorizedError('Authentication failed');
                }
            } else {
                // Production: require proper JWT tokens
                throw new UnauthorizedError('Bearer token required in production');
            }
        }

        throw new UnauthorizedError('No valid authentication provided');
    } catch (error) {
        next(error);
    }
}

/**
 * Enriches user object with roles and permissions from RoleResolver
 * Fallback to database roles if resolver is not initialized
 */
async function enrichUserWithRoles(userId: number, email: string, name: string | undefined, ldapData?: Record<string, any>): Promise<AuthenticatedRequest['user']> {
    try {
        // Try to use RoleResolver if available
        const resolver = getGlobalRoleResolver();

        if (ldapData && ldapData.dn) {
            // Resolve roles from LDAP data
            const ldapUser = {
                dn: ldapData.dn,
                cn: ldapData.cn || ldapData.email || email,
                ...ldapData,
            };
            const result = await resolver.resolveRolesAndPermissions(userId, email, ldapUser, { includeLDAPData: false });

            return {
                sub: userId,
                email,
                name,
                roles: result.finalRoles,
                permissions: result.permissions,
                ldapData: undefined,
            };
        } else {
            // Fall back to database roles
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { roles: { include: { role: true } } },
            });

            if (!user) {
                logger.warn(`[Auth] User ${userId} not found in database`);
                return {
                    sub: userId,
                    email,
                    name,
                    roles: [resolver.getRole('REQUESTER')?.name || 'REQUESTER'],
                    permissions: resolver.getRole('REQUESTER')?.permissions || {},
                };
            }

            const roles = user.roles.map((r) => r.role.name);
            const permissions = await aggregatePermissionsForRoles(roles, resolver);

            return {
                sub: userId,
                email,
                name: user.name || name,
                roles,
                permissions,
            };
        }
    } catch (error) {
        logger.warn('[Auth] Failed to resolve roles with RoleResolver:', error);

        // Fallback: use database roles
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { roles: { include: { role: true } } },
            });

            const roles = user?.roles.map((r) => r.role.name) || ['REQUESTER'];

            return {
                sub: userId,
                email,
                name: user?.name || name,
                roles,
                permissions: {}, // Empty permissions if resolver fails
            };
        } catch (fallbackError) {
            logger.error('[Auth] All role resolution methods failed:', fallbackError);

            // Ultimate fallback
            return {
                sub: userId,
                email,
                name,
                roles: ['REQUESTER'],
                permissions: {},
            };
        }
    }
}

/**
 * Aggregates permissions for multiple roles using RoleResolver
 */
async function aggregatePermissionsForRoles(roles: string[], resolver: ReturnType<typeof getGlobalRoleResolver>): Promise<Permission> {
    const aggregated: Permission = {};

    for (const roleName of roles) {
        const role = resolver.getRole(roleName);
        if (role) {
            for (const [permission, granted] of Object.entries(role.permissions)) {
                // Grant permission if any role grants it
                aggregated[permission] = aggregated[permission] || granted;
            }
        }
    }

    return aggregated;
}

/**
 * Middleware factory: Requires specific permission(s)
 * NEW: Permission-based access control (replaces old role-based checks)
 */
export function requirePermission(...requiredPermissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as AuthenticatedRequest).user;

            if (!user) {
                throw new UnauthorizedError('Authentication required');
            }

            if (!user.permissions) {
                logger.warn(`[Auth] User ${user.sub} has no permissions object`);
                throw new ForbiddenError('Unable to determine permissions');
            }

            const resolver = getGlobalRoleResolver();
            const hasAllPermissions = resolver.hasAllPermissions(user.permissions, requiredPermissions);

            if (!hasAllPermissions) {
                logger.debug(`[Auth] User ${user.sub} denied access - missing permissions`, {
                    required: requiredPermissions,
                    userPermissions: Object.keys(user.permissions).filter((p) => user.permissions![p]),
                });
                throw new ForbiddenError(`Required permissions: ${requiredPermissions.join(', ')}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware factory: Requires at least one of the specified permissions
 */
export function requireAnyPermission(...permissionsToCheck: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as AuthenticatedRequest).user;

            if (!user) {
                throw new UnauthorizedError('Authentication required');
            }

            if (!user.permissions) {
                logger.warn(`[Auth] User ${user.sub} has no permissions object`);
                throw new ForbiddenError('Unable to determine permissions');
            }

            const resolver = getGlobalRoleResolver();
            const hasAnyPermission = resolver.hasAnyPermission(user.permissions, permissionsToCheck);

            if (!hasAnyPermission) {
                throw new ForbiddenError(`At least one of these permissions required: ${permissionsToCheck.join(', ')}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * LEGACY: Role-based middleware (kept for backward compatibility)
 * Prefer permission-based checks instead
 */
export function requireRole(roleName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;

        if (!user?.roles?.includes(roleName)) {
            throw new ForbiddenError(`${roleName} role required`);
        }

        next();
    };
}

/**
 * Pre-configured permission middleware for common workflows
 */
export const requireRequestApproval = requirePermission('request:approve');
export const requireRequestCreation = requirePermission('request:create', 'request:submit');
export const requireProcurementAccess = requirePermission('request:read_all');
export const requireFinanceAccess = requirePermission('payment:read');
export const requireAuditAccess = requirePermission('audit:read');
export const requireAdminAccess = requirePermission('admin:manage_users', 'admin:manage_roles');

/**
 * Pre-configured legacy role middleware (backward compatibility)
 */
export const requireCommittee = requireRole('INNOVATION_COMMITTEE');
export const requireAdmin = requireRole('ADMIN');
export const requireProcurement = requireRole('PROCUREMENT_MANAGER');
