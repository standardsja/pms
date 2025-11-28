import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkStatusEnum() {
    try {
        const result = await prisma.$queryRaw`SHOW COLUMNS FROM Request WHERE Field = 'status'`;
        console.log('Status column info:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatusEnum();
