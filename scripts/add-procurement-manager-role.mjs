#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.production
config({ path: join(__dirname, '../.env.production') });

const prisma = new PrismaClient();

async function addProcurementManagerRole() {
    try {
        const email = process.argv[2] || 'proc.manager@bsj.gov.jm';

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            console.error(`User with email ${email} not found`);
            process.exit(1);
        }

        console.log(`\nUser: ${user.name} (${user.email})`);
        console.log('Current roles:', user.roles.map((r) => r.role.name).join(', '));

        // Check if PROCUREMENT_MANAGER role exists
        let pmRole = await prisma.role.findUnique({
            where: { name: 'PROCUREMENT_MANAGER' },
        });

        if (!pmRole) {
            console.log('\nPROCUREMENT_MANAGER role does not exist. Creating it...');
            pmRole = await prisma.role.create({
                data: {
                    name: 'PROCUREMENT_MANAGER',
                    description: 'Procurement Manager - Manages procurement team and assigns requests',
                },
            });
            console.log('✓ PROCUREMENT_MANAGER role created');
        }

        // Check if user already has the role
        const hasRole = user.roles.some((ur) => ur.role.name === 'PROCUREMENT_MANAGER');

        if (hasRole) {
            console.log('\n✓ User already has PROCUREMENT_MANAGER role');
        } else {
            // Add the role to the user
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: pmRole.id,
                },
            });
            console.log('\n✓ PROCUREMENT_MANAGER role added to user');
        }

        // Show updated roles
        const updatedUser = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        console.log('\nUpdated roles:', updatedUser.roles.map((r) => r.role.name).join(', '));
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

addProcurementManagerRole();
