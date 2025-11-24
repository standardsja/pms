import fetch from 'node-fetch';

async function testCombineRoutes() {
    console.log('🧪 Testing Combine Routes...');

    try {
        // First login as a procurement officer
        console.log('1️⃣ Logging in as procurement officer...');
        const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'proc1@bsj.gov.jm',
                password: 'Passw0rd!',
            }),
        });

        if (!loginResponse.ok) {
            throw new Error('Login failed');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');

        // Test GET /api/requests/combine (fetch combinable requests)
        console.log('2️⃣ Testing GET /api/requests/combine...');
        const getResponse = await fetch('http://localhost:4000/api/requests/combine?combinable=true', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('GET Response status:', getResponse.status);
        if (!getResponse.ok) {
            const errorText = await getResponse.text();
            console.log('GET Error response:', errorText);
        } else {
            const data = await getResponse.json();
            console.log('✅ GET /api/requests/combine working - found', data.length || 0, 'combinable requests');
        }

        // Test POST /api/requests/combine (just verify endpoint exists - don't actually combine)
        console.log('3️⃣ Testing POST /api/requests/combine endpoint availability...');
        const postResponse = await fetch('http://localhost:4000/api/requests/combine', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Minimal test payload to see if endpoint exists
                title: 'Test',
                description: 'Test',
                items: [],
                originalRequestIds: [],
            }),
        });

        console.log('POST Response status:', postResponse.status);
        if (postResponse.status === 400 || postResponse.status === 422) {
            console.log('✅ POST /api/requests/combine endpoint exists (validation error expected with minimal payload)');
        } else if (postResponse.ok) {
            console.log('✅ POST /api/requests/combine endpoint working');
        } else {
            const errorText = await postResponse.text();
            console.log('POST Error response:', errorText);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCombineRoutes();
