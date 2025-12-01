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
        
        console.log(`[AUTH] 🔐 Request to ${req.method} ${req.path}`);
        console.log(`[AUTH] Authorization header:`, authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : 'MISSING');
        console.log(`[AUTH] x-user-id header:`, userIdHeader || 'MISSING');
        console.log(`[AUTH] NODE_ENV:`, config.NODE_ENV);

        // Try Bearer token first
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = jwt.verify(token, config.JWT_SECRET) as any;
                console.log(`[AUTH] ✅ JWT token valid for user ${payload.sub}`);
                (req as AuthenticatedRequest).user = payload;
                return next();
            } catch (error) {
                console.log(`[AUTH] ⚠️ JWT verification failed:`, (error as Error).message);
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
                console.log(`[AUTH] ❌ Invalid user ID format:`, userIdHeader);
                throw new UnauthorizedError('Invalid user ID');
            }

            // In development, hydrate roles from database
            if (config.NODE_ENV !== 'production') {
                console.log(`[AUTH] 🔄 Development mode: hydrating user ${userIdNum} from database`);
                try {
                    const user = await prisma.user.findUnique({
                        where: { id: userIdNum },
                        include: { roles: { include: { role: true } } },
                    });

                    if (!user) {
                        console.log(`[AUTH] ❌ User ${userIdNum} not found in database`);
                        throw new UnauthorizedError('User not found');
                    }

                    const roles = user.roles.map((r) => r.role.name);
                    console.log(`[AUTH] ✅ User ${userIdNum} authenticated with roles:`, roles);
                    (req as AuthenticatedRequest).user = {
                        sub: userIdNum,
                        email: user.email,
                        name: user.name || undefined,
                        roles,
                    };
                    return next();
                } catch (error) {
                    console.log(`[AUTH] ❌ Database error:`, (error as Error).message);
                    logger.error('Failed to hydrate user from database', { userId: userIdNum, error });
                    throw new UnauthorizedError('Authentication failed');
                }
            } else {
                // Production: require proper JWT tokens
                console.log(`[AUTH] ❌ Production mode requires JWT token`);
                throw new UnauthorizedError('Bearer token required in production');
            }
        }

        console.log(`[AUTH] ❌ No authentication provided`);
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
