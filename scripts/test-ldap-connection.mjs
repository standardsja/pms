#!/usr/bin/env node
/**
 * LDAP Connection Test Script
 * Tests LDAP connectivity and authentication
 * 
 * Usage: node scripts/test-ldap-connection.mjs [email]
 */
import { Client } from 'ldapts';
import { config } from 'dotenv';

// Load environment variables
config();

const LDAP_CONFIG = {
    url: process.env.LDAP_URL,
    bindDN: process.env.LDAP_BIND_DN,
    bindPassword: process.env.LDAP_BIND_PASSWORD,
    searchDN: process.env.LDAP_SEARCH_DN,
};

console.log('=== LDAP Connection Test ===\n');

// Check if LDAP is configured
if (!LDAP_CONFIG.url) {
    console.error('❌ LDAP is not configured');
    console.log('Please set the following environment variables:');
    console.log('  - LDAP_URL');
    console.log('  - LDAP_BIND_DN');
    console.log('  - LDAP_BIND_PASSWORD');
    console.log('  - LDAP_SEARCH_DN');
    process.exit(1);
}

console.log('Configuration:');
console.log(`  URL: ${LDAP_CONFIG.url}`);
console.log(`  Bind DN: ${LDAP_CONFIG.bindDN}`);
console.log(`  Search DN: ${LDAP_CONFIG.searchDN}`);
console.log();

const client = new Client({
    url: LDAP_CONFIG.url,
    timeout: 10000,
    connectTimeout: 10000,
});

async function testConnection() {
    try {
        console.log('Step 1: Testing LDAP server connection...');
        
        // Try to bind with admin credentials
        await client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword);
        console.log('✅ Successfully connected and authenticated to LDAP server');
        
        // If email provided, search for user
        const email = process.argv[2];
        if (email) {
            console.log(`\nStep 2: Searching for user: ${email}`);
            
            const { searchEntries } = await client.search(LDAP_CONFIG.searchDN, {
                filter: `(userPrincipalName=${email})`,
                scope: 'sub',
                attributes: ['dn', 'userPrincipalName', 'cn', 'displayName', 'mail', 'department', 'sAMAccountName'],
            });
            
            if (searchEntries.length === 0) {
                console.log('❌ User not found in LDAP directory');
                console.log('\nTrying alternative search with mail attribute...');
                
                const { searchEntries: mailEntries } = await client.search(LDAP_CONFIG.searchDN, {
                    filter: `(mail=${email})`,
                    scope: 'sub',
                    attributes: ['dn', 'userPrincipalName', 'cn', 'displayName', 'mail', 'department', 'sAMAccountName'],
                });
                
                if (mailEntries.length === 0) {
                    console.log('❌ User not found with mail attribute either');
                    console.log('\nSuggestions:');
                    console.log('  1. Check if the email address is correct');
                    console.log('  2. Try searching with just the username (before @)');
                    console.log('  3. Check if the user exists in the LDAP directory');
                } else {
                    console.log('✅ User found with mail attribute!');
                    console.log('\nUser details:');
                    console.log(JSON.stringify(mailEntries[0], null, 2));
                }
            } else {
                console.log('✅ User found in LDAP directory!');
                console.log('\nUser details:');
                console.log(JSON.stringify(searchEntries[0], null, 2));
            }
        } else {
            console.log('\nℹ️  To search for a specific user, provide email as argument:');
            console.log('   node scripts/test-ldap-connection.mjs user@example.com');
        }
        
        await client.unbind();
        console.log('\n✅ Test completed successfully');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ LDAP connection test failed');
        console.error('Error:', error.message);
        
        if (error.errno === 'ETIMEDOUT') {
            console.error('\n🔍 Diagnosis: Connection timeout');
            console.error('Possible causes:');
            console.error('  1. LDAP server is not reachable from this machine');
            console.error('  2. Firewall is blocking port 389');
            console.error('  3. LDAP server is down or not responding');
            console.error('\nTroubleshooting steps:');
            console.error(`  ping ${LDAP_CONFIG.url.replace('ldap://', '').replace(':389', '')}`);
            console.error(`  nc -zv ${LDAP_CONFIG.url.replace('ldap://', '').replace(':389', '')} 389`);
        } else if (error.errno === 'ECONNREFUSED') {
            console.error('\n🔍 Diagnosis: Connection refused');
            console.error('The LDAP server is actively refusing connections');
            console.error('  1. LDAP service may not be running on the server');
            console.error('  2. Wrong port number (389 for LDAP, 636 for LDAPS)');
        } else if (error.code === 49) {
            console.error('\n🔍 Diagnosis: Invalid credentials');
            console.error('The bind DN or password is incorrect');
        }
        
        console.error('\nFull error details:');
        console.error(error);
        
        await client.unbind().catch(() => {});
        process.exit(1);
    }
}

testConnection();
