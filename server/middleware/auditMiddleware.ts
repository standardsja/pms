/**
 * Audit Middleware
 *
 * Express middleware to automatically capture request context for audit logging
 */
import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import { auditService } from '../services/auditService.js';

export interface AuditContext {
    userId?: number;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Map HTTP method and path to AuditAction enum value
 */
function mapRouteToAuditAction(method: string, path: string): AuditAction {
    const normalizedPath = path.toLowerCase();

    // Auth routes
    if (normalizedPath.includes('/api/auth/login')) {
        return AuditAction.USER_LOGIN;
    }
    if (normalizedPath.includes('/api/auth/logout')) {
        return AuditAction.USER_LOGOUT;
    }
    if (normalizedPath.includes('/api/auth/password') && method === 'PUT') {
        return AuditAction.PASSWORD_CHANGED;
    }

    // Request routes
    if (normalizedPath.includes('/api/requests') || normalizedPath.includes('/api/apps/requests')) {
        if (method === 'POST') return AuditAction.REQUEST_CREATED;
        if (method === 'PUT') return AuditAction.REQUEST_UPDATED;
        if (method === 'DELETE') return AuditAction.REQUEST_DELETED;
    }

    // Approval routes
    if (normalizedPath.includes('/api/approvals') || normalizedPath.includes('/api/approve')) {
        if (method === 'POST') return AuditAction.APPROVAL_GRANTED;
        if (method === 'DELETE') return AuditAction.APPROVAL_DENIED;
    }

    // Role routes
    if (normalizedPath.includes('/api/users') && normalizedPath.includes('role')) {
        if (method === 'POST') return AuditAction.ROLE_ASSIGNED;
        if (method === 'DELETE') return AuditAction.ROLE_REMOVED;
    }

    // PO routes
    if (normalizedPath.includes('/api/purchase-orders') || normalizedPath.includes('/api/po')) {
        if (method === 'POST') return AuditAction.PO_CREATED;
        if (method === 'PUT') return AuditAction.PO_UPDATED;
    }

    // Evaluation routes
    if (normalizedPath.includes('/api/evaluations')) {
        if (method === 'POST') return AuditAction.WORKFLOW_STAGE_CHANGED;
        if (method === 'PUT') return AuditAction.WORKFLOW_STAGE_CHANGED;
    }

    // File routes
    if (normalizedPath.includes('/api/files') || normalizedPath.includes('/upload')) {
        if (method === 'POST') return AuditAction.FILE_UPLOADED;
        if (method === 'DELETE') return AuditAction.FILE_DELETED;
    }

    // Ideas/Innovation hub routes
    if (normalizedPath.includes('/api/ideas')) {
        if (method === 'POST') return AuditAction.IDEA_CREATED;
        if (method === 'PUT') return AuditAction.IDEA_UPDATED;
        if (method === 'DELETE') return AuditAction.IDEA_DELETED;
    }

    // Comments routes
    if (normalizedPath.includes('/api/comments')) {
        if (method === 'POST') return AuditAction.COMMENT_CREATED;
        if (method === 'DELETE') return AuditAction.COMMENT_DELETED;
    }

    // Default fallback - treat as a status change
    return AuditAction.REQUEST_STATUS_CHANGED;
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
            // Map the route to a valid AuditAction enum value
            const action = mapRouteToAuditAction(method, req.originalUrl);

            await auditService.createAuditLog({
                userId,
                action,
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
