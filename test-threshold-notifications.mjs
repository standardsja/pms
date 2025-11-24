import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';

// Test data for a high-value request that should trigger threshold notifications
const testRequest = {
    title: 'High-Value Test Request for Threshold Notifications',
    description: 'Test request to verify threshold exceeded notifications work correctly',
    departmentId: 1, // ICT Department
    procurementType: ['goods', 'services'],
    fundingSourceId: 1,
    budgetCode: 'TEST-2025-001',
    totalEstimated: 3500000, // JMD $3.5M - exceeds $3M threshold
    currency: 'JMD',
    priority: 'MEDIUM',
    justification: 'Testing threshold notification system',
    items: [
        {
            description: 'High-value procurement item for testing',
            quantity: 1,
            unitPrice: 3500000,
            totalPrice: 3500000
        }
    ]
};

async function testThresholdNotifications() {
    console.log('🧪 Testing Threshold Notification System...');
    
    try {
        // First, login as an ICT staff member to create the request
        console.log('1️⃣ Logging in as ICT staff...');
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'ict.staff1@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Login failed');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');

        // Create the high-value request
        console.log('2️⃣ Creating high-value request (JMD $3.5M)...');
        const requestResponse = await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-User-ID': '1' // ICT staff user ID
            },
            body: JSON.stringify(testRequest)
        });

        if (!requestResponse.ok) {
            const error = await requestResponse.text();
            throw new Error(`Request creation failed: ${error}`);
        }

        const requestData = await requestResponse.json();
        console.log('✅ Request created:', requestData.reference);
        console.log('💰 Total value: JMD $' + requestData.totalEstimated?.toLocaleString());

        // Check for notifications for procurement users
        console.log('3️⃣ Checking notifications for procurement users...');
        
        // Login as procurement officer
        const procLoginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'proc1@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        if (procLoginResponse.ok) {
            const procLoginData = await procLoginResponse.json();
            const procToken = procLoginData.token;
            
            // Fetch notifications for procurement officer
            const notificationsResponse = await fetch(`${API_URL}/api/notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${procToken}`
                }
            });

            if (notificationsResponse.ok) {
                const notificationsData = await notificationsResponse.json();
                const notifications = notificationsData.data || [];
                console.log('📱 Procurement officer notifications:', notifications.length);
                
                const thresholdNotifications = notifications.filter(n => n.type === 'THRESHOLD_EXCEEDED');
                if (thresholdNotifications.length > 0) {
                    console.log('🎉 SUCCESS: Threshold notifications found!');
                    thresholdNotifications.forEach((notification, index) => {
                        console.log(`   ${index + 1}. ${notification.message}`);
                    });
                } else {
                    console.log('❌ No threshold notifications found');
                    console.log('All notification types:', notifications.map(n => n.type));
                }
            } else {
                console.log('⚠️ Could not fetch notifications for procurement officer');
            }
        } else {
            console.log('⚠️ Could not login as procurement officer');
        }

        // Also check procurement manager
        const procMgrLoginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'proc.manager@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        if (procMgrLoginResponse.ok) {
            const procMgrLoginData = await procMgrLoginResponse.json();
            const procMgrToken = procMgrLoginData.token;
            
            // Fetch notifications for procurement manager
            const notificationsResponse = await fetch(`${API_URL}/api/notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${procMgrToken}`
                }
            });

            if (notificationsResponse.ok) {
                const notificationsData = await notificationsResponse.json();
                const notifications = notificationsData.data || [];
                console.log('📱 Procurement manager notifications:', notifications.length);
                
                const thresholdNotifications = notifications.filter(n => n.type === 'THRESHOLD_EXCEEDED');
                if (thresholdNotifications.length > 0) {
                    console.log('🎉 SUCCESS: Procurement manager also received notifications!');
                } else {
                    console.log('❌ Procurement manager did not receive threshold notifications');
                }
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testThresholdNotifications();