import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRoles() {
    try {
        console.log('\n🔍 Checking procurement-related roles...\n');
        
        const roles = await prisma.role.findMany({
            where: {
                OR: [
                    { name: { contains: 'PROCUR' } },
                    { name: { contains: 'Procur' } },
                ]
            }
        });
        
        console.log('Found roles:', JSON.stringify(roles, null, 2));
        
        // Also check users with procurement in their role
        const users = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: {
                                contains: 'PROCUR'
                            }
                        }
                    }
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
        
        console.log('\n👥 Users with procurement roles:');
        users.forEach(u => {
            console.log(`  - ${u.name} (${u.email}): ${u.roles.map(r => r.role.name).join(', ')}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRoles();
