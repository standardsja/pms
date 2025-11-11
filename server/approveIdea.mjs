import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function approveIdeas() {
    // Update ideas 2 and 3 to APPROVED so regular users can see them
    await prisma.idea.update({
        where: { id: 2 },
        data: { status: 'APPROVED' }
    });
    
    await prisma.idea.update({
        where: { id: 3 },
        data: { status: 'APPROVED' }
    });
    
    console.log('Updated ideas 2 and 3 to APPROVED status');
    
    await prisma.$disconnect();
}

approveIdeas().catch(e => {
    console.error(e);
    process.exit(1);
});
