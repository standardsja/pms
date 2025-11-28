import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkExecutiveRequests() {
    try {
        console.log('🔍 Checking EXECUTIVE_REVIEW requests...\n');

        const executiveRequests = await prisma.request.findMany({
            where: { status: 'EXECUTIVE_REVIEW' },
            select: {
                id: true,
                reference: true,
                status: true,
                title: true,
                totalEstimated: true,
                currency: true,
                currentAssigneeId: true,
                currentAssignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        roles: {
                            include: { role: true },
                        },
                    },
                },
            },
        });

        console.log(`Found ${executiveRequests.length} requests in EXECUTIVE_REVIEW status:\n`);

        for (const req of executiveRequests) {
            console.log(`📋 Request ${req.id} (${req.reference})`);
            console.log(`   Title: ${req.title}`);
            console.log(`   Value: ${req.currency} ${req.totalEstimated?.toLocaleString()}`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Assignee ID: ${req.currentAssigneeId}`);
            if (req.currentAssignee) {
                console.log(`   Assignee Name: ${req.currentAssignee.name}`);
                console.log(`   Assignee Email: ${req.currentAssignee.email}`);
                console.log(`   Assignee Roles: ${req.currentAssignee.roles.map((ur) => ur.role.name).join(', ')}`);
            } else {
                console.log(`   ⚠️ NO ASSIGNEE SET`);
            }
            console.log('');
        }

        // Also check for Executive Director users
        console.log('\n👔 Checking for Executive Director users...\n');

        const executives = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: {
                                contains: 'EXECUTIVE',
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                roles: {
                    include: { role: true },
                },
            },
        });

        console.log(`Found ${executives.length} Executive users:\n`);

        for (const exec of executives) {
            console.log(`👤 ${exec.name} (ID: ${exec.id})`);
            console.log(`   Email: ${exec.email}`);
            console.log(`   Roles: ${exec.roles.map((ur) => ur.role.name).join(', ')}`);
            console.log('');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkExecutiveRequests();
