import crypto from 'crypto';
import { prisma } from '../prismaClient';
import { config } from '../config/environment';
import { logger } from '../config/logger';

// Create a refresh token record and return the raw token string (not hashed)
export async function createRefreshToken(userId: number, ttlDays = 7): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
        data: {
            tokenHash,
            userId,
            expiresAt,
        },
    });

    return raw;
}

// Verify a provided refresh token, ensure it's not revoked/expired, then rotate (create new token and revoke old)
export async function verifyAndRotateRefreshToken(providedToken: string): Promise<{ userId: number; newRefreshToken: string } | null> {
    const tokenHash = crypto.createHash('sha256').update(providedToken).digest('hex');

    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { replacedBy: true } });
    if (!existing) return null;
    if (existing.revoked) return null;
    if (existing.expiresAt.getTime() < Date.now()) return null;

    // Rotate: create new refresh token and mark existing as revoked + link replacedBy
    const newRaw = crypto.randomBytes(48).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newToken = await prisma.refreshToken.create({ data: { tokenHash: newHash, userId: existing.userId, expiresAt } });

    await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true, replacedById: newToken.id } });

    return { userId: existing.userId, newRefreshToken: newRaw };
}

export async function revokeRefreshToken(providedToken: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(providedToken).digest('hex');
    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) return false;
    if (existing.revoked) return true;
    await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
    return true;
}

export async function revokeAllForUser(userId: number): Promise<void> {
    await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
}
