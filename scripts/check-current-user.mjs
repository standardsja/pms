import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        console.log('🔍 Checking users with PROCUREMENT_MANAGER role...\n');

        const procManagers = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            OR: [{ name: 'PROCUREMENT_MANAGER' }, { name: 'Procurement Manager' }, { name: { contains: 'PROCUREMENT' } }],
                        },
                    },
                },
            },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        console.log(`Found ${procManagers.length} procurement manager(s):\n`);

        procManagers.forEach((user) => {
            console.log(`📧 ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Roles:`, user.roles.map((ur) => ur.role.name).join(', '));
            console.log('');
        });

        // Check for high-value requests
        console.log('\n🔍 Checking for high-value requests (>= JMD 3,000,000)...\n');

        const highValueRequests = await prisma.request.findMany({
            where: {
                totalEstimated: {
                    gte: 3000000,
                },
                status: {
                    not: 'EXECUTIVE_REVIEW',
                },
            },
            select: {
                id: true,
                reference: true,
                title: true,
                totalEstimated: true,
                currency: true,
                status: true,
                procurementType: true,
            },
            take: 10,
        });

        console.log(`Found ${highValueRequests.length} high-value request(s) not in EXECUTIVE_REVIEW:\n`);

        highValueRequests.forEach((req) => {
            console.log(`📝 ID ${req.id}: ${req.title}`);
            console.log(`   Value: ${req.currency} ${Number(req.totalEstimated).toLocaleString()}`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Type: ${Array.isArray(req.procurementType) ? req.procurementType.join(', ') : req.procurementType}`);
            console.log('');
        });
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
