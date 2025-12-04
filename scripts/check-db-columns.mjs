import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
    const result = await prisma.$queryRaw`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'db_spinx' 
        AND TABLE_NAME = 'Request' 
        AND COLUMN_NAME IN ('isCombined', 'combinedRequestId', 'lotNumber', 'headerDeptCode', 'headerMonth', 'headerYear', 'headerSequence')
    `;

    console.log('Found columns in database:', result);
    console.log('Number of matching columns:', result.length);
} catch (e) {
    console.error('Error:', e.message);
} finally {
    await prisma.$disconnect();
}
