import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addProcurementManagerRole() {
    try {
        const userId = 15;

        console.log(`\n🔧 Adding PROCUREMENT_MANAGER role to user ${userId}...\n`);

        // First check if PROCUREMENT_MANAGER role exists
        let procManagerRole = await prisma.role.findFirst({
            where: { name: 'PROCUREMENT_MANAGER' },
        });

        if (!procManagerRole) {
            console.log(`Creating PROCUREMENT_MANAGER role...`);
            procManagerRole = await prisma.role.create({
                data: {
                    name: 'PROCUREMENT_MANAGER',
                    description: 'Procurement Manager - can combine requests and manage procurement workflow',
                },
            });
            console.log(`✅ Role created: ${procManagerRole.name} (ID: ${procManagerRole.id})`);
        } else {
            console.log(`✅ Role exists: ${procManagerRole.name} (ID: ${procManagerRole.id})`);
        }

        // Check if user already has this role
        const existingUserRole = await prisma.userRole.findFirst({
            where: {
                userId: userId,
                roleId: procManagerRole.id,
            },
        });

        if (existingUserRole) {
            console.log(`⚠️  User already has PROCUREMENT_MANAGER role`);
        } else {
            // Add the role to the user
            await prisma.userRole.create({
                data: {
                    userId: userId,
                    roleId: procManagerRole.id,
                },
            });
            console.log(`✅ Added PROCUREMENT_MANAGER role to user ${userId}`);
        }

        // Verify
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        console.log(`\n✅ User now has roles:`);
        user?.roles.forEach((ur) => {
            console.log(`   - ${ur.role.name}`);
        });

        console.log(`\n✅ User can now access combine requests feature!`);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addProcurementManagerRole();
