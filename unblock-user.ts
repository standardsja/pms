/**
 * Unblock a user by email
 */
import { prisma } from './server/prismaClient.js';

async function unblockUser() {
    try {
        const email = 'committee@bsj.gov.jm';

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`❌ User ${email} not found`);
            process.exit(1);
        }

        // Unblock the user
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                blocked: false,
                blockedAt: null,
                blockedReason: null,
                blockedBy: null,
                failedLogins: 0,
            },
        });

        console.log(`✅ User unblocked: ${email}`);
        console.log(`   Blocked: ${updated.blocked}`);
        console.log(`   Failed Logins: ${updated.failedLogins}`);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

unblockUser();
