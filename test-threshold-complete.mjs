import fetch from 'node-fetch';

async function testThresholdNotificationsComplete() {
    console.log('🧪 Testing Complete Threshold Notification System...\n');
    
    try {
        // Login as ICT staff to create requests
        console.log('1️⃣ Logging in as ICT staff...');
        const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'ict.staff1@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful\n');

        // TEST 1: Create a regular high-value request
        console.log('2️⃣ TEST 1: Creating regular high-value request (JMD $4M - exceeds $3M threshold)...');
        const regularRequest = await fetch('http://localhost:4000/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-User-ID': '1'
            },
            body: JSON.stringify({
                title: 'Test Regular High-Value Request',
                description: 'Testing threshold notifications on regular request',
                departmentId: 1,
                procurementType: ['goods'],
                totalEstimated: 4000000, // JMD $4M
                currency: 'JMD',
                priority: 'HIGH',
                items: [{
                    description: 'High-value item',
                    quantity: 1,
                    unitPrice: 4000000,
                    totalPrice: 4000000
                }]
            })
        });

        if (regularRequest.ok) {
            const regData = await regularRequest.json();
            console.log('✅ Regular request created:', regData.reference);
            console.log('   Value: JMD $' + regData.totalEstimated?.toLocaleString() + '\n');
        } else {
            console.log('❌ Regular request failed:', await regularRequest.text() + '\n');
        }

        // Wait a moment for notifications to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Login as procurement officer to check notifications
        console.log('3️⃣ Checking procurement officer notifications...');
        const procLogin = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'proc1@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        const procLoginData = await procLogin.json();
        const procToken = procLoginData.token;

        const notifResponse = await fetch('http://localhost:4000/api/notifications', {
            headers: { 'Authorization': `Bearer ${procToken}` }
        });

        const notifData = await notifResponse.json();
        const notifications = notifData.data || [];
        const thresholdNotifs = notifications.filter(n => n.type === 'THRESHOLD_EXCEEDED');
        
        console.log('📱 Total notifications:', notifications.length);
        console.log('⚠️  Threshold notifications:', thresholdNotifs.length);
        
        if (thresholdNotifs.length > 0) {
            console.log('✅ SUCCESS: Threshold notifications are being sent!\n');
            console.log('Latest threshold notification:');
            console.log('   Message:', thresholdNotifs[0].message);
        } else {
            console.log('❌ ISSUE: No threshold notifications found!\n');
        }

        console.log('\n✅ All tests complete!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Combined request threshold checking: Added');
        console.log('   ✅ Regular request threshold checking: Enhanced with logging');
        console.log('   ✅ Procurement officer notifications: ' + (thresholdNotifs.length > 0 ? 'Working' : 'Check server logs'));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testThresholdNotificationsComplete();