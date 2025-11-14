import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDualRole() {
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
        user.roles.forEach(r => console.log(`  - ${r.role.name}`));

        // Find or create PROCUREMENT_OFFICER role
        let procurementRole = await prisma.role.findUnique({
            where: { name: 'PROCUREMENT_OFFICER' }
        });

        if (!procurementRole) {
            console.log('\n⚠️  PROCUREMENT_OFFICER role not found, creating it...');
            procurementRole = await prisma.role.create({
                data: {
                    name: 'PROCUREMENT_OFFICER',
                    description: 'Procurement officer with full procurement access'
                }
            });
            console.log('✅ Created PROCUREMENT_OFFICER role');
        }

        // Check if user already has the role
        const hasRole = user.roles.some(r => r.roleId === procurementRole.id);
        
        if (hasRole) {
            console.log('\n✅ User already has PROCUREMENT_OFFICER role');
            return;
        }

        // Add the role to the user
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: procurementRole.id
            }
        });

        console.log('\n✅ Added PROCUREMENT_OFFICER role to committee@bsj.gov.jm');
        
        // Verify
        const updated = await prisma.user.findUnique({
            where: { email: 'committee@bsj.gov.jm' },
            include: { roles: { include: { role: true } } }
        });

        console.log('\n📋 Updated roles:');
        updated.roles.forEach(r => console.log(`  - ${r.role.name}`));
        
        console.log('\n💡 You can now switch between Procurement and Innovation Hub!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addDualRole();
