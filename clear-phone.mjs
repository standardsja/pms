import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhone() {
    try {
        const result = await prisma.user.findUnique({
            where: { email: 'srobinson@bsj.org.jm' },
            select: { id: true, name: true, email: true, phone: true }
        });
        console.log('User data:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPhone();
