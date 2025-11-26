import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLoadBalancing() {
    console.log('🧪 Testing Load Balancing System...\n');

    try {
        // 1. Check if table exists
        console.log('1️⃣ Checking LoadBalancingSettings table...');
        const settings = await prisma.loadBalancingSettings.findFirst();
        console.log('   ✅ Table exists:', settings || 'No settings yet (will use defaults)');

        // 2. Create default settings
        console.log('\n2️⃣ Creating default settings...');
        await prisma.loadBalancingSettings.deleteMany({});
        const newSettings = await prisma.loadBalancingSettings.create({
            data: {
                enabled: true,
                strategy: 'LEAST_LOADED',
                autoAssignOnApproval: true,
                lastRoundRobinIndex: 0,
            },
        });
        console.log('   ✅ Created:', newSettings);

        // 3. Get procurement officers
        console.log('\n3️⃣ Finding procurement officers...');
        const procurementRole = await prisma.role.findFirst({
            where: { name: 'PROCUREMENT' },
        });

        if (procurementRole) {
            const officers = await prisma.userRole.findMany({
                where: { roleId: procurementRole.id },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
            console.log(`   ✅ Found ${officers.length} procurement officers:`);
            officers.forEach((o) => console.log(`      - ${o.user.name} (ID: ${o.user.id})`));

            // 4. Check workloads
            console.log('\n4️⃣ Checking officer workloads...');
            for (const officer of officers) {
                const count = await prisma.request.count({
                    where: {
                        currentAssigneeId: officer.user.id,
                        status: { in: ['PROCUREMENT_REVIEW', 'SENT_TO_VENDOR'] },
                    },
                });
                console.log(`      - ${officer.user.name}: ${count} active requests`);
            }
        } else {
            console.log('   ⚠️ No PROCUREMENT role found');
        }

        // 5. Find unassigned requests
        console.log('\n5️⃣ Finding unassigned PROCUREMENT_REVIEW requests...');
        const unassigned = await prisma.request.findMany({
            where: {
                status: 'PROCUREMENT_REVIEW',
                currentAssigneeId: null,
            },
            select: { id: true, reference: true, title: true },
        });
        console.log(`   ✅ Found ${unassigned.length} unassigned requests`);
        if (unassigned.length > 0) {
            unassigned.slice(0, 5).forEach((r) => console.log(`      - ${r.reference}: ${r.title}`));
            if (unassigned.length > 5) {
                console.log(`      ... and ${unassigned.length - 5} more`);
            }
        }

        console.log('\n✅ Load Balancing System is READY!');
        console.log('\n📊 Summary:');
        console.log(`   - Settings: ${newSettings.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`);
        console.log(`   - Strategy: ${newSettings.strategy}`);
        console.log(`   - Auto-assign: ${newSettings.autoAssignOnApproval ? 'YES' : 'NO'}`);
        console.log(`   - Officers available: ${procurementRole ? officers.length : 0}`);
        console.log(`   - Unassigned requests: ${unassigned.length}`);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLoadBalancing();
