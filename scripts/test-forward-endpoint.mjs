#!/usr/bin/env node
/**
 * Test the forward-to-executive endpoint
 */

const API_BASE = 'http://localhost:4000';

async function testForwardEndpoint() {
    try {
        // First, login as procurement manager
        console.log('1. Logging in as procurement manager...');
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'proc.manager@bsj.gov.jm',
                password: 'Passw0rd!',
            }),
        });

        if (!loginRes.ok) {
            console.error('❌ Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Logged in successfully');
        console.log('   Roles:', loginData.user.roles);

        // Get requests to find one that exceeds threshold
        console.log('\n2. Fetching requests...');
        const requestsRes = await fetch(`${API_BASE}/requests`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const requests = await requestsRes.json();
        const highValueRequest = requests.find((r) => r.totalEstimated > 3000000 && r.status !== 'EXECUTIVE_REVIEW');

        if (!highValueRequest) {
            console.log('❌ No high-value requests found (need > JMD 3M)');
            console.log(
                '   Available requests:',
                requests.map((r) => ({
                    id: r.id,
                    title: r.title,
                    value: r.totalEstimated,
                    currency: r.currency,
                    status: r.status,
                }))
            );
            return;
        }

        console.log('✅ Found high-value request:');
        console.log('   ID:', highValueRequest.id);
        console.log('   Title:', highValueRequest.title);
        console.log('   Value:', highValueRequest.currency, highValueRequest.totalEstimated?.toLocaleString());
        console.log('   Status:', highValueRequest.status);

        // Test the forward endpoint
        console.log('\n3. Testing forward-to-executive endpoint...');
        const forwardRes = await fetch(`${API_BASE}/requests/${highValueRequest.id}/forward-to-executive`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment: 'Test forward from script - high value request requires executive approval',
            }),
        });

        const forwardData = await forwardRes.json();

        if (!forwardRes.ok) {
            console.error('❌ Forward failed:', forwardData);
            return;
        }

        console.log('✅ SUCCESS! Request forwarded to Executive Director');
        console.log('   Response:', forwardData);
        console.log('\n✅ The procurement manager CAN send threshold-exceeding requests to the executive director!');
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testForwardEndpoint();
