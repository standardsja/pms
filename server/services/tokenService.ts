import crypto from 'crypto';
import { prisma } from '../prismaClient.js';
import { config } from '../config/environment.js';
import { logger } from '../config/logger.js';

// Create a refresh token record and return the raw token string (not hashed)
export async function createRefreshToken(userId: number, ttlDays = 7): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    try {
        await prisma.refreshToken.create({
            data: {
                tokenHash,
                userId,
                expiresAt,
            },
        });
        return raw;
    } catch (err: any) {
        // If the refresh token table doesn't exist yet (migrations not applied),
        // fall back to returning a non-persisted token so login still works.
        const message = err?.message || String(err);
        logger.warn('[TokenService] Could not persist refresh token, falling back to non-persisted token', { message });
        return raw;
    }
}

// Verify a provided refresh token, ensure it's not revoked/expired, then rotate (create new token and revoke old)
export async function verifyAndRotateRefreshToken(providedToken: string): Promise<{ userId: number; newRefreshToken: string } | null> {
    const tokenHash = crypto.createHash('sha256').update(providedToken).digest('hex');

    let existing;
    try {
        existing = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { replacedBy: true } });
    } catch (err: any) {
        logger.warn('[TokenService] Cannot verify refresh token - refresh table missing or DB error', { message: err?.message || String(err) });
        return null;
    }
    if (!existing) return null;
    if (existing.revoked) return null;
    if (existing.expiresAt.getTime() < Date.now()) return null;

    // Rotate: create new refresh token and mark existing as revoked + link replacedBy
    const newRaw = crypto.randomBytes(48).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
        const newToken = await prisma.refreshToken.create({ data: { tokenHash: newHash, userId: existing.userId, expiresAt } });
        await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true, replacedById: newToken.id } });
        return { userId: existing.userId, newRefreshToken: newRaw };
    } catch (err: any) {
        // If the DB write fails (table missing), fall back to returning an unpersisted token.
        logger.warn('[TokenService] Could not rotate refresh token in DB, returning non-persisted token', { message: err?.message || String(err) });
        return { userId: existing.userId, newRefreshToken: newRaw };
    }
}

export async function revokeRefreshToken(providedToken: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(providedToken).digest('hex');
    try {
        const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
        if (!existing) return false;
        if (existing.revoked) return true;
        await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
        return true;
    } catch (err: any) {
        logger.warn('[TokenService] Cannot revoke refresh token - refresh table missing or DB error', { message: err?.message || String(err) });
        return false;
    }
}

export async function revokeAllForUser(userId: number): Promise<void> {
    try {
        await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    } catch (err: any) {
        logger.warn('[TokenService] Cannot revoke all refresh tokens for user - refresh table missing or DB error', { userId, message: err?.message || String(err) });
    }
}
