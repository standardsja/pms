import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== WorkflowStatus ===');
    const statuses = await prisma.workflowStatus.findMany();
    console.log(`Found ${statuses.length} statuses:`, statuses);

    console.log('\n=== WorkflowSLA ===');
    const slas = await prisma.workflowSLA.findMany();
    console.log(`Found ${slas.length} SLAs:`, slas);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
