#!/usr/bin/env node
/**
 * Check what the Executive Director should see
 */

const API_BASE = 'http://localhost:4000';

async function checkExecutiveView() {
    try {
        // Login as Executive Director
        console.log('1. Logging in as Executive Director...');
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'executive.director@bsj.gov.jm',
                password: 'Passw0rd!'
            })
        });

        if (!loginRes.ok) {
            console.error('❌ Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        const execId = loginData.user.id;
        
        console.log('✅ Logged in as:', loginData.user.name);
        console.log('   User ID:', execId);
        console.log('   Roles:', loginData.user.roles);

        // Get all requests
        console.log('\n2. Fetching all requests...');
        const requestsRes = await fetch(`${API_BASE}/requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const requests = await requestsRes.json();
        
        console.log(`   Total requests: ${requests.length}`);

        // Filter for requests assigned to Executive Director
        const assignedToExec = requests.filter(r => r.currentAssigneeId === execId);
        console.log(`   Assigned to Executive Director: ${assignedToExec.length}`);

        if (assignedToExec.length > 0) {
            console.log('\n✅ Requests assigned to Executive Director:');
            assignedToExec.forEach(r => {
                console.log(`   - ID ${r.id}: ${r.title}`);
                console.log(`     Status: ${r.status}`);
                console.log(`     Value: ${r.currency} ${r.totalEstimated?.toLocaleString()}`);
                console.log(`     Assignee ID: ${r.currentAssigneeId}`);
            });
        } else {
            console.log('\n❌ No requests assigned to Executive Director');
            console.log('\nRequests in EXECUTIVE_REVIEW status:');
            const execReviewReqs = requests.filter(r => r.status === 'EXECUTIVE_REVIEW');
            execReviewReqs.forEach(r => {
                console.log(`   - ID ${r.id}: ${r.title} (Assignee: ${r.currentAssigneeId})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkExecutiveView();
