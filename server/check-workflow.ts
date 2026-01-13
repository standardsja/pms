/**
 * DEVELOPMENT UTILITY - DO NOT USE IN PRODUCTION
 * Development helper script to check workflow statuses and SLAs
 * Run with: npx ts-node server/check-workflow.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // eslint-disable-next-line no-console
    console.log('=== WorkflowStatus ===');
    const statuses = await prisma.workflowStatus.findMany();
    // eslint-disable-next-line no-console
    console.log(`Found ${statuses.length} statuses:`, statuses);

    // eslint-disable-next-line no-console
    console.log('\n=== WorkflowSLA ===');
    const slas = await prisma.workflowSLA.findMany();
    // eslint-disable-next-line no-console
    console.log(`Found ${slas.length} SLAs:`, slas);

    await prisma.$disconnect();
}

main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
