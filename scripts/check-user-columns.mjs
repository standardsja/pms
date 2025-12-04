import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
    const result = await prisma.$queryRaw`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'db_spinx' 
        AND TABLE_NAME = 'User'
        ORDER BY COLUMN_NAME
    `;

    console.log('User table columns:');
    result.forEach((row) => console.log('  -', row.COLUMN_NAME));
} catch (e) {
    console.error('Error:', e.message);
} finally {
    await prisma.$disconnect();
}
