import { prisma } from './server/prismaClient';

(async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            department: true,
            roles: {
                include: {
                    role: true,
                },
            },
            // Include security fields
            blocked: true,
            blockedAt: true,
            blockedReason: true,
            blockedBy: true,
            lastLogin: true,
            failedLogins: true,
            lastFailedLogin: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    const user31 = users.find((u) => u.id === 31);
    console.log('User 31 with full query:', JSON.stringify(user31, null, 2));
    process.exit(0);
})();
