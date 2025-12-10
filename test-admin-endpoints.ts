#!/usr/bin/env node
/**
 * Admin Dashboard Comprehensive Test
 * Tests all admin pages and their dependencies
 */

const API_BASE = 'http://localhost:4000';
const HEADERS = {
    'x-user-id': '1',
    'Content-Type': 'application/json',
};

interface TestResult {
    name: string;
    endpoint: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message: string;
    details?: any;
}

const results: TestResult[] = [];

async function test(name: string, endpoint: string, method = 'GET', body?: any) {
    try {
        const options: RequestInit = {
            method,
            headers: HEADERS,
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
            details: data,
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

    // ===== USER MANAGEMENT =====
    console.log('📋 Testing User Management...');
    await test('Get Users', '/api/admin/users');
    await test('Get User (ID: 1)', '/api/admin/users/1');

    // ===== ROLE MANAGEMENT =====
    console.log('📋 Testing Role Management...');
    await test('Get Roles', '/api/admin/roles');
    await test('Get Permissions', '/api/admin/permissions');

    // ===== DEPARTMENT MANAGEMENT =====
    console.log('📋 Testing Department Management...');
    await test('Get Departments', '/api/admin/departments');

    // ===== SYSTEM CONFIGURATION =====
    console.log('📋 Testing System Configuration...');
    await test('Get System Config', '/api/admin/system-config');

    // ===== MODULE LOCKS =====
    console.log('📋 Testing Module Locks...');
    await test('Get Module Locks', '/api/admin/module-locks');

    // ===== SPLINTERING RULES =====
    console.log('📋 Testing Splintering Rules...');
    await test('Get Splintering Rules', '/api/admin/splintering-rules');

    // ===== WORKFLOW CONFIGURATION =====
    console.log('📋 Testing Workflow Configuration...');
    await test('Get Workflow Statuses', '/api/admin/workflow-statuses');
    await test('Get Workflow SLAs', '/api/admin/workflow-slas');

    // ===== AUDIT LOG =====
    console.log('📋 Testing Audit Log...');
    await test('Get Audit Log', '/api/admin/audit-log');

    // ===== LOAD BALANCING =====
    console.log('📋 Testing Load Balancing...');
    await test('Get Load Balancing Settings', '/api/admin/load-balancing-settings');

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
        if (r.status === 'FAIL' && r.details?.message) {
            console.log(`   Error: ${r.details.message}`);
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
