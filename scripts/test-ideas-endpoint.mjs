import fetch from 'node-fetch';

async function testIdeasEndpoint() {
  console.log('Testing /api/ideas endpoint...\n');
  
  const tests = [
    { url: 'http://localhost:4000/api/ideas', desc: 'All ideas' },
    { url: 'http://localhost:4000/api/ideas?status=pending', desc: 'Pending ideas' },
    { url: 'http://localhost:4000/api/ideas?status=approved', desc: 'Approved ideas' },
  ];
  
  for (const test of tests) {
    try {
      console.log(`📡 Testing: ${test.desc}`);
      const response = await fetch(test.url);
      const text = await response.text();
      
      if (!response.ok) {
        console.log(`   ❌ Status: ${response.status}`);
        console.log(`   Error: ${text}\n`);
        continue;
      }
      
      const data = JSON.parse(text);
      console.log(`   ✅ Status: ${response.status}, Ideas: ${data.length}\n`);
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}\n`);
    }
  }
}

testIdeasEndpoint();
