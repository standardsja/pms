import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('Checking users in database...');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      roles: true
    }
  });
  
  console.log('Found users:');
  users.forEach(u => {
    console.log(`  ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Roles: ${u.roles}`);
  });
  
  console.log('\nChecking idea 7...');
  const idea = await prisma.idea.findUnique({
    where: { id: 7 },
    include: {
      submitter: true,
      votes: {
        include: {
          user: true
        }
      }
    }
  });
  
  if (idea) {
    console.log('Idea 7:', {
      id: idea.id,
      title: idea.title,
      status: idea.status,
      submittedBy: idea.submittedBy,
      submitter: idea.submitter?.email,
      voteCount: idea.voteCount,
      upvoteCount: idea.upvoteCount,
      downvoteCount: idea.downvoteCount,
      votes: idea.votes.length
    });
    console.log('Existing votes:', idea.votes.map(v => ({ userId: v.userId, userEmail: v.user.email, voteType: v.voteType })));
  } else {
    console.log('Idea 7 not found');
  }
  
  await prisma.$disconnect();
}

checkUsers().catch(console.error);
