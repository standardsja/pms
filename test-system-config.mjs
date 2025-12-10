import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.systemConfig.findMany();
    console.log('SystemConfig records:', configs.length);
    configs.forEach((c) => console.log(`  ${c.key} = ${c.value} (${c.valueType})`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
