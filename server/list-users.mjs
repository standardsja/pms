#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: true,
      },
      orderBy: { id: 'asc' },
    });
    
    console.log(`\n👥 Users in database: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('   (No users found)\n');
      console.log('💡 You may need to run the seed script to create users.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'No Name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Department: ${user.department?.name || 'None'}`);
        console.log(`   Has Password: ${user.passwordHash ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
