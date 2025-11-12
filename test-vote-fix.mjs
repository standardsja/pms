#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testVoteFix() {
  console.log('\n🧪 Testing Vote Fix...\n');

  try {
    // Get a sample idea
    const idea = await prisma.idea.findFirst({
      where: { status: 'APPROVED' },
      include: { votes: true }
    });

    if (!idea) {
      console.log('❌ No approved ideas found to test with');
      return;
    }

    console.log(`✅ Found idea: "${idea.title}" (ID: ${idea.id})`);
    console.log(`   Type of idea.id: ${typeof idea.id}`);
    console.log(`   Current votes: ${idea.votes.length}`);

    // Get a sample user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found to test with');
      return;
    }

    console.log(`✅ Found user: "${user.name}" (ID: ${user.id})`);
    console.log(`   Type of user.id: ${typeof user.id}`);

    // Check if vote exists
    const existingVote = await prisma.vote.findUnique({
      where: {
        ideaId_userId: {
          ideaId: idea.id,
          userId: user.id
        }
      }
    });

    console.log(`\n${existingVote ? '✅' : '❌'} Vote query ${existingVote ? 'WORKS' : 'FAILS'} with string IDs`);
    
    if (existingVote) {
      console.log(`   Found existing vote: ${existingVote.voteType}`);
    }

    // Test vote count
    const voteCount = await prisma.vote.count({
      where: { userId: user.id }
    });
    console.log(`✅ User has ${voteCount} total votes`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVoteFix();
