/**
 * Test script for Evaluation Committee Workflow
 * Tests the section verification API endpoints
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const API_URL = process.env.VITE_API_URL || 'http://localhost:4000';

// Mock auth token - replace with real token or use login flow
const AUTH_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

async function testWorkflow() {
    console.log('🧪 Testing Evaluation Committee Workflow\n');

    try {
        // 1. Create a test evaluation
        console.log('1️⃣ Creating test evaluation...');
        const createResponse = await fetch(`${API_URL}/api/evaluations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                evalNumber: `TEST_${Date.now()}`,
                rfqNumber: 'RFQ/TEST/001',
                rfqTitle: 'Test Evaluation Workflow',
                description: 'Testing section verification workflow',
                sectionA: {
                    comparableEstimate: 50000,
                    fundedBy: 'BSJ',
                    tenderClosingDate: '2025-12-01',
                    tenderOpeningDate: '2025-12-01',
                    actualOpeningDate: '2025-12-01',
                    procurementMethod: 'NATIONAL_COMPETITIVE_BIDDING',
                    advertisementMethods: ['Email'],
                    contractType: 'GOODS',
                    bidSecurity: 'No',
                    tenderPeriodDays: 7,
                    bidValidityDays: 30,
                    bidValidityExpiration: '2025-12-31',
                    numberOfBidsRequested: 3,
                    numberOfBidsReceived: 0,
                    arithmeticErrorIdentified: false,
                    retender: false,
                    awardCriteria: 'LOWEST_COST',
                },
            }),
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create evaluation: ${createResponse.status}`);
        }

        const { data: evaluation } = await createResponse.json();
        console.log(`✅ Created evaluation #${evaluation.id}\n`);

        // 2. Submit Section A for review
        console.log('2️⃣ Submitting Section A for review...');
        const submitResponse = await fetch(`${API_URL}/api/evaluations/${evaluation.id}/sections/A/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${AUTH_TOKEN}`,
            },
        });

        if (!submitResponse.ok) {
            throw new Error(`Failed to submit section: ${submitResponse.status}`);
        }

        console.log('✅ Section A submitted for committee review\n');

        // 3. Verify Section A (as committee member)
        console.log('3️⃣ Verifying Section A as committee member...');
        const verifyResponse = await fetch(`${API_URL}/api/evaluations/${evaluation.id}/sections/A/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                notes: 'Section A looks good, all information verified.',
            }),
        });

        if (!verifyResponse.ok) {
            const error = await verifyResponse.json();
            throw new Error(`Failed to verify section: ${error.message || verifyResponse.status}`);
        }

        console.log('✅ Section A verified by committee\n');

        // 4. Check evaluation status
        console.log('4️⃣ Fetching updated evaluation...');
        const getResponse = await fetch(`${API_URL}/api/evaluations/${evaluation.id}`, {
            headers: {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            },
        });

        if (!getResponse.ok) {
            throw new Error(`Failed to fetch evaluation: ${getResponse.status}`);
        }

        const { data: updatedEval } = await getResponse.json();

        console.log('✅ Evaluation Status:');
        console.log(`   - Section A Status: ${updatedEval.sectionAStatus}`);
        console.log(`   - Section A Verified By: ${updatedEval.sectionAVerifier?.name || 'N/A'}`);
        console.log(`   - Section A Verified At: ${updatedEval.sectionAVerifiedAt || 'N/A'}`);
        console.log(`   - Section A Notes: ${updatedEval.sectionANotes || 'None'}`);

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', await error.response.text());
        }
        process.exit(1);
    }
}

// Run tests
testWorkflow().catch(console.error);
