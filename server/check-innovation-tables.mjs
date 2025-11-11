#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('Current database tables:');
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log('  -', tableName);
    });
    
    // Check for Innovation Hub tables
    const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
    console.log('\nInnovation Hub tables:');
    console.log('  Idea table exists:', tableNames.includes('idea'));
    console.log('  Vote table exists:', tableNames.includes('vote'));
    console.log('  IdeaComment table exists:', tableNames.includes('ideacomment'));
    console.log('  IdeaAttachment table exists:', tableNames.includes('ideaattachment'));
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
