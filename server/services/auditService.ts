/**
 * Audit Trail Service
 *
 * Provides comprehensive audit logging for all critical system operations.
 * Tracks who did what, when, and on which entity for compliance and security.
 */
import { Prisma, AuditAction } from '@prisma/client';
import { prisma } from '../prismaClient.js';
import { logger } from '../config/logger.js';

/**
 * Map HTTP routes to AuditAction enum values
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

export interface AuditLogData {
    userId?: number;
    action: AuditAction | string; // Accept both enum and string for flexibility
    entity: string;
    entityId?: number;
    message: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

/**
 * Audit Service Class
 */
class AuditService {
    /**
     * Create an audit log entry and return the created record
     */
    async createAuditLog(data: AuditLogData): Promise<any> {
        try {
            // Convert action to valid enum if it's a string
            let action: AuditAction = data.action as AuditAction;

            if (typeof data.action === 'string' && !Object.values(AuditAction).includes(data.action as AuditAction)) {
                // If action is not a valid enum value, try to infer it from context
                // This shouldn't happen in normal operation but provides safety
                action = AuditAction.REQUEST_STATUS_CHANGED;
                logger.warn('Action not recognized, defaulting to REQUEST_STATUS_CHANGED', {
                    originalAction: data.action,
                });
            }

            const auditLog = await prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action,
                    entity: data.entity as any,
                    entityId: data.entityId as any,
                    message: data.message,
                    ipAddress: data.ipAddress as any,
                    userAgent: data.userAgent as any,
                    metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
                },
            });

            logger.info('Audit log created', {
                action: action,
                entity: data.entity,
                entityId: data.entityId,
                userId: data.userId,
                auditLogId: auditLog.id,
            });

            return auditLog;
        } catch (error: any) {
            // Never let audit logging crash the application
            logger.error('Failed to create audit log', {
                error: error.message,
                data,
            });
            return null;
        }
    }

    /**
     * Create an audit log entry (legacy method name - calls createAuditLog)
     */
    async log(data: AuditLogData): Promise<void> {
        await this.createAuditLog(data);
    }

    /**
     * Log user authentication events
     */
    async logAuth(params: {
        userId?: number;
        email: string;
        action: 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_LOGIN_FAILED' | 'LDAP_LOGIN';
        success: boolean;
        ipAddress?: string;
        userAgent?: string;
        reason?: string;
    }): Promise<void> {
        const message = params.success
            ? `User ${params.email} ${params.action.toLowerCase().replace('_', ' ')}`
            : `Failed login attempt for ${params.email}${params.reason ? `: ${params.reason}` : ''}`;

        await this.log({
            userId: params.userId,
            action: params.action as any,
            entity: 'User',
            message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                email: params.email,
                success: params.success,
                reason: params.reason,
            },
        });
    }

    /**
     * Log procurement request events
     */
    async logRequest(params: {
        userId: number;
        requestId: number;
        action: 'REQUEST_CREATED' | 'REQUEST_UPDATED' | 'REQUEST_SUBMITTED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'REQUEST_FORWARDED' | 'REQUEST_DELETED';
        message: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        await this.log({
            userId: params.userId,
            action: params.action as any,
            entity: 'ProcurementRequest',
            entityId: params.requestId,
            message: params.message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: params.metadata,
        });
    }

    /**
     * Log approval/rejection events
     */
    async logApproval(params: { userId: number; requestId: number; approved: boolean; stage: string; comment?: string; ipAddress?: string; userAgent?: string }): Promise<void> {
        const action = params.approved ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED';
        const message = `${params.approved ? 'Approved' : 'Rejected'} request at ${params.stage} stage${params.comment ? `: ${params.comment}` : ''}`;

        await this.log({
            userId: params.userId,
            action: action as any,
            entity: 'ProcurementRequest',
            entityId: params.requestId,
            message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                approved: params.approved,
                stage: params.stage,
                comment: params.comment,
            },
        });
    }

    /**
     * Log role assignment changes
     */
    async logRoleChange(params: {
        adminUserId: number;
        targetUserId: number;
        targetUserEmail: string;
        role: string;
        action: 'ROLE_ASSIGNED' | 'ROLE_REMOVED';
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        const message = `${params.action === 'ROLE_ASSIGNED' ? 'Assigned' : 'Removed'} role "${params.role}" ${params.action === 'ROLE_ASSIGNED' ? 'to' : 'from'} user ${params.targetUserEmail}`;

        await this.log({
            userId: params.adminUserId,
            action: params.action as any,
            entity: 'User',
            entityId: params.targetUserId,
            message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                role: params.role,
                targetUser: params.targetUserEmail,
            },
        });
    }

    /**
     * Log file operations
     */
    async logFile(params: {
        userId: number;
        action: 'FILE_UPLOADED' | 'FILE_DOWNLOADED' | 'FILE_DELETED';
        fileName: string;
        fileSize?: number;
        relatedEntity?: string;
        relatedEntityId?: number;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        const actionText = params.action.replace('FILE_', '').toLowerCase();
        const message = `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} file: ${params.fileName}`;

        await this.log({
            userId: params.userId,
            action: params.action as any,
            entity: params.relatedEntity || 'File',
            entityId: params.relatedEntityId,
            message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                fileName: params.fileName,
                fileSize: params.fileSize,
            },
        });
    }

    /**
     * Log purchase order events
     */
    async logPurchaseOrder(params: {
        userId: number;
        poId: number;
        action: 'PO_CREATED' | 'PO_UPDATED' | 'PO_APPROVED' | 'PO_CANCELLED';
        message: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        await this.log({
            userId: params.userId,
            action: params.action as any,
            entity: 'PurchaseOrder',
            entityId: params.poId,
            message: params.message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: params.metadata,
        });
    }

    /**
     * Log data export events (for compliance)
     */
    async logDataExport(params: { userId: number; exportType: string; recordCount?: number; ipAddress?: string; userAgent?: string }): Promise<void> {
        const message = `Exported ${params.exportType} data${params.recordCount ? ` (${params.recordCount} records)` : ''}`;

        await this.log({
            userId: params.userId,
            action: 'DATA_EXPORTED' as any,
            entity: 'System',
            message,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                exportType: params.exportType,
                recordCount: params.recordCount,
            },
        });
    }

    /**
     * Get audit logs for a specific entity
     */
    async getEntityLogs(entity: string, entityId: number, limit: number = 50) {
        return await prisma.auditLog.findMany({
            where: {
                entity,
                entityId,
            } as any,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    }

    /**
     * Get audit logs for a specific user
     */
    async getUserLogs(userId: number, limit: number = 100) {
        return await prisma.auditLog.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    }

    /**
     * Get recent audit logs (for admin dashboard)
     */
    async getRecentLogs(limit: number = 100) {
        return await prisma.auditLog.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    }

    /**
     * Search audit logs
     */
    async searchLogs(params: { userId?: number; action?: string; entity?: string; startDate?: Date; endDate?: Date; limit?: number }) {
        return await prisma.auditLog.findMany({
            where: {
                userId: params.userId,
                action: params.action,
                entity: params.entity,
                createdAt: {
                    gte: params.startDate,
                    lte: params.endDate,
                },
            } as any,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: params.limit || 100,
        });
    }
}

// Export singleton instance
export const auditService = new AuditService();
