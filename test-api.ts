import http from 'http';

const testEndpoint = (path: string, headers: Record<string, string> = {}) => {
  return new Promise<string>((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error.message);
      reject(error);
    });

    req.end();
  });
};

async function runTests() {
  console.log('Testing health endpoint...');
  try {
    await testEndpoint('/health');
  } catch (error) {
    console.error('Health test failed:', error);
  }

  console.log('\nTesting ideas endpoint...');
  try {
    await testEndpoint('/api/ideas', { 'x-user-id': '1' });
  } catch (error) {
    console.error('Ideas test failed:', error);
  }
}

runTests().then(() => {
  console.log('Tests completed');
  process.exit(0);
}).catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});