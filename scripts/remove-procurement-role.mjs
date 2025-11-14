import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeProcurementRole() {
    try {
        // Find the committee user
        const user = await prisma.user.findUnique({
            where: { email: 'committee@bsj.gov.jm' },
            include: { roles: { include: { role: true } } }
        });

        if (!user) {
            console.log('❌ Committee user not found');
            return;
        }

        console.log('\n📋 Current roles for committee@bsj.gov.jm:');
        user.roles.forEach(r => console.log(`  - ${r.role.name} (ID: ${r.roleId})`));

        // Find the PROCUREMENT_OFFICER role assignment
        const procurementRoleAssignment = user.roles.find(r => r.role.name === 'PROCUREMENT_OFFICER');

        if (!procurementRoleAssignment) {
            console.log('\n✅ User does not have PROCUREMENT_OFFICER role');
            return;
        }

        // Remove the role assignment
        await prisma.userRole.delete({
            where: {
                userId_roleId: {
                    userId: user.id,
                    roleId: procurementRoleAssignment.roleId
                }
            }
        });

        console.log('\n✅ Removed PROCUREMENT_OFFICER role from committee@bsj.gov.jm');
        
        // Verify
        const updated = await prisma.user.findUnique({
            where: { email: 'committee@bsj.gov.jm' },
            include: { roles: { include: { role: true } } }
        });

        console.log('\n📋 Updated roles:');
        updated.roles.forEach(r => console.log(`  - ${r.role.name}`));
        
        console.log('\n💡 Committee user will now go directly to committee dashboard after login');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

removeProcurementRole();
