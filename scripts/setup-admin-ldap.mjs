import { prisma } from '../server/prismaClient.ts';

const email = 'kmillwood@bsj.org.jm';

try {
    // Find the user
    const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } }, department: true },
    });

    if (!user) {
        console.log('❌ User not found:', email);
        process.exit(1);
    }

    console.log('✓ User found:', user.name, '(', user.email, ')');
    console.log('Current roles:', user.roles.map((r) => r.role.name).join(', ') || 'None');
    console.log('Current department:', user.department?.name || 'None');

    // Find or create IT department
    let itDept = await prisma.department.findFirst({
        where: { name: 'IT' },
    });

    if (!itDept) {
        console.log('Creating IT department...');
        itDept = await prisma.department.create({
            data: {
                name: 'IT',
                code: 'IT',
            },
        });
        console.log('✓ IT department created');
    }

    // Update user's department
    await prisma.user.update({
        where: { id: user.id },
        data: { departmentId: itDept.id },
    });
    console.log('✓ User assigned to IT department');

    // Find or create ADMIN role
    let adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN' },
    });

    if (!adminRole) {
        console.log('Creating ADMIN role...');
        adminRole = await prisma.role.create({
            data: {
                name: 'ADMIN',
                description: 'System Administrator with full access',
            },
        });
        console.log('✓ ADMIN role created');
    }

    // Find or create DEPARTMENT_HEAD role for IT
    let deptHeadRole = await prisma.role.findFirst({
        where: { name: 'DEPARTMENT_HEAD' },
    });

    if (!deptHeadRole) {
        console.log('Creating DEPARTMENT_HEAD role...');
        deptHeadRole = await prisma.role.create({
            data: {
                name: 'DEPARTMENT_HEAD',
                description: 'Department Head with approval authority',
            },
        });
        console.log('✓ DEPARTMENT_HEAD role created');
    }

    // Clear existing roles
    await prisma.userRole.deleteMany({
        where: { userId: user.id },
    });
    console.log('✓ Cleared existing roles');

    // Assign ADMIN role
    await prisma.userRole.create({
        data: {
            userId: user.id,
            roleId: adminRole.id,
        },
    });
    console.log('✓ Assigned ADMIN role');

    // Assign DEPARTMENT_HEAD role
    await prisma.userRole.create({
        data: {
            userId: user.id,
            roleId: deptHeadRole.id,
        },
    });
    console.log('✓ Assigned DEPARTMENT_HEAD role');

    // Remove password hash to force LDAP authentication
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: null },
    });
    console.log('✓ Removed local password (LDAP-only authentication)');

    // Verify final state
    const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            roles: { include: { role: true } },
            department: true,
        },
    });

    console.log('\n📋 Final Configuration:');
    console.log('User:', updatedUser.name);
    console.log('Email:', updatedUser.email);
    console.log('Department:', updatedUser.department?.name);
    console.log('Roles:', updatedUser.roles.map((r) => r.role.name).join(', '));
    console.log('Auth Method: LDAP Only');
    console.log('\n✅ Setup complete! Use LDAP login endpoint: POST /api/auth/ldap-login');
} catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
} finally {
    await prisma.$disconnect();
}
