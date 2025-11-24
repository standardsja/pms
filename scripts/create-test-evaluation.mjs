/**
 * Create Test Evaluation
 * Creates a sample evaluation for testing the committee workflow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Creating test evaluation...\n');

    try {
        // Find a user to be the creator (preferably a procurement officer)
        const creator = await prisma.user.findFirst({
            where: {
                OR: [{ roles: { has: 'PROCUREMENT_OFFICER' } }, { roles: { has: 'PROCUREMENT_MANAGER' } }, { roles: { has: 'ADMIN' } }],
            },
        });

        if (!creator) {
            console.error('❌ No suitable user found to create evaluation');
            console.log('Please create a user with PROCUREMENT_OFFICER or ADMIN role first');
            return;
        }

        console.log(`✅ Found creator: ${creator.name} (${creator.email})\n`);

        // Create a test evaluation
        const evaluation = await prisma.evaluation.create({
            data: {
                evalNumber: `TEST-EVAL-${Date.now()}`,
                rfqNumber: 'RFQ/TEST/2025/001',
                rfqTitle: 'Procurement of Office Supplies',
                description: 'Test evaluation for committee workflow verification',
                status: 'IN_PROGRESS',
                createdBy: creator.id,
                evaluator: creator.name,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                sectionA: {
                    comparableEstimate: 50000,
                    fundedBy: 'BSJ',
                    tenderClosingDate: '2025-12-01',
                    tenderOpeningDate: '2025-12-01',
                    actualOpeningDate: '2025-12-01',
                    procurementMethod: 'NATIONAL_COMPETITIVE_BIDDING',
                    advertisementMethods: ['Email', 'GOJEP'],
                    contractType: 'GOODS',
                    bidSecurity: 'No',
                    tenderPeriodDays: 7,
                    bidValidityDays: 30,
                    bidValidityExpiration: '2025-12-31',
                    numberOfBidsRequested: 5,
                    numberOfBidsReceived: 3,
                    arithmeticErrorIdentified: false,
                    retender: false,
                    awardCriteria: 'MOST_ADVANTAGEOUS_BID',
                },
                // Section statuses will default to NOT_STARTED
            },
        });

        console.log('✅ Test evaluation created successfully!');
        console.log('\nEvaluation Details:');
        console.log(`  ID: ${evaluation.id}`);
        console.log(`  Number: ${evaluation.evalNumber}`);
        console.log(`  RFQ: ${evaluation.rfqNumber}`);
        console.log(`  Title: ${evaluation.rfqTitle}`);
        console.log(`  Status: ${evaluation.status}`);
        console.log(`  Created by: ${creator.name}`);
        console.log(`\n🔗 Access committee workflow at: /procurement/evaluation/${evaluation.id}/committee`);
        console.log('\nAll sections are in NOT_STARTED state and ready for workflow testing.');
    } catch (error) {
        console.error('❌ Error creating test evaluation:', error.message);
        if (error.code) {
            console.error(`   Error code: ${error.code}`);
        }
    }
}

main()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
