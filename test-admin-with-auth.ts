#!/usr/bin/env node
/**
 * Admin Dashboard Comprehensive Test - with Admin User (ID: 21)
 */

const API_BASE = 'http://localhost:4000';
const ADMIN_USER_ID = '21'; // User with ADMIN role

interface TestResult {
    name: string;
    endpoint: string;
    status: 'PASS' | 'FAIL';
    message: string;
    responseCount?: number;
}

const results: TestResult[] = [];

async function test(name: string, endpoint: string, method = 'GET') {
    try {
        const headers: Record<string, string> = {
            'x-user-id': ADMIN_USER_ID,
            'Content-Type': 'application/json',
        };

        const options: RequestInit = {
            method,
            headers,
        };

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json().catch(() => ({}));

        const success = response.status >= 200 && response.status < 300;

        let responseCount = 0;
        if (Array.isArray(data)) {
            responseCount = data.length;
        } else if (data.data && Array.isArray(data.data)) {
            responseCount = data.data.length;
        } else if (data.count !== undefined) {
            responseCount = data.count;
        }

        results.push({
            name,
            endpoint,
            status: success ? 'PASS' : 'FAIL',
            message: `${response.status} ${response.statusText}`,
            responseCount: success ? responseCount : undefined,
        });
    } catch (error: any) {
        results.push({
            name,
            endpoint,
            status: 'FAIL',
            message: error.message,
        });
    }
}

async function runTests() {
    console.log('🧪 Admin Dashboard Test Suite');
    console.log(`🔐 Testing with Admin User ID: ${ADMIN_USER_ID}\n`);

    // ===== USER MANAGEMENT =====
    console.log('📋 User Management Endpoints');
    await test('Get All Users', '/api/admin/users');
    await test('Get User by ID (21)', '/api/admin/users/21');

    // ===== ROLE MANAGEMENT =====
    console.log('📋 Role Management Endpoints');
    await test('Get Roles', '/api/admin/roles');
    await test('Get Permissions', '/api/admin/permissions');

    // ===== DEPARTMENT MANAGEMENT =====
    console.log('📋 Department Management Endpoints');
    await test('Get Departments', '/api/admin/departments');

    // ===== SYSTEM CONFIGURATION =====
    console.log('📋 System Configuration Endpoints');
    await test('Get System Config', '/api/admin/system-config');

    // ===== MODULE LOCKS =====
    console.log('📋 Module Locks Endpoints');
    await test('Get Module Locks', '/api/admin/module-locks');

    // ===== SPLINTERING RULES =====
    console.log('📋 Splintering Rules Endpoints');
    await test('Get Splintering Rules', '/api/admin/splintering-rules');

    // ===== WORKFLOW CONFIGURATION =====
    console.log('📋 Workflow Configuration Endpoints');
    await test('Get Workflow Statuses', '/api/admin/workflow-statuses');
    await test('Get Workflow SLAs', '/api/admin/workflow-slas');

    // ===== AUDIT LOG =====
    console.log('📋 Audit Log Endpoints');
    await test('Get Audit Log', '/api/admin/audit-log');

    // ===== LOAD BALANCING =====
    console.log('📋 Load Balancing Endpoints');
    await test('Get Load Balancing Settings', '/procurement/load-balancing-settings');

    // Print Results
    console.log('\n\n════════════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');

    const passes = results.filter((r) => r.status === 'PASS').length;
    const fails = results.filter((r) => r.status === 'FAIL').length;

    results.forEach((r) => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        const countStr = r.responseCount !== undefined ? ` (${r.responseCount} items)` : '';
        console.log(`${icon} ${r.name}`);
        console.log(`   ${r.endpoint}`);
        console.log(`   ${r.message}${countStr}\n`);
    });

    console.log('════════════════════════════════════════════════════════════════');
    console.log(`\n✅ PASSED: ${passes}`);
    console.log(`❌ FAILED: ${fails}`);
    console.log(`📈 Total: ${results.length}`);
    console.log(`📊 Success Rate: ${Math.round((passes / results.length) * 100)}%\n`);

    process.exit(fails > 0 ? 1 : 0);
}

runTests().catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
});
