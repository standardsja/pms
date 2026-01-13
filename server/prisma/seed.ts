// server/prisma/seed.ts - Simple seed for test users
// Unified seed script targeting server schema (Int IDs, Role & UserRole join tables)
// Populates core roles, a department, and test users with password hashes.
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Load .env from project root for DATABASE_URL
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function ensureRole(name: string, description?: string) {
    return prisma.role.upsert({
        where: { name },
        update: { description },
        create: { name, description },
    });
}

// Helper function to assign a role to a user
async function assignRole(userId: number, roleName: string, roles: any[]) {
    const role = roles.find((r) => r.name === roleName);
    if (!role) throw new Error(`Role not found: ${roleName}`);
    const existing = await prisma.userRole.findFirst({ where: { userId, roleId: role.id } });
    if (!existing) {
        await prisma.userRole.create({ data: { userId, roleId: role.id } });
        console.log(`[seed] Assigned role ${roleName} to user ${userId}`);
    }
}
async function main() {
    console.log('[seed] Starting procurement schema seed');
    const TEST_PASSWORD = 'Passw0rd!';
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Core roles used in workflow logic
    const roles = await Promise.all([
        ensureRole('ADMIN', 'System administrator with full access'),
        ensureRole('REQUESTER', 'Department staff who can submit requests'),
        ensureRole('DEPT_MANAGER', 'Department manager - first approval'),
        ensureRole('HEAD_OF_DIVISION', 'Head of Division - second approval'),
        ensureRole('EXECUTIVE_DIRECTOR', 'Executive Director - final approval authority'),
        ensureRole('PROCUREMENT_OFFICER', 'Procurement officer - basic procurement access'),
        ensureRole('PROCUREMENT_MANAGER', 'Procurement manager - advanced procurement access and management'),
        ensureRole('PROCUREMENT', 'Procurement officer - third review and final processing'),
        ensureRole('FINANCE', 'Finance officer - fourth review'),
        ensureRole('BUDGET_MANAGER', 'Budget Manager - final finance approval'),
        ensureRole('INNOVATION_COMMITTEE', 'Innovation Committee - review and adjudication of ideas'),
        ensureRole('EVALUATION_COMMITTEE', 'Evaluation Committee - evaluate innovation ideas'),
    ]);
    console.log('[seed] Roles ensured:', roles.map((r) => r.name).join(', '));

    // Create all departments
    const departments = await Promise.all([
        prisma.department.upsert({
            where: { code: 'ICT' },
            update: { name: 'Information & Communication Technology' },
            create: { name: 'Information & Communication Technology', code: 'ICT' },
        }),
        prisma.department.upsert({
            where: { code: 'FIN' },
            update: { name: 'Finance Department' },
            create: { name: 'Finance Department', code: 'FIN' },
        }),
        prisma.department.upsert({
            where: { code: 'HR' },
            update: { name: 'Human Resources' },
            create: { name: 'Human Resources', code: 'HR' },
        }),
        prisma.department.upsert({
            where: { code: 'PROC' },
            update: { name: 'Procurement & Supply Chain' },
            create: { name: 'Procurement & Supply Chain', code: 'PROC' },
        }),
        prisma.department.upsert({
            where: { code: 'RD' },
            update: { name: 'Research & Development' },
            create: { name: 'Research & Development', code: 'RD' },
        }),
        prisma.department.upsert({
            where: { code: 'CHEM' },
            update: { name: 'Chemistry' },
            create: { name: 'Chemistry', code: 'CHEM' },
        }),
        prisma.department.upsert({
            where: { code: 'OHOS' },
            update: { name: 'OHOS' },
            create: { name: 'OHOS', code: 'OHOS' },
        }),
        prisma.department.upsert({
            where: { code: 'MECH' },
            update: { name: 'Mechanical' },
            create: { name: 'Mechanical', code: 'MECH' },
        }),
        prisma.department.upsert({
            where: { code: 'MICRO' },
            update: { name: 'Micro Biology' },
            create: { name: 'Micro Biology', code: 'MICRO' },
        }),
        prisma.department.upsert({
            where: { code: 'STD' },
            update: { name: 'Standards' },
            create: { name: 'Standards', code: 'STD' },
        }),
        prisma.department.upsert({
            where: { code: 'ELEC' },
            update: { name: 'Electrical' },
            create: { name: 'Electrical', code: 'ELEC' },
        }),
        prisma.department.upsert({
            where: { code: 'CIV' },
            update: { name: 'Civil' },
            create: { name: 'Civil', code: 'CIV' },
        }),
    ]);

    console.log('[seed] Departments created:', departments.map((d) => d.name).join(', '));

    // Create department-specific users
    for (const dept of departments) {
        if (!dept.code || !dept.name || !dept.id) {
            console.warn(`[seed] Skipping department with missing data:`, dept);
            continue;
        }

        console.log(`\n[seed] Creating users for department: ${dept.name}`);
        const deptCode = dept.code.toLowerCase();

        // Two staff members per department
        const staff1 = await prisma.user.upsert({
            where: { email: `${deptCode}.staff1@bsj.gov.jm` },
            update: { passwordHash: hash, departmentId: dept.id },
            create: {
                email: `${deptCode}.staff1@bsj.gov.jm`,
                name: `${dept.name} Staff 1`,
                passwordHash: hash,
                departmentId: dept.id,
            },
        });

        const staff2 = await prisma.user.upsert({
            where: { email: `${deptCode}.staff2@bsj.gov.jm` },
            update: { passwordHash: hash, departmentId: dept.id },
            create: {
                email: `${deptCode}.staff2@bsj.gov.jm`,
                name: `${dept.name} Staff 2`,
                passwordHash: hash,
                departmentId: dept.id,
            },
        });

        // Department Manager
        const manager = await prisma.user.upsert({
            where: { email: `${deptCode}.manager@bsj.gov.jm` },
            update: { passwordHash: hash, departmentId: dept.id },
            create: {
                email: `${deptCode}.manager@bsj.gov.jm`,
                name: `${dept.name} Manager`,
                passwordHash: hash,
                departmentId: dept.id,
            },
        });

        // Head of Division
        const hod = await prisma.user.upsert({
            where: { email: `${deptCode}.hod@bsj.gov.jm` },
            update: { passwordHash: hash, departmentId: dept.id },
            create: {
                email: `${deptCode}.hod@bsj.gov.jm`,
                name: `${dept.name} Head of Division`,
                passwordHash: hash,
                departmentId: dept.id,
            },
        });

        // Set department manager and assign roles for this department's users
        await Promise.all([
            prisma.department.update({
                where: { id: dept.id },
                data: { managerId: manager.id },
            }),
            assignRole(staff1.id, 'REQUESTER', roles),
            assignRole(staff2.id, 'REQUESTER', roles),
            assignRole(manager.id, 'DEPT_MANAGER', roles),
            assignRole(hod.id, 'HEAD_OF_DIVISION', roles),
        ]);

        console.log(`[seed] Created ${dept.code} department users:`);
        console.log(`  Staff:    ${staff1.email}, ${staff2.email}`);
        console.log(`  Manager:  ${manager.email}`);
        console.log(`  HOD:      ${hod.email}`);
    }

    // Create system administrator
    console.log('[seed] Creating admin user...');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@bsj.gov.jm' },
        update: {
            passwordHash: hash,
            name: 'System Administrator',
        },
        create: {
            email: 'admin@bsj.gov.jm',
            name: 'System Administrator',
            passwordHash: hash,
        },
    });

    // Find admin role and create UserRole connection
    const adminRole = roles.find((r) => r.name === 'ADMIN');
    if (!adminRole) {
        throw new Error('ADMIN role not found');
    }

    // Ensure admin role is assigned
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: admin.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: admin.id,
            roleId: adminRole.id,
        },
    });

    console.log(`[seed] Created admin user: ${admin.email} with role: ADMIN`);

    // Assign REQUESTER role to admin for broader feature access if not already assigned
    const requesterRole = roles.find((r) => r.name === 'REQUESTER');
    if (requesterRole) {
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: admin.id, roleId: requesterRole.id } },
            update: {},
            create: { userId: admin.id, roleId: requesterRole.id },
        });
        console.log('[seed] Added REQUESTER role to admin');
    } else {
        console.warn('[seed] REQUESTER role not found to add to admin');
    }

    // Shared service officers (load-balanced pools)
    const procurement1 = await prisma.user.upsert({
        where: { email: 'proc1@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'proc1@bsj.gov.jm', name: 'Procurement Officer 1', passwordHash: hash },
    });
    const procurement2 = await prisma.user.upsert({
        where: { email: 'proc2@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'proc2@bsj.gov.jm', name: 'Procurement Officer 2', passwordHash: hash },
    });
    const procurement3 = await prisma.user.upsert({
        where: { email: 'proc3@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'proc3@bsj.gov.jm', name: 'Procurement Officer 3', passwordHash: hash },
    });

    const finance1 = await prisma.user.upsert({
        where: { email: 'fin1@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'fin1@bsj.gov.jm', name: 'Finance Officer 1', passwordHash: hash },
    });
    const finance2 = await prisma.user.upsert({
        where: { email: 'fin2@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'fin2@bsj.gov.jm', name: 'Finance Officer 2', passwordHash: hash },
    });
    const finance3 = await prisma.user.upsert({
        where: { email: 'fin3@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'fin3@bsj.gov.jm', name: 'Finance Officer 3', passwordHash: hash },
    });

    const budgetManager = await prisma.user.upsert({
        where: { email: 'budget@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'budget@bsj.gov.jm', name: 'Budget Manager', passwordHash: hash },
    });

    // Helper: assign role to user if not already
    async function assign(userId: number, roleName: string) {
        const role = roles.find((r) => r.name === roleName);
        if (!role) throw new Error(`Role not found: ${roleName}`);
        const existing = await prisma.userRole.findFirst({ where: { userId, roleId: role.id } });
        if (!existing) {
            await prisma.userRole.create({ data: { userId, roleId: role.id } });
            console.log(`[seed] Assigned role ${roleName} to user ${userId}`);
        }
    }

    // Assign roles to shared service officers
    // Procurement pool
    await Promise.all([assignRole(procurement1.id, 'PROCUREMENT', roles), assignRole(procurement2.id, 'PROCUREMENT', roles), assignRole(procurement3.id, 'PROCUREMENT', roles)]);

    // Finance pool
    await Promise.all([assignRole(finance1.id, 'FINANCE', roles), assignRole(finance2.id, 'FINANCE', roles), assignRole(finance3.id, 'FINANCE', roles)]);

    // Budget Manager
    await assignRole(budgetManager.id, 'BUDGET_MANAGER', roles);

    // Create Executive Director user
    const executiveDirector = await prisma.user.upsert({
        where: { email: 'executive@bsj.gov.jm' },
        update: { passwordHash: hash },
        create: { email: 'executive@bsj.gov.jm', name: 'Executive Director', passwordHash: hash },
    });
    await assignRole(executiveDirector.id, 'EXECUTIVE_DIRECTOR', roles);
    console.log('[seed] Created executive director user: executive@bsj.gov.jm (Password: Passw0rd!)');

    // Ensure Innovation Committee account exists and has the committee role
    const committeeUser = await prisma.user.upsert({
        where: { email: 'committee@bsj.gov.jm' },
        update: { passwordHash: hash, name: 'Innovation Committee' },
        create: { email: 'committee@bsj.gov.jm', name: 'Innovation Committee', passwordHash: hash },
    });
    try {
        await assignRole(committeeUser.id, 'INNOVATION_COMMITTEE', roles);
        console.log('[seed] Ensured committee user: committee@bsj.gov.jm (Password: Passw0rd!) with role INNOVATION_COMMITTEE');
    } catch (err) {
        console.warn('[seed] Failed to assign INNOVATION_COMMITTEE role to committee user:', err);
    }

    // Seed permissions and link them to roles
    console.log('\n[seed] Seeding permissions...');
    const permissions = await Promise.all([
        // Procurement permissions
        prisma.permission.upsert({
            where: { name: 'CREATE_REQUEST' },
            update: {},
            create: { name: 'CREATE_REQUEST', description: 'Create procurement requests', module: 'procurement' },
        }),
        prisma.permission.upsert({
            where: { name: 'APPROVE_REQUEST' },
            update: {},
            create: { name: 'APPROVE_REQUEST', description: 'Approve procurement requests', module: 'procurement' },
        }),
        prisma.permission.upsert({
            where: { name: 'REJECT_REQUEST' },
            update: {},
            create: { name: 'REJECT_REQUEST', description: 'Reject procurement requests', module: 'procurement' },
        }),
        // Admin permissions
        prisma.permission.upsert({
            where: { name: 'VIEW_REPORTS' },
            update: {},
            create: { name: 'VIEW_REPORTS', description: 'View system reports', module: 'admin' },
        }),
        prisma.permission.upsert({
            where: { name: 'MANAGE_USERS' },
            update: {},
            create: { name: 'MANAGE_USERS', description: 'Manage system users', module: 'admin' },
        }),
        prisma.permission.upsert({
            where: { name: 'MANAGE_ROLES' },
            update: {},
            create: { name: 'MANAGE_ROLES', description: 'Manage roles and permissions', module: 'admin' },
        }),
        prisma.permission.upsert({
            where: { name: 'SYSTEM_CONFIG' },
            update: {},
            create: { name: 'SYSTEM_CONFIG', description: 'Configure system settings', module: 'admin' },
        }),
        prisma.permission.upsert({
            where: { name: 'VIEW_AUDIT_LOGS' },
            update: {},
            create: { name: 'VIEW_AUDIT_LOGS', description: 'View audit logs', module: 'admin' },
        }),
        // Innovation permissions
        prisma.permission.upsert({
            where: { name: 'CREATE_IDEA' },
            update: {},
            create: { name: 'CREATE_IDEA', description: 'Submit ideas to innovation hub', module: 'innovation' },
        }),
        prisma.permission.upsert({
            where: { name: 'EVALUATE_IDEA' },
            update: {},
            create: { name: 'EVALUATE_IDEA', description: 'Evaluate and vote on ideas', module: 'innovation' },
        }),
    ]);
    console.log(`[seed] Permissions ensured: ${permissions.map((p) => p.name).join(', ')}`);

    // Assign permissions to roles
    const rolePermissionMap: Record<string, string[]> = {
        ADMIN: ['CREATE_REQUEST', 'APPROVE_REQUEST', 'REJECT_REQUEST', 'VIEW_REPORTS', 'MANAGE_USERS', 'MANAGE_ROLES', 'SYSTEM_CONFIG', 'VIEW_AUDIT_LOGS', 'CREATE_IDEA', 'EVALUATE_IDEA'],
        REQUESTER: ['CREATE_REQUEST', 'CREATE_IDEA'],
        DEPT_MANAGER: ['APPROVE_REQUEST', 'VIEW_REPORTS'],
        HEAD_OF_DIVISION: ['APPROVE_REQUEST', 'VIEW_REPORTS'],
        PROCUREMENT_OFFICER: ['APPROVE_REQUEST', 'VIEW_REPORTS'],
        PROCUREMENT_MANAGER: ['APPROVE_REQUEST', 'REJECT_REQUEST', 'VIEW_REPORTS'],
        PROCUREMENT: ['APPROVE_REQUEST', 'VIEW_REPORTS'],
        FINANCE: ['APPROVE_REQUEST', 'VIEW_REPORTS'],
        BUDGET_MANAGER: ['APPROVE_REQUEST'],
        INNOVATION_COMMITTEE: ['EVALUATE_IDEA'],
        EVALUATION_COMMITTEE: ['EVALUATE_IDEA'],
    };

    for (const [roleName, permissionNames] of Object.entries(rolePermissionMap)) {
        const role = roles.find((r) => r.name === roleName);
        if (!role) continue;

        // Delete existing role permissions
        await prisma.rolePermission.deleteMany({
            where: { roleId: role.id },
        });

        // Add new permissions
        for (const permName of permissionNames) {
            const perm = permissions.find((p) => p.name === permName);
            if (perm) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: perm.id,
                    },
                });
            }
        }
        console.log(`[seed] Assigned ${permissionNames.length} permissions to role: ${roleName}`);
    }

    console.log('[seed] Users ready:');
    console.log('\nDepartment Staff:');
    console.log('  staff1@bsj.gov.jm      (Password: Passw0rd!) [REQUESTER]');
    console.log('  staff2@bsj.gov.jm      (Password: Passw0rd!) [REQUESTER]');
    console.log('\nDepartment Leadership:');
    console.log('  manager@bsj.gov.jm     (Password: Passw0rd!) [DEPT_MANAGER]');
    console.log('  hod@bsj.gov.jm         (Password: Passw0rd!) [HEAD_OF_DIVISION]');
    console.log('\nProcurement Pool:');
    console.log('  proc1@bsj.gov.jm       (Password: Passw0rd!) [PROCUREMENT]');
    console.log('  proc2@bsj.gov.jm       (Password: Passw0rd!) [PROCUREMENT]');
    console.log('  proc3@bsj.gov.jm       (Password: Passw0rd!) [PROCUREMENT]');
    console.log('\nFinance Pool:');
    console.log('  fin1@bsj.gov.jm        (Password: Passw0rd!) [FINANCE]');
    console.log('  fin2@bsj.gov.jm        (Password: Passw0rd!) [FINANCE]');
    console.log('  fin3@bsj.gov.jm        (Password: Passw0rd!) [FINANCE]');
    console.log('[seed] Complete');
}

main()
    .catch((err) => {
        console.error('[seed] Failed', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
