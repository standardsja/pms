import fetch from 'node-fetch';

const API_URL = 'http://spinx-dev:4000';

async function debugNotifications() {
    try {
        // Login as procurement officer
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'proc1@bsj.gov.jm',
                password: 'Passw0rd!',
            }),
        });

        const loginData = await loginResponse.json();
        console.log('Login data:', loginData);

        // Fetch notifications
        const notificationsResponse = await fetch(`${API_URL}/api/notifications`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${loginData.token}` },
        });

        const rawText = await notificationsResponse.text();
        console.log('Raw notifications response:', rawText);

        try {
            const notificationsData = JSON.parse(rawText);
            console.log('Parsed notifications:', notificationsData);
        } catch (e) {
            console.log('Failed to parse as JSON:', e.message);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugNotifications();
