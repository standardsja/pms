// Create fallback users in database so they can vote
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createFallbackUsers() {
  console.log('Creating fallback users...\n');
  
  const password = 'Passw0rd!';
  const hash = await bcrypt.hash(password, 10);
  
  const fallbackUsers = [
    { id: 101, email: 'test1@bsj.gov.jm', name: 'Test User 1' },
    { id: 102, email: 'test2@bsj.gov.jm', name: 'Test User 2' },
  ];
  
  for (const userData of fallbackUsers) {
    // Check by email instead of ID
    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    
    if (existing) {
      console.log(`✓ User ${userData.email} (ID: ${existing.id}) already exists`);
      // Update the fallback users in server to use the correct ID
      if (existing.id !== userData.id) {
        console.log(`  ⚠️  WARNING: Fallback expects ID ${userData.id} but database has ID ${existing.id}`);
        console.log(`  You need to update server/index.mjs fallbackUsers to use ID ${existing.id}`);
      }
    } else {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash: hash,
        }
      });
      console.log(`✓ Created user ${user.email} (ID: ${user.id})`);
      if (user.id !== userData.id) {
        console.log(`  ⚠️  Database assigned ID ${user.id}, but fallback expects ID ${userData.id}`);
        console.log(`  You need to update server/index.mjs fallbackUsers to use ID ${user.id}`);
      }
    }
  }
  
  console.log('\nDone!');
  await prisma.$disconnect();
}

createFallbackUsers().catch(console.error);
