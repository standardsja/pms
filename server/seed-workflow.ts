import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding workflow configuration...');

    // Create default statuses
    const statuses = await prisma.workflowStatus.createMany({
        data: [
            {
                statusId: 'DRAFT',
                name: 'Draft',
                description: 'Initial request draft',
                color: '#9CA3AF',
                displayOrder: 1,
                isActive: true,
            },
            {
                statusId: 'SUBMITTED',
                name: 'Submitted',
                description: 'Submitted for review',
                color: '#3B82F6',
                displayOrder: 2,
                isActive: true,
            },
            {
                statusId: 'PROCESSING',
                name: 'Processing',
                description: 'Being processed',
                color: '#F59E0B',
                displayOrder: 3,
                isActive: true,
            },
            {
                statusId: 'APPROVED',
                name: 'Approved',
                description: 'Approved by reviewer',
                color: '#10B981',
                displayOrder: 4,
                isActive: true,
            },
            {
                statusId: 'REJECTED',
                name: 'Rejected',
                description: 'Rejected by reviewer',
                color: '#EF4444',
                displayOrder: 5,
                isActive: true,
            },
        ],
        skipDuplicates: true,
    });

    console.log(`✅ Created ${statuses.count} workflow statuses`);

    // Create default SLAs
    const slas = await prisma.workflowSLA.createMany({
        data: [
            {
                slaId: 'draft-submit',
                name: 'Draft to Submission',
                description: 'Time to submit a draft request',
                fromStatus: 'DRAFT',
                toStatus: 'SUBMITTED',
                slaHours: 72,
                isActive: true,
            },
            {
                slaId: 'submit-approval',
                name: 'Submission to Approval',
                description: 'Time to approve/reject a submitted request',
                fromStatus: 'SUBMITTED',
                toStatus: 'APPROVED',
                slaHours: 48,
                isActive: true,
            },
            {
                slaId: 'submit-processing',
                name: 'Submission to Processing',
                description: 'Time to start processing submitted request',
                fromStatus: 'SUBMITTED',
                toStatus: 'PROCESSING',
                slaHours: 24,
                isActive: true,
            },
            {
                slaId: 'processing-approval',
                name: 'Processing to Approval',
                description: 'Time to complete processing and approve',
                fromStatus: 'PROCESSING',
                toStatus: 'APPROVED',
                slaHours: 24,
                isActive: true,
            },
        ],
        skipDuplicates: true,
    });

    console.log(`✅ Created ${slas.count} workflow SLAs`);

    // Verify
    const finalStatuses = await prisma.workflowStatus.findMany();
    const finalSlas = await prisma.workflowSLA.findMany();

    console.log(`\n📊 Database Status:`);
    console.log(`   WorkflowStatus: ${finalStatuses.length} records`);
    console.log(`   WorkflowSLA: ${finalSlas.length} records`);

    await prisma.$disconnect();
    console.log('\n✨ Seeding complete!');
}

main().catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
});
