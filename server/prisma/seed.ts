// server/prisma/seed.ts - Simple seed for test users
// Unified seed script targeting server schema (Int IDs, Role & UserRole join tables)
// Populates core roles, a department, and test users with password hashes.
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Load server prisma .env for DATABASE_URL
dotenvConfig({ path: path.resolve(process.cwd(), 'server', 'prisma', '.env') });

const prisma = new PrismaClient();

async function ensureRole(name: string, description?: string) {
  return prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function main() {
  console.log('[seed] Starting procurement schema seed');
  const TEST_PASSWORD = 'Passw0rd!';
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  // Core roles used in workflow logic
  const roles = await Promise.all([
    ensureRole('HEAD_OF_DIVISION', 'Head of Division / Department reviewer'),
    ensureRole('PROCUREMENT', 'Procurement officer'),
    ensureRole('FINANCE', 'Finance officer'),
    ensureRole('INNOVATION_COMMITTEE', 'Innovation Committee member'),
  ]);
  console.log('[seed] Roles ensured:', roles.map(r => r.name).join(', '));

  // Department for assignment tests
  const dept = await prisma.department.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Research & Development' },
  });
  console.log('[seed] Department ensured:', dept.name, dept.id);

  // Users
  const requester = await prisma.user.upsert({
    where: { email: 'requester@bsj.gov.jm' },
    update: { passwordHash: hash, departmentId: dept.id },
    create: { email: 'requester@bsj.gov.jm', name: 'Requester One', passwordHash: hash, departmentId: dept.id },
  });
  const hod = await prisma.user.upsert({
    where: { email: 'hod@bsj.gov.jm' },
    update: { passwordHash: hash, departmentId: dept.id },
    create: { email: 'hod@bsj.gov.jm', name: 'Head of Division', passwordHash: hash, departmentId: dept.id },
  });

  // Set department manager to HOD
  await prisma.department.update({ where: { id: dept.id }, data: { managerId: hod.id } });

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
  const committee = await prisma.user.upsert({
    where: { email: 'committee@bsj.gov.jm' },
    update: { passwordHash: hash },
    create: { email: 'committee@bsj.gov.jm', name: 'Innovation Committee', passwordHash: hash },
  });

  // Helper: assign role to user if not already
  async function assign(userId: number, roleName: string) {
    const role = roles.find(r => r.name === roleName);
    if (!role) throw new Error(`Role not found: ${roleName}`);
    const existing = await prisma.userRole.findFirst({ where: { userId, roleId: role.id } });
    if (!existing) {
      await prisma.userRole.create({ data: { userId, roleId: role.id } });
      console.log(`[seed] Assigned role ${roleName} to user ${userId}`);
    }
  }

  await assign(hod.id, 'HEAD_OF_DIVISION');
  await assign(procurement1.id, 'PROCUREMENT');
  await assign(procurement2.id, 'PROCUREMENT');
  await assign(finance1.id, 'FINANCE');
  await assign(finance2.id, 'FINANCE');
  await assign(committee.id, 'INNOVATION_COMMITTEE');

  console.log('[seed] Users ready:');
  console.log('  requester@bsj.gov.jm  (Password: Passw0rd!)');
  console.log('  hod@bsj.gov.jm         (Password: Passw0rd!) [HEAD_OF_DIVISION]');
  console.log('  proc1@bsj.gov.jm       (Password: Passw0rd!) [PROCUREMENT]');
  console.log('  proc2@bsj.gov.jm       (Password: Passw0rd!) [PROCUREMENT]');
  console.log('  fin1@bsj.gov.jm        (Password: Passw0rd!) [FINANCE]');
  console.log('  fin2@bsj.gov.jm        (Password: Passw0rd!) [FINANCE]');
  console.log('  committee@bsj.gov.jm   (Password: Passw0rd!) [INNOVATION_COMMITTEE]');
  console.log('[seed] Complete');
}

main().catch(err => {
  console.error('[seed] Failed', err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
