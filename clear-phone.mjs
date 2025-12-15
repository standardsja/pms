import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPinnedModule() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'ict.staff1@bsj.gov.jm' },
            select: { id: true, email: true, pinnedModule: true }
        });
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPinnedModule();
