import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllUsers() {
    try {
        // Get current user email from command line argument
        const email = process.argv[2];

        if (!email) {
            console.log('Please provide email as argument');
            console.log('Usage: node fix-innovation-sidebar.mjs user@email.com');
            return;
        }

        const result = await prisma.user.update({
            where: { email },
            data: { pinnedModule: 'innovation' },
        });
        console.log(`✅ Updated ${result.email} - pinnedModule set to: ${result.pinnedModule}`);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixAllUsers();
