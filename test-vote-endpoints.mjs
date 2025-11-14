#!/usr/bin/env node
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';
const TEST_EMAIL = 'eric.finance@bsj.gov.jm';
const TEST_PASSWORD = 'password123';

async function testVoteEndpoints() {
  console.log('🧪 Testing Vote Endpoints...\n');
  
  try {
    // 1. First login to get a token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ Login failed:', error);
      return;
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Login successful');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // 2. Get ideas to see current vote counts
    console.log('\n2. Fetching ideas...');
    const ideasResponse = await fetch(`${BASE_URL}/api/ideas`, { headers });
    
    if (!ideasResponse.ok) {
      console.error('❌ Failed to fetch ideas:', await ideasResponse.text());
      return;
    }
    
    const ideas = await ideasResponse.json();
    console.log(`✅ Found ${ideas.length} ideas`);
    
    if (ideas.length > 0) {
      const idea = ideas[0];
      console.log(`\nTesting with idea: "${idea.title}" (ID: ${idea.id})`);
      console.log(`Current votes - Up: ${idea.upvoteCount || 0}, Down: ${idea.downvoteCount || 0}, Total: ${idea.voteCount || 0}`);
      console.log(`User voted: ${idea.hasVoted ? 'Yes' : 'No'}`);
      
      // 3. Test voting
      console.log('\n3. Testing vote...');
      const voteResponse = await fetch(`${BASE_URL}/api/ideas/${idea.id}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ voteType: 'UPVOTE' })
      });
      
      if (voteResponse.ok) {
        const votedIdea = await voteResponse.json();
        console.log('✅ Vote successful!');
        console.log(`New votes - Up: ${votedIdea.upvoteCount}, Down: ${votedIdea.downvoteCount}, Total: ${votedIdea.voteCount}`);
      } else {
        const error = await voteResponse.text();
        console.log('ℹ️  Vote response:', error);
      }
      
      // 4. Test removing vote
      console.log('\n4. Testing vote removal...');
      const removeVoteResponse = await fetch(`${BASE_URL}/api/ideas/${idea.id}/vote`, {
        method: 'DELETE',
        headers
      });
      
      if (removeVoteResponse.ok) {
        const unvotedIdea = await removeVoteResponse.json();
        console.log('✅ Vote removal successful!');
        console.log(`Final votes - Up: ${unvotedIdea.upvoteCount}, Down: ${unvotedIdea.downvoteCount}, Total: ${unvotedIdea.voteCount}`);
      } else {
        const error = await removeVoteResponse.text();
        console.log('ℹ️  Remove vote response:', error);
      }
    }
    
    console.log('\n🎉 Vote endpoint testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVoteEndpoints();