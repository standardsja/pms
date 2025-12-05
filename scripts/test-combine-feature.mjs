import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCombineFeature() {
    try {
        console.log('\n🧪 Testing Combine Request Feature...\n');

        // 1. Check for users with procurement roles
        console.log('1️⃣ Checking procurement users...');
        const procurementUsers = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: {
                                in: ['PROCUREMENT', 'PROCUREMENT_MANAGER', 'PROCUREMENT_OFFICER'],
                            },
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

        console.log(`   Found ${procurementUsers.length} procurement users:`);
        procurementUsers.forEach((u) => {
            console.log(`   - ${u.name} (${u.email}): ${u.roles.map((r) => r.role.name).join(', ')}`);
        });

        // 2. Check for combinable requests
        console.log('\n2️⃣ Checking combinable requests...');
        const combinableRequests = await prisma.request.findMany({
            where: {
                status: {
                    in: ['DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'PROCUREMENT_REVIEW'],
                },
            },
            include: {
                department: { select: { name: true } },
                requester: { select: { name: true } },
                items: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
        });

        console.log(`   Found ${combinableRequests.length} combinable requests:`);
        combinableRequests.forEach((r) => {
            console.log(`   - ${r.reference}: ${r.title} (${r.status}) - ${r.department?.name || 'No Dept'}`);
            console.log(`     Items: ${r.items.length}, Total: ${r.currency || 'JMD'} ${r.totalEstimated || 0}`);
        });

        // 3. Check RequestStatus enum values
        console.log('\n3️⃣ Checking RequestStatus enum...');
        const enumQuery = await prisma.$queryRaw`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'Request' 
            AND COLUMN_NAME = 'status'
        `;
        console.log('   Status enum values:', enumQuery);

        // 4. Test scenario
        if (combinableRequests.length >= 2 && procurementUsers.length > 0) {
            console.log('\n✅ SYSTEM READY FOR COMBINE:');
            console.log(`   - Can combine ${combinableRequests.length} requests`);
            console.log(`   - ${procurementUsers.length} authorized users`);
            console.log(
                `   - Sample combination: ${combinableRequests
                    .slice(0, 2)
                    .map((r) => r.reference)
                    .join(' + ')}`
            );
        } else {
            console.log('\n⚠️  SYSTEM NOT READY:');
            if (combinableRequests.length < 2) {
                console.log(`   - Need at least 2 combinable requests (found ${combinableRequests.length})`);
            }
            if (procurementUsers.length === 0) {
                console.log('   - Need at least 1 procurement user');
            }
        }

        console.log('\n✅ Test complete!\n');
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCombineFeature();
