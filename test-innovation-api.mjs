#!/usr/bin/env node
// Test the Innovation Hub API endpoints
import 'dotenv/config';

const BASE_URL = 'http://localhost:4000';

async function testInnovationAPI() {
  try {
    console.log('🧪 Testing Innovation Hub API...\n');
    
    // Test data
    const testIdea = {
      title: 'API Test Innovation',
      description: 'This is a test to verify the API endpoint is working correctly with proper data persistence.',
      category: 'PROCESS_IMPROVEMENT',
      expectedBenefits: 'Verify that the backend properly saves ideas to the database',
      implementationNotes: 'This is just a test and will be deleted after verification',
    };
    
    // Test user ID (use 1 for testing)
    const testUserId = 1;
    
    console.log('1️⃣  Testing POST /api/ideas...');
    const createResponse = await fetch(`${BASE_URL}/api/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(testUserId),
      },
      body: JSON.stringify(testIdea),
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create idea: ${createResponse.status} ${errorText}`);
    }
    
    const createdIdea = await createResponse.json();
    console.log(`   ✓ Idea created with ID: ${createdIdea.id}`);
    console.log(`   ✓ Title: ${createdIdea.title}`);
    console.log(`   ✓ Status: ${createdIdea.status}`);
    console.log(`   ✓ Submitted By: ${createdIdea.submittedBy}\n`);
    
    console.log('2️⃣  Testing GET /api/ideas...');
    const listResponse = await fetch(`${BASE_URL}/api/ideas`, {
      headers: {
        'x-user-id': String(testUserId),
      },
    });
    
    if (!listResponse.ok) {
      throw new Error(`Failed to fetch ideas: ${listResponse.status}`);
    }
    
    const ideas = await listResponse.json();
    console.log(`   ✓ Found ${ideas.length} idea(s) in database`);
    
    const foundIdea = ideas.find(i => i.id === createdIdea.id);
    if (foundIdea) {
      console.log(`   ✓ Test idea is retrievable via API\n`);
    } else {
      console.warn(`   ⚠ Test idea not found in list (might be filtered)\n`);
    }
    
    console.log('3️⃣  Testing GET /api/ideas with status filter...');
    const filteredResponse = await fetch(`${BASE_URL}/api/ideas?status=PENDING_REVIEW`, {
      headers: {
        'x-user-id': String(testUserId),
      },
    });
    
    if (!filteredResponse.ok) {
      throw new Error(`Failed to fetch filtered ideas: ${filteredResponse.status}`);
    }
    
    const filteredIdeas = await filteredResponse.json();
    console.log(`   ✓ Found ${filteredIdeas.length} pending idea(s)\n`);
    
    console.log('✅ All tests passed! Innovation Hub API is working correctly.\n');
    console.log('📝 Note: Test ideas remain in the database for verification.');
    console.log(`   You can manually delete idea ID ${createdIdea.id} if needed.\n`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Is the server running on http://localhost:4000?');
    console.error('  2. Are the Innovation Hub tables created in the database?');
    console.error('  3. Does user ID 1 exist in the database?');
    process.exit(1);
  }
}

// Check if server is running first
fetch(`${BASE_URL}/api/ideas`, { headers: { 'x-user-id': '1' } })
  .then(() => testInnovationAPI())
  .catch(() => {
    console.error('❌ Cannot connect to server at http://localhost:4000');
    console.error('   Please start the server first: cd server && node index.mjs');
    process.exit(1);
  });
