import { prisma } from './server/prismaClient';

(async () => {
    const user31 = await prisma.user.findUnique({
        where: { id: 31 },
        select: { id: true, email: true, blocked: true, blockedReason: true, blockedAt: true },
    });
    console.log('User 31 from DB:', JSON.stringify(user31, null, 2));
    process.exit(0);
})();
