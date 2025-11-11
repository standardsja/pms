// Test API endpoints to verify data is being returned
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

async function testEndpoints() {
  console.log('Testing API endpoints...\n');
  
  const tests = [
    { name: 'DB Health', url: '/api/db/health' },
    { name: 'Get Ideas', url: '/api/ideas' },
    { name: 'Get Users (Admin)', url: '/admin/users' },
  ];
  
  for (const test of tests) {
    try {
      console.log(`📡 Testing: ${test.name} (${test.url})`);
      const response = await fetch(`${BASE_URL}${test.url}`);
      const text = await response.text();
      
      if (!response.ok) {
        console.log(`   ❌ Status: ${response.status}`);
        console.log(`   Response: ${text.substring(0, 200)}\n`);
        continue;
      }
      
      const data = JSON.parse(text);
      console.log(`   ✅ Status: ${response.status}`);
      
      // Show relevant info based on endpoint
      if (test.url.includes('health')) {
        console.log(`   Status: ${data.status}, Users: ${data.userCount}, Ideas: ${data.ideaCount}, Votes: ${data.voteCount}`);
      } else if (Array.isArray(data)) {
        console.log(`   Returned ${data.length} items`);
        if (data.length > 0) {
          console.log(`   Sample:`, JSON.stringify(data[0]).substring(0, 100) + '...');
        }
      } else {
        console.log(`   Data:`, JSON.stringify(data).substring(0, 100) + '...');
      }
      console.log('');
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}\n`);
    }
  }
}

testEndpoints().catch(console.error);
