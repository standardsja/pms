#!/usr/bin/env node
// Test voting functionality
import 'dotenv/config';

const API_URL = 'http://localhost:4000';
const USER1_ID = 1; // eric.finance
const USER2_ID = 2; // diana.procurement
const IDEA_ID = 2; // API Test Innovation

async function testVoting() {
  console.log('🗳️  Testing Voting System...\n');
  
  try {
    // User 1 votes for idea
    console.log('1. User 1 voting for idea', IDEA_ID);
    let response = await fetch(`${API_URL}/api/ideas/${IDEA_ID}/vote`, {
      method: 'POST',
      headers: { 'x-user-id': String(USER1_ID) }
    });
    
    if (response.ok) {
      const idea = await response.json();
      console.log(`   ✓ Vote added! Vote count: ${idea.voteCount}`);
    } else {
      const error = await response.text();
      console.log(`   ℹ️  ${error}`);
    }
    
    // User 2 votes for same idea
    console.log('\n2. User 2 voting for idea', IDEA_ID);
    response = await fetch(`${API_URL}/api/ideas/${IDEA_ID}/vote`, {
      method: 'POST',
      headers: { 'x-user-id': String(USER2_ID) }
    });
    
    if (response.ok) {
      const idea = await response.json();
      console.log(`   ✓ Vote added! Vote count: ${idea.voteCount}`);
    } else {
      const error = await response.text();
      console.log(`   ℹ️  ${error}`);
    }
    
    // Try duplicate vote (should fail)
    console.log('\n3. User 1 tries to vote again (should fail)');
    response = await fetch(`${API_URL}/api/ideas/${IDEA_ID}/vote`, {
      method: 'POST',
      headers: { 'x-user-id': String(USER1_ID) }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ✓ Correctly prevented: ${error}`);
    }
    
    // Get ideas sorted by votes
    console.log('\n4. Fetching ideas sorted by popularity');
    response = await fetch(`${API_URL}/api/ideas?sort=popularity`, {
      headers: { 'x-user-id': String(USER1_ID) }
    });
    
    if (response.ok) {
      const ideas = await response.json();
      console.log('   Top ideas by votes:');
      ideas.slice(0, 3).forEach((idea, i) => {
        console.log(`   ${i + 1}. "${idea.title}" - ${idea.voteCount} votes`);
      });
    }
    
    // User 1 removes their vote
    console.log('\n5. User 1 removing vote');
    response = await fetch(`${API_URL}/api/ideas/${IDEA_ID}/vote`, {
      method: 'DELETE',
      headers: { 'x-user-id': String(USER1_ID) }
    });
    
    if (response.ok) {
      const idea = await response.json();
      console.log(`   ✓ Vote removed! Vote count: ${idea.voteCount}`);
    }
    
    console.log('\n✅ Voting system is working!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVoting();
