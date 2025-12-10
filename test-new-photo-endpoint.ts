import fetch from 'node-fetch';

const TEST_URL = 'http://localhost:4000/api/test/my-photo';

async function testPhotoEndpoint() {
    try {
        console.log('Testing NEW endpoint:', TEST_URL);
        console.log('Making request...\n');

        const response = await fetch(TEST_URL, {
            method: 'GET',
            headers: {
                'x-user-id': '30',
                Authorization: 'Bearer dummy-token-for-testing',
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success && data.data.testMessage) {
            console.log('\n✅ NEW ENDPOINT IS WORKING! Server is running updated code!');
            if (data.data.profileImage) {
                console.log('✅ ProfileImage found:', data.data.profileImage);
            } else {
                console.log('⚠️  ProfileImage is null/undefined');
            }
        }
    } catch (error) {
        console.error('Error testing endpoint:', error);
    }
}

testPhotoEndpoint();
