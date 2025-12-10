#!/usr/bin/env node
/**
 * Admin Dashboard Comprehensive Test - with proper auth
 */

const API_BASE = 'http://localhost:4000';

interface TestResult {
    name: string;
    endpoint: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message: string;
    responseData?: any;
}

const results: TestResult[] = [];

async function test(name: string, endpoint: string, userId = '1', method = 'GET', body?: any) {
    try {
        const headers: Record<string, string> = {
            'x-user-id': userId,
            'Content-Type': 'application/json',
        };

        // Get token from auth if available
        const tokenMatch = process.env.AUTH_TOKEN;
        if (tokenMatch) {
            headers['Authorization'] = `Bearer ${tokenMatch}`;
        }

        const options: RequestInit = {
            method,
            headers,
        };

        if (method === 'POST' && body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json().catch(() => ({}));

        const success = response.status >= 200 && response.status < 300;
        results.push({
            name,
            endpoint,
            status: success ? 'PASS' : 'FAIL',
            message: `${response.status} ${response.statusText}`,
            responseData: success ? data : data.message || data,
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
    console.log('🧪 Starting Admin Dashboard Tests...\n');

    // First, check user 1
    console.log('🔍 Checking User 1 Details...');
    await test('Get User 1', '/api/admin/users/1', '1');

    // Try with different users to find admin
    console.log('🔍 Checking User 2...');
    await test('Get Users (User 2)', '/api/admin/users', '2');

    // ===== USER MANAGEMENT =====
    console.log('\n📋 Testing User Management...');
    await test('Get Users', '/api/admin/users', '1');

    // ===== ROLE MANAGEMENT =====
    console.log('📋 Testing Role Management...');
    await test('Get Roles', '/api/admin/roles', '1');

    // ===== DEPARTMENT MANAGEMENT =====
    console.log('📋 Testing Department Management...');
    await test('Get Departments', '/api/admin/departments', '1');

    // ===== SYSTEM CONFIGURATION =====
    console.log('📋 Testing System Configuration...');
    await test('Get System Config', '/api/admin/system-config', '1');

    // ===== MODULE LOCKS =====
    console.log('📋 Testing Module Locks...');
    await test('Get Module Locks', '/api/admin/module-locks', '1');

    // ===== SPLINTERING RULES =====
    console.log('📋 Testing Splintering Rules...');
    await test('Get Splintering Rules', '/api/admin/splintering-rules', '1');

    // ===== WORKFLOW CONFIGURATION =====
    console.log('📋 Testing Workflow Configuration...');
    await test('Get Workflow Statuses', '/api/admin/workflow-statuses', '1');
    await test('Get Workflow SLAs', '/api/admin/workflow-slas', '1');

    // ===== AUDIT LOG =====
    console.log('📋 Testing Audit Log...');
    await test('Get Audit Log', '/api/admin/audit-log', '1');

    // ===== LOAD BALANCING =====
    console.log('📋 Testing Load Balancing...');
    await test('Get Load Balancing Settings', '/api/admin/load-balancing-settings', '1');

    // Print Results
    console.log('\n\n════════════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('════════════════════════════════════════════════════════════════\n');

    const passes = results.filter((r) => r.status === 'PASS').length;
    const fails = results.filter((r) => r.status === 'FAIL').length;
    const skips = results.filter((r) => r.status === 'SKIP').length;

    results.forEach((r) => {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`${icon} ${r.name}`);
        console.log(`   Endpoint: ${r.endpoint}`);
        console.log(`   Status: ${r.message}`);
        if (r.status === 'FAIL' && r.responseData?.message) {
            console.log(`   Error: ${r.responseData.message}`);
        }
        console.log();
    });

    console.log('════════════════════════════════════════════════════════════════');
    console.log(`📈 Summary: ${passes} PASS | ${fails} FAIL | ${skips} SKIP`);
    console.log('════════════════════════════════════════════════════════════════\n');

    process.exit(fails > 0 ? 1 : 0);
}

runTests().catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
});
