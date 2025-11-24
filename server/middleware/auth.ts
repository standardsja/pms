/**
 * Authentication Middleware
 * Handles JWT token verification and user context
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { prisma } from '../prismaClient';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
    user: {
        sub: number;
        email: string;
        name?: string;
        roles?: string[];
    };
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        const userIdHeader = req.headers['x-user-id'];

        // Try Bearer token first
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = jwt.verify(token, config.JWT_SECRET) as any;
                (req as AuthenticatedRequest).user = payload;
                return next();
            } catch (error) {
                // Token invalid, fall through to x-user-id if available
                if (!userIdHeader) {
                    throw new UnauthorizedError('Invalid token');
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

                    const roles = user.roles.map((r) => r.role.name);
                    (req as AuthenticatedRequest).user = {
                        sub: userIdNum,
                        email: user.email,
                        name: user.name || undefined,
                        roles,
                    };
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

export function requireRole(roleName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;

        if (!user?.roles?.includes(roleName)) {
            throw new ForbiddenError(`${roleName} role required`);
        }

        next();
    };
}

export const requireCommittee = requireRole('INNOVATION_COMMITTEE');
export const requireAdmin = requireRole('ADMIN');
export const requireProcurement = requireRole('PROCUREMENT_MANAGER');
