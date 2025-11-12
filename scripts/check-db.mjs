import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
// Load DATABASE_URL from server/prisma/.env
dotenvConfig({ path: path.resolve(process.cwd(), 'server', 'prisma', '.env') });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log('User count:', count);
    const users = await prisma.user.findMany({ take: 5, select: { email: true, passwordHash: true } });
    console.log(users);
  } catch (e) {
    console.error('DB error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
