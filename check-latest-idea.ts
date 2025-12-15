import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestIdea() {
    const user3Ideas = await prisma.idea.findMany({
        where: { submittedBy: 3 },
        select: { id: true, title: true, submittedBy: true, status: true, createdAt: true },
        orderBy: { id: 'desc' },
    });
    console.log('User 3 ideas:', user3Ideas);

    await prisma.$disconnect();
}

checkLatestIdea().catch(console.error);
