import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findExecutiveDirector() {
    try {
        const ed = await prisma.user.findFirst({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'EXECUTIVE_DIRECTOR',
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

        if (ed) {
            console.log('✅ Executive Director found:');
            console.log(`   Name: ${ed.name}`);
            console.log(`   ID: ${ed.id}`);
            console.log(`   Email: ${ed.email}`);
        } else {
            console.log('❌ No Executive Director found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findExecutiveDirector();
