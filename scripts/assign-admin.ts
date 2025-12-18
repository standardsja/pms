/**
 * Assign ADMIN role to a user
 * Usage: npx tsx assign-admin.ts <userId>
 */
import { prisma } from './server/prismaClient.js';

async function assignAdmin() {
    try {
        // Find admin role
        const adminRole = await prisma.role.findUnique({
            where: { name: 'ADMIN' },
        });

        if (!adminRole) {
            console.error('❌ ADMIN role not found in database');
            process.exit(1);
        }

        // Get the first user (usually admin@bsj.gov.jm from seed)
        const user = await prisma.user.findFirst({
            orderBy: { id: 'asc' },
        });

        if (!user) {
            console.error('❌ No users found in database');
            process.exit(1);
        }

        // Assign ADMIN role
        await prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId: user.id,
                    roleId: adminRole.id,
                },
            },
            update: {},
            create: {
                userId: user.id,
                roleId: adminRole.id,
            },
        });

        console.log(`✅ ADMIN role assigned to user: ${user.email} (ID: ${user.id})`);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

assignAdmin();
