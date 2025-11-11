import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

async function testVote() {
  console.log('Testing vote endpoint...');
  
  // Test with idea ID 7 (from the error logs)
  const ideaId = 7;
  const userId = 38; // test1@bsj.gov.jm - newly created user
  
  try {
    const response = await fetch(`${BASE_URL}/api/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId)
      },
      body: JSON.stringify({ voteType: 'UPVOTE' })
    });
    
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', text);
    
    if (!response.ok) {
      console.error('Vote failed with status:', response.status);
    }
  } catch (err) {
    console.error('Error calling vote endpoint:', err);
  }
}

testVote();
