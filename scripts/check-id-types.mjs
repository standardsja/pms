// Quick check of actual ID types in database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIds() {
  try {
    console.log('Checking actual ID types in database...\n');
    
    // Get first idea
    const ideas = await prisma.idea.findMany({ take: 3 });
    console.log('Sample Idea IDs:');
    ideas.forEach(i => {
      console.log(`  ID: ${i.id} (type: ${typeof i.id})`);
      console.log(`  submittedBy: ${i.submittedBy} (type: ${typeof i.submittedBy})`);
    });
    
    // Get first user
    const users = await prisma.user.findMany({ take: 3 });
    console.log('\nSample User IDs:');
    users.forEach(u => {
      console.log(`  ID: ${u.id} (type: ${typeof u.id}), email: ${u.email}`);
    });
    
    // Get votes
    const votes = await prisma.vote.findMany({ take: 3 });
    console.log('\nSample Vote records:');
    votes.forEach(v => {
      console.log(`  ideaId: ${v.ideaId} (type: ${typeof v.ideaId}), userId: ${v.userId} (type: ${typeof v.userId})`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkIds();
