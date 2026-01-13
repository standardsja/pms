/**
 * DEVELOPMENT UTILITY - DO NOT USE IN PRODUCTION
 * Development helper script to check admin users
 * Run with: npx ts-node server/check-admin-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // eslint-disable-next-line no-console
    console.log('=== User 1 Details ===');
    const user = await prisma.user.findUnique({
        where: { id: 1 },
        include: {
            roles: {
                include: {
                    role: true,
                },
            },
            department: true,
        },
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(user, null, 2));

    // eslint-disable-next-line no-console
    console.log('\n=== All Users with ADMIN role ===');
    const admins = await prisma.user.findMany({
        where: {
            roles: {
                some: {
                    role: {
                        name: 'ADMIN',
                    },
                },
            },
        },
        include: {
            roles: {
                include: {
                    role: true,
                },
            },
        },
    });
    // eslint-disable-next-line no-console
    console.log(
        `Found ${admins.length} admin users:`,
        admins.map((u) => ({ id: u.id, email: u.email, roles: u.roles.map((r) => r.role.name) }))
    );

    await prisma.$disconnect();
}

main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
