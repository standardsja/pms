/**
 * Simple test script to verify API connectivity
 */
import fetch from 'node-fetch';

async function testAPI() {
    try {
        console.log('Testing API endpoints...');

        // Test health endpoint
        console.log('\n1. Testing health endpoint...');
        const apiUrl = process.env.API_URL || 'http://localhost:4000';
        const healthResponse = await fetch(`${apiUrl}/health`);
        console.log('Health status:', healthResponse.status);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('Health data:', healthData);
        } else {
            console.log('Health response not OK:', await healthResponse.text());
        }

        // Test ideas endpoint
        console.log('\n2. Testing ideas endpoint...');
        const ideasResponse = await fetch(`${apiUrl}/api/ideas`, {
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
