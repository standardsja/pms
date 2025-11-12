#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.request.groupBy({
    by: ['currency'],
    _count: { _all: true },
  }).catch(() => []);
  console.log('[currency-migrate] Before:', before);

  const updatedNull = await prisma.request.updateMany({
    where: { currency: null },
    data: { currency: 'JMD' },
  });
  const updatedUsd = await prisma.request.updateMany({
    where: { currency: 'USD' },
    data: { currency: 'JMD' },
  });

  console.log('[currency-migrate] Set JMD for NULL:', updatedNull.count);
  console.log('[currency-migrate] Set JMD for USD :', updatedUsd.count);

  const after = await prisma.request.groupBy({
    by: ['currency'],
    _count: { _all: true },
  }).catch(() => []);
  console.log('[currency-migrate] After:', after);
}

main().catch((e) => {
  console.error('[currency-migrate] Failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
