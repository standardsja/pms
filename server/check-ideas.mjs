#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIdeas() {
  try {
    const ideas = await prisma.idea.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`\n📊 Ideas currently in database: ${ideas.length}\n`);
    
    if (ideas.length === 0) {
      console.log('   (No ideas found)\n');
    } else {
      ideas.forEach((idea, index) => {
        console.log(`${index + 1}. ${idea.title}`);
        console.log(`   ID: ${idea.id}`);
        console.log(`   Category: ${idea.category}`);
        console.log(`   Status: ${idea.status}`);
        console.log(`   Submitted By: User ${idea.submittedBy}`);
        console.log(`   Created: ${idea.createdAt}`);
        console.log(`   Votes: ${idea.voteCount}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkIdeas();
