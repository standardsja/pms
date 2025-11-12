import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRoles() {
    try {
        const users = await prisma.user.findMany({
            where: {
                email: {
                    in: ['test1@bsj.gov.jm', 'test2@bsj.gov.jm', 'committee@bsj.gov.jm']
                }
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        console.log('User Roles:');
        users.forEach(user => {
            console.log(`\n${user.email} (ID: ${user.id}):`);
            console.log(`  Roles: ${user.roles.map(r => r.role.name).join(', ')}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserRoles();
