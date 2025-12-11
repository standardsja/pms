import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePinnedModule() {
    try {
        // Get the current user (ID 3 based on your profile)
        const user = await prisma.user.findUnique({
            where: { id: 3 },
            select: { id: true, name: true, email: true, pinnedModule: true },
        });

        if (!user) {
            console.error('User not found');
            return;
        }

        console.log('Current user:', user);
        console.log('Current pinnedModule:', user.pinnedModule);

        // Update pinnedModule to 'innovation'
        const updated = await prisma.user.update({
            where: { id: 3 },
            data: { pinnedModule: 'innovation' },
        });

        console.log('✅ Updated pinnedModule to:', updated.pinnedModule);
        console.log('Refresh your browser to see the changes.');
    } catch (error) {
        console.error('Error updating pinnedModule:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePinnedModule();
