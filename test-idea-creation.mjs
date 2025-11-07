#!/usr/bin/env node
// Test creating an idea via the API
import 'dotenv/config';

const API_URL = 'http://localhost:4000';
const TEST_USER_ID = 1; // eric.finance@bsj.gov.jm

async function testIdeaCreation() {
  console.log('Testing idea creation via API...\n');
  
  const testIdea = {
    title: 'Test Idea via API',
    description: 'This is a test to verify ideas are being saved to the database',
    category: 'TECHNOLOGY',
    expectedBenefits: 'Verify data flow',
    implementationNotes: 'This is a test'
  };
  
  try {
    console.log('1. POST /api/ideas with user ID:', TEST_USER_ID);
    const response = await fetch(`${API_URL}/api/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(TEST_USER_ID),
      },
      body: JSON.stringify(testIdea)
    });
    
    console.log('   Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('   ❌ Error:', errorText);
      return;
    }
    
    const createdIdea = await response.json();
    console.log('   ✓ Created idea ID:', createdIdea.id);
    console.log('   ✓ Title:', createdIdea.title);
    console.log('   ✓ Status:', createdIdea.status);
    console.log('   ✓ Submitted by:', createdIdea.submittedBy);
    
    // Now verify it's in the database
    console.log('\n2. Verify in database...');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const dbIdea = await prisma.idea.findUnique({
      where: { id: createdIdea.id }
    });
    
    if (dbIdea) {
      console.log('   ✓ Found in database!');
      console.log('   Title:', dbIdea.title);
      console.log('   Category:', dbIdea.category);
      console.log('   Status:', dbIdea.status);
    } else {
      console.log('   ❌ NOT found in database');
    }
    
    await prisma.$disconnect();
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIdeaCreation();
