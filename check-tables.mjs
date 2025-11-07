#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  console.log('Current database tables:');
  console.log(tables);
  
  // Check if Idea table exists
  const ideaExists = tables.some(t => Object.values(t)[0].toLowerCase() === 'idea');
  console.log('\nIdea table exists:', ideaExists);
  
} catch (error) {
  console.error('Error checking tables:', error);
} finally {
  await prisma.$disconnect();
}
