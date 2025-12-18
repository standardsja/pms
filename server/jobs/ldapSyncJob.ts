import { PrismaClient } from '@prisma/client';
import { ldapService } from '../services/ldapService.js';
import { syncLDAPUserToDatabase, describeSyncResult } from '../services/ldapRoleSyncService.js';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

export async function runLdapSyncOnce() {
    if (!ldapService.isEnabled()) {
        logger.info('[LDAP Sync] LDAP not enabled; skipping job');
        return { enabled: false };
    }

    const startedAt = new Date();
    let processed = 0;
    const errors: string[] = [];

    try {
        // Simple strategy: sync all users that have externalId (DN) or recent login
        const users = await prisma.user.findMany({
            where: { OR: [{ externalId: { not: null } }, { lastLogin: { not: null } }] },
            select: { id: true, email: true },
        });

        for (const u of users) {
            try {
                // Find user in LDAP by email
                const ldapUser = await ldapService.lookupUserByEmail?.(u.email);
                if (!ldapUser) continue;
                await syncLDAPUserToDatabase(ldapUser);
                processed++;
            } catch (e: any) {
                const msg = e?.message || String(e);
                errors.push(`${u.email}: ${msg}`);
            }
        }
    } catch (e: any) {
        errors.push(e?.message || String(e));
    }

    const finishedAt = new Date();
    logger.info('[LDAP Sync] Completed', { processed, durationMs: finishedAt.getTime() - startedAt.getTime(), errors });
    return { enabled: true, processed, errors, startedAt, finishedAt };
}

export default { runLdapSyncOnce };
