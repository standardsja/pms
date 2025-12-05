#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import pkg from 'bcryptjs';
const { hash } = pkg;

const prisma = new PrismaClient({
    datasourceUrl: 'mysql://database_admin:03un5gZ1QBls@Stork:3306/db_spinx',
});

async function createExecutiveDirector() {
    try {
        const email = 'executive.director@bsj.gov.jm';
        const password = 'Passw0rd!';

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } },
        });

        if (user) {
            console.log(`\n✅ User already exists: ${user.name} (${user.email})`);
            console.log('   Current roles:', user.roles.map((r) => r.role.name).join(', '));
        } else {
            // Create the user
            const passwordHash = await hash(password, 10);
            user = await prisma.user.create({
                data: {
                    email,
                    name: 'Executive Director',
                    passwordHash,
                },
                include: { roles: { include: { role: true } } },
            });
            console.log(`\n✅ Created user: ${user.name} (${user.email})`);
        }

        // Ensure EXECUTIVE_DIRECTOR role exists
        let execRole = await prisma.role.findUnique({
            where: { name: 'EXECUTIVE_DIRECTOR' },
        });

        if (!execRole) {
            execRole = await prisma.role.create({
                data: {
                    name: 'EXECUTIVE_DIRECTOR',
                    description: 'Executive Director - Final approval authority',
                },
            });
            console.log('✅ Created EXECUTIVE_DIRECTOR role');
        }

        // Check if user has the role
        const hasRole = user.roles.some((ur) => ur.role.name === 'EXECUTIVE_DIRECTOR');

        if (!hasRole) {
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: execRole.id,
                },
            });
            console.log('✅ Added EXECUTIVE_DIRECTOR role to user');
        } else {
            console.log('✅ User already has EXECUTIVE_DIRECTOR role');
        }

        // Show final status
        const updatedUser = await prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } },
        });

        console.log('\n📋 Final user status:');
        console.log('   Email:', updatedUser.email);
        console.log('   Name:', updatedUser.name);
        console.log('   Roles:', updatedUser.roles.map((r) => r.role.name).join(', '));
        console.log('   Password:', password);
        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createExecutiveDirector();
