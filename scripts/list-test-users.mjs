import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTestUsers() {
    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: 'test' } },
                    { email: { contains: 'bsj.gov.jm' } }
                ]
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: {
                email: 'asc'
            }
        });

        console.log('\n📋 All BSJ Test Users:\n');
        users.forEach(user => {
            const roles = user.roles.map(r => r.role.name).join(', ') || 'No roles';
            console.log(`${user.email.padEnd(30)} - ${roles}`);
        });

        console.log(`\n✅ Total users: ${users.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

listTestUsers();
