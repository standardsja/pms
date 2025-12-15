/**
 * Simple test script to verify API connectivity
 */
import fetch from 'node-fetch';

async function testAPI() {
    try {
        console.log('Testing API endpoints...');

        // Test health endpoint
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await fetch('http://spinx-dev:4000/health');
        console.log('Health status:', healthResponse.status);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('Health data:', healthData);
        } else {
            console.log('Health response not OK:', await healthResponse.text());
        }

        // Test ideas endpoint
        console.log('\n2. Testing ideas endpoint...');
        const ideasResponse = await fetch('http://spinx-dev:4000/api/ideas', {
            headers: {
                'x-user-id': '1',
            },
        });
        console.log('Ideas status:', ideasResponse.status);
        if (ideasResponse.ok) {
            const ideasData = await ideasResponse.json();
            console.log(`Found ${ideasData.ideas?.length || 0} ideas`);
        } else {
            console.log('Ideas response not OK:', await ideasResponse.text());
        }
    } catch (error) {
        console.error('API Test Error:', error.message);
    }
}

testAPI();
