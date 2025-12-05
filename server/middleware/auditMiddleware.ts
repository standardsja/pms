/**
 * Audit Middleware
 * 
 * Express middleware to automatically capture request context for audit logging
 */
import { Request, Response, NextFunction } from 'express';

export interface AuditContext {
    userId?: number;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Attach audit context to request object
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Extract user from auth middleware
    const user = (req as any).user;

    // Get IP address (handle proxy scenarios)
    const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] as string ||
        req.socket.remoteAddress ||
        'unknown';

    // Get user agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Attach audit context
    (req as any).auditContext = {
        userId: user?.sub,
        ipAddress,
        userAgent,
    } as AuditContext;

    next();
}

/**
 * Get audit context from request
 */
export function getAuditContext(req: Request): AuditContext {
    return (req as any).auditContext || {};
}
