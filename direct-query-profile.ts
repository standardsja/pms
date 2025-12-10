import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProfileImage() {
    const user = await prisma.user.findUnique({
        where: { id: 30 },
        select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
        },
    });

    console.log('✅ Direct Prisma Query Result:');
    console.log(JSON.stringify(user, null, 2));

    if (user?.profileImage) {
        console.log(`\n✅ profileImage EXISTS: ${user.profileImage}`);
    } else {
        console.log('\n❌ profileImage is NULL or undefined');
    }

    await prisma.$disconnect();
}

checkProfileImage();
