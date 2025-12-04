import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
    try {
        const userId = 15; // From console logs

        console.log(`\n🔍 Checking user ${userId}...\n`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
        });

        if (!user) {
            console.log(`❌ User ${userId} not found`);
            return;
        }

        console.log(`👤 User: ${user.name} (${user.email})`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🏢 Department: ${user.department?.name || 'None'}`);
        console.log(`\n🎭 Roles:`);

        user.roles.forEach((ur) => {
            console.log(`   - ${ur.role.name} (ID: ${ur.role.id})`);
            console.log(`     Description: ${ur.role.description || 'N/A'}`);
        });

        console.log(`\n🔐 Access Check:`);
        const roleNames = user.roles.map((ur) => ur.role.name.toUpperCase());
        const hasProcurement = roleNames.some((r) => r.includes('PROCUREMENT'));
        const hasAdmin = roleNames.some((r) => r.includes('ADMIN'));

        console.log(`   Has PROCUREMENT in role: ${hasProcurement ? '✅' : '❌'}`);
        console.log(`   Has ADMIN in role: ${hasAdmin ? '✅' : '❌'}`);
        console.log(`   Can access combine route: ${hasProcurement || hasAdmin ? '✅' : '❌'}`);

        if (!hasProcurement && !hasAdmin) {
            console.log(`\n⚠️  PROBLEM: User does not have PROCUREMENT or ADMIN role`);
            console.log(`   Current roles:`, roleNames);
            console.log(`\n💡 Solutions:`);
            console.log(`   1. Add PROCUREMENT_MANAGER role to this user`);
            console.log(`   2. Update ProcurementRoute to also accept their current roles`);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
