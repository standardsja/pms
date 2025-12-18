import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

export async function softDeleteUserRole(userId: number, roleId: number) {
    try {
        await prisma.userRole.updateMany({
            where: { userId, roleId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
        logger.info('Role soft-deleted', { userId, roleId });
    } catch (e: any) {
        logger.error('Failed to soft-delete user role', { userId, roleId, error: e?.message || String(e) });
    }
}

export default { softDeleteUserRole };
