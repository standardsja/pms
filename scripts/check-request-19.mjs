import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkRequest19() {
    const request = await prisma.request.findUnique({
        where: { id: 19 },
        select: {
            id: true,
            reference: true,
            status: true,
            title: true,
            currentAssigneeId: true,
            totalEstimated: true,
            currency: true,
        },
    });

    console.log('Request 19:', JSON.stringify(request, null, 2));
    await prisma.$disconnect();
}

checkRequest19();
