#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating Chemistry test data...');

    // Ensure department exists
    const deptCode = 'CHEM';
    const deptName = 'Chemistry Department';

    let department = await prisma.department.findUnique({ where: { code: deptCode } });
    if (!department) {
        department = await prisma.department.create({ data: { name: deptName, code: deptCode } });
        console.log('Created department:', department.name, 'id=', department.id);
    } else {
        console.log('Department already exists:', department.name, 'id=', department.id);
    }

    // Roles we need
    const roleNames = ['REQUESTER', 'DEPT_MANAGER'];
    const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } });
    const foundRoleNames = roles.map((r) => r.name);
    for (const rn of roleNames) {
        if (!foundRoleNames.includes(rn)) {
            console.warn(`Role ${rn} not found in DB. Please ensure roles are seeded.`);
        }
    }

    // Create or reuse manager user
    const managerEmail = 'chem.manager@example.com';
    let manager = await prisma.user.findUnique({ where: { email: managerEmail }, include: { roles: true } });
    if (!manager) {
        manager = await prisma.user.create({ data: { email: managerEmail, name: 'Chem Manager' } });
        console.log('Created manager user:', managerEmail, 'id=', manager.id);
    } else {
        console.log('Manager user exists:', managerEmail, 'id=', manager.id);
    }

    // Assign DEPT_MANAGER role to manager (if role exists)
    const deptManagerRole = roles.find((r) => r.name === 'DEPT_MANAGER');
    if (deptManagerRole) {
        // remove existing roles for clarity then add required
        await prisma.userRole.deleteMany({ where: { userId: manager.id } });
        await prisma.userRole.create({ data: { userId: manager.id, roleId: deptManagerRole.id } });
        console.log('Assigned DEPT_MANAGER role to', managerEmail);
    } else {
        console.warn('DEPT_MANAGER role not present; skipping role assignment');
    }

    // Assign manager to department
    await prisma.user.update({ where: { id: manager.id }, data: { departmentId: department.id } });
    console.log(`Assigned manager ${managerEmail} to department ${department.code}`);

    // Create requester user (with password for local auth)
    const requesterEmail = 'chem.requester@example.com';
    let requester = await prisma.user.findUnique({ where: { email: requesterEmail }, include: { roles: true } });
    if (!requester) {
        const passwordHash = bcrypt.hashSync('P@ssw0rd1', 10);
        requester = await prisma.user.create({ data: { email: requesterEmail, name: 'Chem Requester', passwordHash } });
        console.log('Created requester user:', requesterEmail, 'id=', requester.id);
    } else {
        console.log('Requester user exists:', requesterEmail, 'id=', requester.id);
    }

    // Assign REQUESTER role and department to requester
    const requesterRole = roles.find((r) => r.name === 'REQUESTER');
    if (requesterRole) {
        // remove existing roles and assign REQUESTER (keeps things deterministic for testing)
        await prisma.userRole.deleteMany({ where: { userId: requester.id } });
        await prisma.userRole.create({ data: { userId: requester.id, roleId: requesterRole.id } });
        console.log('Assigned REQUESTER role to', requesterEmail);
    } else {
        console.warn('REQUESTER role not present; skipping role assignment');
    }

    await prisma.user.update({ where: { id: requester.id }, data: { departmentId: department.id } });
    console.log(`Assigned requester ${requesterEmail} to department ${department.code}`);

    console.log('Test data creation complete. Summary:');
    console.log('Department:', department.code, department.name, 'id=', department.id);
    console.log('Manager:', managerEmail, 'id=', manager.id);
    console.log('Requester:', requesterEmail, 'id=', requester.id, 'password=P@ssw0rd1');

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error('Error creating test data:', e);
    prisma.$disconnect();
    process.exit(1);
});
