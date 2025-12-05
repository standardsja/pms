import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProfiles() {
    const users = await prisma.user.findMany({
        where: {
            profileImage: {
                not: null
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
        }
    });
    
    console.log('Users with profile images:');
    console.log(JSON.stringify(users, null, 2));
    
    await prisma.$disconnect();
}

checkProfiles();
