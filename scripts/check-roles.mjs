import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
    const roles = await prisma.role.findMany({
        select: { id: true, name: true },
    });

    console.log('Available roles:');
    roles.forEach((r) => console.log(`  - ${r.name} (id: ${r.id})`));
} catch (e) {
    console.error('Error:', e.message);
} finally {
    await prisma.$disconnect();
}
