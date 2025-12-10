import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000';

async function testMeEndpoint() {
    try {
        // Simulate the request with user ID 30 (Kymarly)
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
                'x-user-id': '30',
                Authorization: 'Bearer dummy-token-for-testing',
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log('\n✅ /api/auth/me response:');
            console.log(JSON.stringify(data, null, 2));

            if (data.profileImage) {
                console.log(`\n✅ Profile image found: ${data.profileImage}`);
            } else {
                console.log('\n❌ No profileImage in response');
            }
        } else {
            console.log(`\n❌ Request failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testMeEndpoint();
