import { prisma } from '../server/prismaClient';
async function main() {
  const rows = await prisma.evaluation.findMany({
    select: { id: true, evalNumber: true, dateSubmissionConsidered: true, reportCompletionDate: true, createdAt: true },
    orderBy: { id: 'desc' },
    take: 5,
  });
  console.log(JSON.stringify(rows, null, 2));
}
main().finally(async () => {
  await prisma.$disconnect();
});
