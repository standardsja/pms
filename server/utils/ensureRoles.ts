import { prisma } from '../prismaClient';

export async function ensureCoreRoles() {
    const needed = [{ name: 'PROCUREMENT_MANAGER', description: 'Procurement manager - advanced procurement access and management' }];

    for (const r of needed) {
        try {
            await prisma.role.upsert({
                where: { name: r.name },
                update: { description: r.description },
                create: { name: r.name, description: r.description },
            });
        } catch (err) {
            console.warn(`[ensureRoles] Failed to ensure role ${r.name}:`, err);
        }
    }
}

export default ensureCoreRoles;
