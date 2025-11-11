import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  
  console.log('All users in database:');
  users.forEach(u => {
    console.log(`  ID: ${u.id}, Email: ${u.email}, Name: ${u.name}`);
  });
  
  console.log(`\nTotal users: ${users.length}`);
  
  // Check if fallback users exist
  const fallbackIds = [14, 101, 102];
  for (const id of fallbackIds) {
    const user = await prisma.user.findUnique({ where: { id } });
    console.log(`User ID ${id}: ${user ? 'EXISTS' : 'DOES NOT EXIST'}`);
  }
  
  await prisma.$disconnect();
}

listUsers();
