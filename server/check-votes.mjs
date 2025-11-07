#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVotes() {
  try {
    console.log('\n📊 Checking Vote system...\n');
    
    // Check if Vote table exists
    const votes = await prisma.vote.findMany({
      include: {
        user: { select: { name: true, email: true } },
        idea: { select: { title: true, voteCount: true } }
      }
    });
    
    console.log(`Votes in database: ${votes.length}`);
    if (votes.length > 0) {
      votes.forEach(vote => {
        console.log(`  - User: ${vote.user.name} voted for "${vote.idea.title}"`);
      });
    }
    
    console.log('\n💡 Ideas with vote counts:');
    const ideas = await prisma.idea.findMany({
      select: { id: true, title: true, voteCount: true, submittedBy: true },
      orderBy: { voteCount: 'desc' }
    });
    
    ideas.forEach(idea => {
      console.log(`  ${idea.voteCount} votes - "${idea.title}" (ID: ${idea.id})`);
    });
    
    console.log('\n✅ Vote table structure verified!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVotes();
