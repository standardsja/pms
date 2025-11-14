#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkVoteSchema() {
  try {
    console.log('📊 Checking Vote table schema...\n');
    
    // Get table structure
    const tableInfo = await prisma.$queryRaw`DESCRIBE Vote`;
    console.log('Vote table structure:');
    console.table(tableInfo);
    
    // Check if there are any votes
    const voteCount = await prisma.vote.count();
    console.log(`\nTotal votes in database: ${voteCount}`);
    
    if (voteCount > 0) {
      console.log('\nSample votes:');
      const sampleVotes = await prisma.$queryRaw`SELECT * FROM Vote LIMIT 5`;
      console.table(sampleVotes);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkVoteSchema();