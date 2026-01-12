/**
 * Audit Middleware
 *
 * Express middleware to automatically capture request context for audit logging
 */
import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService.js';

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
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || 'unknown';

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

/**
 * Global audit logger (non-intrusive)
 * Logs mutating API calls (POST/PUT/PATCH/DELETE) after the response is sent.
 * Skips audit endpoints themselves to avoid recursion.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', async () => {
        const method = req.method.toUpperCase();
        const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

        // Only log mutating calls and skip audit endpoints to prevent recursion
        if (!isMutating || req.originalUrl.startsWith('/api/admin/audit') || req.originalUrl.startsWith('/api/audit')) {
            return;
        }

        const context = getAuditContext(req);
        const userId = (req as any).user?.sub as number | undefined;
        const durationMs = Date.now() - start;

        try {
            await auditService.createAuditLog({
                userId,
                action: `${method} ${req.originalUrl}`,
                entity: req.baseUrl || 'api',
                message: `HTTP ${method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                metadata: {
                    statusCode: res.statusCode,
                    durationMs,
                },
            });
        } catch (error) {
            // Never block response on audit logging failures
        }
    });

    next();
}
