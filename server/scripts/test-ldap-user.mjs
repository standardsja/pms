/**
 * Test LDAP Login for Specific User
 *
 * Usage: node server/scripts/test-ldap-user.mjs your.email@bsj.gov.jm yourpassword
 *
 * This script tests:
 * 1. LDAP authentication
 * 2. Group membership retrieval
 * 3. Role mapping
 * 4. Department assignment
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://heron:4000';

async function testLDAPUser(email, password) {
    console.log('\n🔍 Testing LDAP Login for:', email);
    console.log('='.repeat(60));

    try {
        // Attempt LDAP login
        console.log('\n📡 Attempting LDAP authentication...');
        const response = await fetch(`${API_URL}/api/auth/ldap-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('\n❌ Authentication Failed');
            console.error('Status:', response.status);
            console.error('Error:', data.message || data.error);
            return;
        }

        console.log('\n✅ Authentication Successful!');
        console.log('\n📋 User Information:');
        console.log('   Email:', data.user.email);
        console.log('   Name:', data.user.name);
        console.log('   User ID:', data.user.id);

        console.log('\n👥 Assigned Roles:');
        if (data.user.roles && data.user.roles.length > 0) {
            data.user.roles.forEach((role) => console.log('   ✓', role));
        } else {
            console.log('   ⚠️  No roles assigned');
        }

        console.log('\n🏢 Department Assignment:');
        if (data.user.department) {
            console.log('   Name:', data.user.department.name);
            console.log('   Code:', data.user.department.code);
            console.log('   ID:', data.user.department.id);
        } else {
            console.log('   ⚠️  No department assigned');
        }

        console.log('\n🔐 Token:', data.token ? '✓ Received' : '✗ Missing');

        // Check server logs recommendation
        console.log('\n💡 To see detailed sync information, check server logs:');
        console.log('   Look for: "LDAP authentication successful"');
        console.log('   Look for: "LDAP user roles synced"');
        console.log('   Look for: "User logged in via LDAP with role sync"');

        console.log('\n' + '='.repeat(60));
    } catch (error) {
        console.error('\n❌ Request Failed');
        console.error('Error:', error.message);
        console.log('\nℹ️  Make sure:');
        console.log('   1. Server is running on', API_URL);
        console.log('   2. LDAP is configured (check .env)');
        console.log('   3. Network connectivity to LDAP server');
    }
}

// Get credentials from command line
const [, , email, password] = process.argv;

if (!email || !password) {
    console.error('\n❌ Missing arguments');
    console.log('\nUsage: node server/scripts/test-ldap-user.mjs <email> <password>');
    console.log('Example: node server/scripts/test-ldap-user.mjs john.doe@bsj.gov.jm mypassword');
    process.exit(1);
}

testLDAPUser(email, password);
