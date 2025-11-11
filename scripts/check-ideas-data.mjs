import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIdeas() {
  console.log('Checking ideas in database...\n');
  
  const ideas = await prisma.idea.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      submittedBy: true,
      voteCount: true,
    }
  });
  
  console.log(`Found ${ideas.length} ideas:`);
  ideas.forEach(i => {
    console.log(`  ID ${i.id}: "${i.title}" by user ${i.submittedBy} [${i.status}]`);
  });
  
  // Check if submitters exist
  console.log('\nChecking if submitters exist...');
  for (const idea of ideas) {
    const user = await prisma.user.findUnique({ where: { id: idea.submittedBy } });
    if (!user) {
      console.log(`  ⚠️  Idea ${idea.id} has invalid submitter ID: ${idea.submittedBy} (user does not exist!)`);
    } else {
      console.log(`  ✅ Idea ${idea.id} submitter: ${user.email}`);
    }
  }
  
  // Try to fetch with include
  console.log('\nTrying to fetch with include submitter...');
  try {
    const ideasWithSubmitter = await prisma.idea.findMany({
      include: { submitter: true, _count: { select: { comments: true } } }
    });
    console.log(`✅ Successfully fetched ${ideasWithSubmitter.length} ideas with submitter`);
  } catch (err) {
    console.log(`❌ Error fetching with include: ${err.message}`);
    console.log(`   Stack:`, err.stack?.split('\n').slice(0, 3));
  }
  
  await prisma.$disconnect();
}

checkIdeas().catch(console.error);
