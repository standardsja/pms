import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'ict.manager@bsj.gov.jm';
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User:', {
            id: user.id,
            name: user.name,
            email: user.email,
            role: (user as any).role ?? null,
            roles: (user as any).roles ?? null,
            pinnedModule: (user as any).pinnedModule ?? null,
        });
    } catch (error) {
        console.error('Error fetching user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
