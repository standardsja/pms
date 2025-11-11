import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIdeas() {
    const ideas = await prisma.idea.findMany({
        select: { id: true, title: true, status: true }
    });
    
    console.log('Ideas in database:');
    ideas.forEach(i => console.log(`  ${i.id}: ${i.title.substring(0, 50)} - ${i.status}`));
    
    await prisma.$disconnect();
}

checkIdeas().catch(e => {
    console.error(e);
    process.exit(1);
});
