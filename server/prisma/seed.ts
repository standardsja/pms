// server/prisma/seed.ts - Simple seed for test users
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

console.log('SEED FILE:', import.meta.url);
import { PrismaClient } from '../../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test users...');

  const TEST_PASSWORD = 'Passw0rd!';
  const testHash = await bcrypt.hash(TEST_PASSWORD, 10);

  // Create test users
  const testUser1 = await prisma.user.upsert({
    where: { email: 'test1@bsj.gov.jm' },
    update: { passwordHash: testHash },
    create: {
      email: 'test1@bsj.gov.jm',
      name: 'Test User 1',
      passwordHash: testHash,
      role: 'USER',
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'test2@bsj.gov.jm' },
    update: { passwordHash: testHash },
    create: {
      email: 'test2@bsj.gov.jm',
      name: 'Test User 2',
      passwordHash: testHash,
      role: 'USER',
    },
  });

  const committeeUser = await prisma.user.upsert({
    where: { email: 'committee@bsj.gov.jm' },
    update: { passwordHash: testHash },
    create: {
      email: 'committee@bsj.gov.jm',
      name: 'Committee Member',
      passwordHash: testHash,
      role: 'INNOVATION_COMMITTEE',
    },
  });

  console.log(' Created/updated test users:');
  console.log('   - test1@bsj.gov.jm (Password: Passw0rd!)');
  console.log('   - test2@bsj.gov.jm (Password: Passw0rd!)');
  console.log('   - committee@bsj.gov.jm (Password: Passw0rd!) [COMMITTEE ROLE]');
  console.log('Seed complete ');
}

main()
  .catch((e) => {
    console.error('Seed failed ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
