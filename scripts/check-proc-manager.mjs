#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasourceUrl: 'mysql://database_admin:03un5gZ1QBls@Stork:3306/db_spinx'
});

async function checkProcManager() {
    try {
        const email = process.argv[2] || 'proc.manager@bsj.gov.jm';

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            console.log(`❌ User ${email} not found`);
            console.log('\nLet me list all users with PROCUREMENT or MANAGER in their roles:');
            
            const allUsers = await prisma.user.findMany({
                include: {
                    roles: {
                        include: { role: true },
                    },
                },
            });

            const procUsers = allUsers.filter(u => 
                u.roles.some(ur => 
                    ur.role.name.includes('PROCUREMENT') || ur.role.name.includes('MANAGER')
                )
            );

            procUsers.forEach(u => {
                console.log(`\n  ${u.email} (${u.name})`);
                console.log(`  Roles: ${u.roles.map(r => r.role.name).join(', ')}`);
            });
        } else {
            console.log(`\n✅ User: ${user.name} (${user.email})`);
            console.log(`Roles: ${user.roles.map((r) => r.role.name).join(', ')}`);
            
            const hasManager = user.roles.some(ur => ur.role.name === 'PROCUREMENT_MANAGER');
            const hasProcurement = user.roles.some(ur => ur.role.name === 'PROCUREMENT');
            
            console.log(`\nHas PROCUREMENT_MANAGER role: ${hasManager ? '✅ YES' : '❌ NO'}`);
            console.log(`Has PROCUREMENT role: ${hasProcurement ? '✅ YES' : '❌ NO'}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkProcManager();
