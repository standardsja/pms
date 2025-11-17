#!/usr/bin/env node
/**
 * Diagnostic script to check if BUDGET_MANAGER role and BUDGET_MANAGER_REVIEW enum are properly set up
 * Run: node scripts/check-budget-manager-setup.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n=== Budget Manager Setup Diagnostic ===\n');

    try {
        // Check if BUDGET_MANAGER role exists
        console.log('1. Checking BUDGET_MANAGER role...');
        const budgetManagerRole = await prisma.role.findUnique({
            where: { name: 'BUDGET_MANAGER' },
        });
        
        if (budgetManagerRole) {
            console.log('   ✓ BUDGET_MANAGER role exists (id:', budgetManagerRole.id, ')');
        } else {
            console.log('   ✗ BUDGET_MANAGER role NOT FOUND');
            console.log('   → Run: npx prisma db seed (to create the role)');
        }

        // Check if any users have BUDGET_MANAGER role
        console.log('\n2. Checking for users with BUDGET_MANAGER role...');
        const budgetManagerUsers = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'BUDGET_MANAGER',
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        if (budgetManagerUsers.length > 0) {
            console.log(`   ✓ Found ${budgetManagerUsers.length} Budget Manager user(s):`);
            budgetManagerUsers.forEach(u => {
                console.log(`     - ${u.name} (${u.email}) [id: ${u.id}]`);
            });
        } else {
            console.log('   ✗ No users have BUDGET_MANAGER role');
            console.log('   → Run: npx prisma db seed (to create budget manager user)');
        }

        // Check if BUDGET_MANAGER_REVIEW status exists in the enum by attempting to use it
        console.log('\n3. Checking BUDGET_MANAGER_REVIEW enum value...');
        try {
            // Try to query with the enum value
            const testQuery = await prisma.request.findMany({
                where: { status: 'BUDGET_MANAGER_REVIEW' },
                take: 1,
            });
            console.log('   ✓ BUDGET_MANAGER_REVIEW enum value is available in database');
        } catch (e) {
            const msg = String(e?.message || '');
            if (msg.includes('BUDGET_MANAGER_REVIEW') || msg.toLowerCase().includes('invalid enum')) {
                console.log('   ✗ BUDGET_MANAGER_REVIEW enum NOT in database');
                console.log('   → Run: npx prisma db push (to sync schema to database)');
                console.log('   → Or run migration: npx prisma migrate dev --name add-budget-manager-review');
            } else {
                console.log('   ? Unable to verify enum (error:', msg, ')');
            }
        }

        // Check current schema.prisma for the enum
        console.log('\n4. Checking schema.prisma file...');
        const fs = await import('fs/promises');
        const schemaPath = new URL('../server/prisma/schema.prisma', import.meta.url);
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');
        
        if (schemaContent.includes('BUDGET_MANAGER_REVIEW')) {
            console.log('   ✓ BUDGET_MANAGER_REVIEW is defined in schema.prisma');
        } else {
            console.log('   ✗ BUDGET_MANAGER_REVIEW NOT in schema.prisma');
            console.log('   → Add BUDGET_MANAGER_REVIEW to RequestStatus enum in schema.prisma');
        }

        console.log('\n=== Summary ===');
        const hasRole = !!budgetManagerRole;
        const hasUser = budgetManagerUsers.length > 0;
        
        if (hasRole && hasUser) {
            console.log('✓ Setup looks good! Budget Manager workflow should work.');
            console.log('  If still seeing issues, make sure to:');
            console.log('  1. Run: npx prisma db push (to sync enum to DB)');
            console.log('  2. Restart the backend server');
        } else {
            console.log('✗ Setup incomplete. Required fixes:');
            if (!hasRole) console.log('  - Create BUDGET_MANAGER role (run seed)');
            if (!hasUser) console.log('  - Create Budget Manager user (run seed)');
            console.log('\nQuick fix: npx prisma db seed');
        }

    } catch (error) {
        console.error('\n❌ Error during diagnostic:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
