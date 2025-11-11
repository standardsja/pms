#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVoteCounts() {
  console.log('\n📊 Checking Vote Counts...\n');

  try {
    const ideas = await prisma.idea.findMany({
      where: { status: 'APPROVED' },
      include: {
        votes: true,
        submitter: { select: { name: true } }
      },
      orderBy: { id: 'asc' }
    });

    console.log(`Found ${ideas.length} approved ideas:\n`);

    for (const idea of ideas) {
      const upvotes = idea.votes.filter(v => v.voteType === 'UPVOTE').length;
      const downvotes = idea.votes.filter(v => v.voteType === 'DOWNVOTE').length;
      const actualVoteCount = upvotes - downvotes;

      console.log(`ID ${idea.id}: "${idea.title}"`);
      console.log(`   By: ${idea.submitter?.name || 'Unknown'}`);
      console.log(`   Database voteCount: ${idea.voteCount}`);
      console.log(`   Database upvoteCount: ${idea.upvoteCount}`);
      console.log(`   Database downvoteCount: ${idea.downvoteCount}`);
      console.log(`   Actual votes in DB: ${idea.votes.length} (${upvotes} up, ${downvotes} down)`);
      console.log(`   Calculated score: ${actualVoteCount}`);
      
      if (idea.voteCount !== actualVoteCount) {
        console.log(`   ⚠️  MISMATCH! Database says ${idea.voteCount} but actual is ${actualVoteCount}`);
      } else {
        console.log(`   ✅ Counts match!`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVoteCounts();
