#!/usr/bin/env node
/**
 * Test Script: Verify LDAP Group Mappings
 * 
 * This script helps verify that AD group mappings are working correctly
 * 
 * Usage:
 *   node test-ldap-group-mappings.mjs <email> <password>
 * 
 * Example:
 *   node test-ldap-group-mappings.mjs john.doe@bos.local password123
 */

import { ldapService } from '../services/ldapService.js';
import { getGroupMappings, findMappingsForGroups, mergeRoles, getFirstDepartment } from '../config/ldapGroupMapping.js';
import { logger } from '../config/logger.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: node test-ldap-group-mappings.mjs <email> <password>');
    process.exit(1);
}

async function testGroupMappings() {
    console.log('\n📋 LDAP Group Mapping Test\n');
    console.log(`Testing with user: ${email}\n`);

    try {
        // Step 1: Authenticate against LDAP
        console.log('1️⃣  Authenticating against LDAP...');
        const ldapUser = await ldapService.authenticateUser(email, password);
        console.log(`   ✅ Authentication successful\n`);

        console.log('2️⃣  User Details:');
        console.log(`   Name: ${ldapUser.name}`);
        console.log(`   Email: ${ldapUser.email}`);
        console.log(`   DN: ${ldapUser.dn}`);
        console.log(`   Department (LDAP): ${ldapUser.department || '(not set)'}\n`);

        // Step 2: Extract AD groups
        console.log('3️⃣  Active Directory Groups:');
        const groups = ldapUser.memberOf || [];
        if (groups.length === 0) {
            console.log(`   ℹ️  User is not member of any groups\n`);
        } else {
            groups.forEach((group, idx) => {
                console.log(`   ${idx + 1}. ${group}`);
            });
            console.log();
        }

        // Step 3: Get configured mappings
        console.log('4️⃣  Configured Group Mappings:');
        const mappings = getGroupMappings();
        console.log(`   Total mappings configured: ${mappings.length}\n`);

        // Step 4: Find matching mappings
        console.log('5️⃣  Matching Groups:');
        const matchedMappings = findMappingsForGroups(groups, mappings);
        
        if (matchedMappings.length === 0) {
            console.log(`   ⚠️  No group mappings matched for this user`);
            console.log(`   Roles will be assigned from admin panel or default REQUESTER\n`);
        } else {
            matchedMappings.forEach((mapping, idx) => {
                console.log(`   ${idx + 1}. AD Group: ${mapping.adGroupName}`);
                console.log(`      Roles: ${mapping.roles.join(', ')}`);
                if (mapping.department) {
                    console.log(`      Department: ${mapping.departmentName} (${mapping.department})`);
                }
                console.log();
            });
        }

        // Step 5: Calculate resulting roles
        console.log('6️⃣  Resulting Roles:');
        const resultingRoles = mergeRoles(
            ...matchedMappings.map((m) => m.roles)
        );
        
        if (resultingRoles.length === 0) {
            console.log(`   (None from AD groups - will use fallback)\n`);
        } else {
            console.log(`   ${resultingRoles.join(', ')}\n`);
        }

        // Step 6: Calculate resulting department
        console.log('7️⃣  Resulting Department:');
        const deptInfo = getFirstDepartment(matchedMappings);
        if (deptInfo) {
            console.log(`   ${deptInfo.name} (${deptInfo.code})\n`);
        } else {
            console.log(`   (None from AD groups - will use existing or none)\n`);
        }

        // Summary
        console.log('📊 Summary:');
        console.log(`   User Email: ${email}`);
        console.log(`   AD Groups Found: ${groups.length}`);
        console.log(`   Mappings Matched: ${matchedMappings.length}`);
        console.log(`   Roles to Assign: ${resultingRoles.length > 0 ? resultingRoles.join(', ') : '(fallback)'}`);
        console.log(`   Department to Assign: ${deptInfo ? deptInfo.name : '(none)'}`);
        console.log('\n✅ Test completed\n');

    } catch (error: any) {
        console.error('\n❌ Error during test:');
        console.error(`   ${error.message}\n`);
        process.exit(1);
    }
}

testGroupMappings();
