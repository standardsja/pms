import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProfilePhotos() {
    const usersWithPhotos = await prisma.user.findMany({
        where: { profileImage: { not: null } },
        select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
        },
    });

    console.log(`\n📷 Users with profile photos: ${usersWithPhotos.length}`);

    if (usersWithPhotos.length > 0) {
        console.log('\n✅ Profile photos found:');
        usersWithPhotos.forEach((user) => {
            console.log(`  - ${user.name || 'Unknown'} (${user.email}): ${user.profileImage}`);
        });
    } else {
        console.log('\n⚠️  No users have profile photos uploaded yet');
    }

    await prisma.$disconnect();
}

checkProfilePhotos().catch((e) => {
    console.error('Error:', e);
    process.exit(1);
});
