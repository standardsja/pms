#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIdeaCreation() {
  try {
    console.log('Testing idea creation...\n');
    
    // Check if we have any users first
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      console.error('❌ No users found in database. Please create a user first.');
      return;
    }
    
    const testUser = users[0];
    console.log(`✓ Found test user: ${testUser.name || testUser.email} (ID: ${testUser.id})\n`);
    
    // Create a test idea
    const idea = await prisma.idea.create({
      data: {
        title: 'Test Innovation Idea',
        description: 'This is a test idea to verify the Innovation Hub is working correctly.',
        category: 'TECHNOLOGY',
        status: 'PENDING_REVIEW',
        submittedBy: testUser.id,
      },
    });
    
    console.log('✓ Test idea created successfully:');
    console.log(`  ID: ${idea.id}`);
    console.log(`  Title: ${idea.title}`);
    console.log(`  Category: ${idea.category}`);
    console.log(`  Status: ${idea.status}`);
    console.log(`  Submitted By: ${idea.submittedBy}`);
    console.log(`  Created At: ${idea.createdAt}\n`);
    
    // Verify it can be retrieved
    const retrieved = await prisma.idea.findUnique({
      where: { id: idea.id },
    });
    
    if (retrieved) {
      console.log('✓ Idea can be retrieved from database\n');
    } else {
      console.error('❌ Failed to retrieve idea\n');
    }
    
    // Count all ideas
    const count = await prisma.idea.count();
    console.log(`📊 Total ideas in database: ${count}\n`);
    
    // Clean up test idea
    await prisma.idea.delete({ where: { id: idea.id } });
    console.log('✓ Test idea cleaned up');
    
    console.log('\n✅ Innovation Hub database is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing idea creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIdeaCreation();
