#!/usr/bin/env node
import 'dotenv/config';

const API_URL = 'http://localhost:4000';

async function testVoteToggle() {
  console.log('\n🧪 Testing Vote Toggle Fix...\n');

  try {
    // Get a test user ID and idea ID
    const userId = 1; // Use your test user ID
    
    // Fetch ideas to get a valid idea ID
    const ideasRes = await fetch(`${API_URL}/api/ideas?status=APPROVED`, {
      headers: {
        'x-user-id': String(userId),
        'Content-Type': 'application/json'
      }
    });
    
    if (!ideasRes.ok) {
      console.error('❌ Failed to fetch ideas:', await ideasRes.text());
      return;
    }
    
    const ideas = await ideasRes.json();
    if (ideas.length === 0) {
      console.log('❌ No approved ideas found to test with');
      return;
    }
    
    const ideaId = ideas[0].id;
    console.log(`✅ Using idea: "${ideas[0].title}" (ID: ${ideaId})`);
    console.log(`   Current vote status: ${ideas[0].hasVoted ? 'Voted (' + ideas[0].userVoteType + ')' : 'Not voted'}`);
    console.log(`   Current vote count: ${ideas[0].voteCount}\n`);

    // Test 1: Vote for the first time (upvote)
    console.log('📝 Test 1: First upvote...');
    let voteRes = await fetch(`${API_URL}/api/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: {
        'x-user-id': String(userId),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voteType: 'UPVOTE' })
    });
    
    let result = await voteRes.json();
    console.log(voteRes.ok ? '✅ Success!' : '❌ Failed!', {
      status: voteRes.status,
      hasVoted: result.hasVoted,
      voteType: result.userVoteType,
      voteCount: result.voteCount
    });

    // Test 2: Click upvote again (should toggle off)
    console.log('\n📝 Test 2: Click same upvote button (should remove vote)...');
    voteRes = await fetch(`${API_URL}/api/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: {
        'x-user-id': String(userId),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voteType: 'UPVOTE' })
    });
    
    result = await voteRes.json();
    console.log(voteRes.ok ? '✅ Success! Vote toggled off' : '❌ Failed!', {
      status: voteRes.status,
      hasVoted: result.hasVoted,
      voteType: result.userVoteType,
      voteCount: result.voteCount
    });

    // Test 3: Vote again (upvote)
    console.log('\n📝 Test 3: Upvote again...');
    voteRes = await fetch(`${API_URL}/api/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: {
        'x-user-id': String(userId),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voteType: 'UPVOTE' })
    });
    
    result = await voteRes.json();
    console.log(voteRes.ok ? '✅ Success!' : '❌ Failed!', {
      status: voteRes.status,
      hasVoted: result.hasVoted,
      voteType: result.userVoteType,
      voteCount: result.voteCount
    });

    // Test 4: Switch to downvote
    console.log('\n📝 Test 4: Switch to downvote...');
    voteRes = await fetch(`${API_URL}/api/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: {
        'x-user-id': String(userId),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voteType: 'DOWNVOTE' })
    });
    
    result = await voteRes.json();
    console.log(voteRes.ok ? '✅ Success! Switched vote' : '❌ Failed!', {
      status: voteRes.status,
      hasVoted: result.hasVoted,
      voteType: result.userVoteType,
      voteCount: result.voteCount
    });

    // Test 5: Toggle downvote off
    console.log('\n📝 Test 5: Click downvote again (should remove vote)...');
    voteRes = await fetch(`${API_URL}/api/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: {
        'x-user-id': String(userId),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voteType: 'DOWNVOTE' })
    });
    
    result = await voteRes.json();
    console.log(voteRes.ok ? '✅ Success! Vote toggled off' : '❌ Failed!', {
      status: voteRes.status,
      hasVoted: result.hasVoted,
      voteType: result.userVoteType,
      voteCount: result.voteCount
    });

    console.log('\n✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVoteToggle();
