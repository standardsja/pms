import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetProfile() {
    const updated = await prisma.user.update({
        where: { id: 31 },
        data: { profileImage: null },
        select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
        },
    });

    console.log('Profile image reset:');
    console.log(JSON.stringify(updated, null, 2));

    await prisma.$disconnect();
}

resetProfile();
