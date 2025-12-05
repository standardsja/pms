/**
 * Add all available roles to a specific user
 * Usage: node scripts/add-all-roles.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAllRoles() {
    try {
        const email = 'srobinson@bsj.org.jm';

        console.log(`🔍 Finding user: ${email}`);

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            process.exit(1);
        }

        console.log(`✅ User found: ${user.name} (ID: ${user.id})`);
        console.log(`📋 Current roles: ${user.roles.map((r) => r.role.name).join(', ') || 'None'}`);

        // Get all available roles
        const allRoles = await prisma.role.findMany();
        console.log(`\n📊 Available roles in system: ${allRoles.length}`);

        // Get current role IDs
        const currentRoleIds = new Set(user.roles.map((r) => r.roleId));

        // Add missing roles
        let addedCount = 0;
        for (const role of allRoles) {
            if (!currentRoleIds.has(role.id)) {
                await prisma.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: role.id,
                    },
                });
                console.log(`  ✓ Added role: ${role.name}`);
                addedCount++;
            } else {
                console.log(`  ○ Already has role: ${role.name}`);
            }
        }

        console.log(`\n✅ Done! Added ${addedCount} new role(s) to ${email}`);

        // Verify final state
        const updatedUser = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        console.log(`\n📋 Final roles (${updatedUser.roles.length} total):`);
        updatedUser.roles.forEach((r) => {
            console.log(`  - ${r.role.name}`);
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

addAllRoles();
