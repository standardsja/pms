import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkRequestStatuses() {
    try {
        console.log('🔍 Checking Request table for invalid status values...\n');

        // Try to get all requests with raw query to see actual status values
        const rawResults = await prisma.$queryRaw`
            SELECT id, reference, status, title 
            FROM Request 
            LIMIT 10
        `;

        console.log('📋 Raw status values in database:');
        console.log(JSON.stringify(rawResults, null, 2));

        // Try to count requests by status
        const statusCounts = await prisma.$queryRaw`
            SELECT status, COUNT(*) as count 
            FROM Request 
            GROUP BY status
        `;

        console.log('\n📊 Status counts:');
        statusCounts.forEach(row => {
            console.log(`  ${row.status}: ${row.count.toString()}`);
        });

        // Try normal Prisma query
        console.log('\n🔄 Attempting normal Prisma query...');
        try {
            const requests = await prisma.request.findMany({
                take: 5,
                select: {
                    id: true,
                    reference: true,
                    status: true,
                    title: true
                }
            });
            console.log('✅ Prisma query successful! Found', requests.length, 'requests');
            console.log(JSON.stringify(requests, null, 2));
        } catch (prismaError) {
            console.error('❌ Prisma query failed:', prismaError.message);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRequestStatuses();
