// server/prisma/seed.ts
console.log('SEED FILE:', import.meta.url);
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const D = (n: number) => new Prisma.Decimal(n);

/* ---------- helpers ---------- */
async function upsertRole(name: string, description?: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: description ?? `${name} role` },
  });
}

async function assignRole(userId: number, roleName: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) return;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id },
  });
}

async function findOrCreateFundingSource(code: string, name: string, notes?: string) {
  const existing = await prisma.fundingSource.findFirst({ where: { code } });
  if (existing) return existing;
  return prisma.fundingSource.create({ data: { code, name, notes } });
}

async function findOrCreateVendor(name: string, data: Omit<Prisma.VendorCreateInput, 'name'>) {
  const existing = await prisma.vendor.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.vendor.create({ data: { name, ...data } });
}

/* ---------- main ---------- */
async function main() {
  console.log('Seeding…');

  // 0) single test password for demo users
  const TEST_PASSWORD = 'Passw0rd!';
  const testHash = await bcrypt.hash(TEST_PASSWORD, 10);

  // 1) Roles
  const roles = [
    'REQUESTER',
    'DEPT_MANAGER',
    'HEAD_OF_DIVISION',
    'PROCUREMENT',
    'FINANCE',
    'EXECUTIVE',
  ];
  await Promise.all(roles.map((r) => upsertRole(r)));

  // 2) Departments
  const [ict, procurement, finance] = await Promise.all([
    prisma.department.upsert({
      where: { code: 'ICT' },
      update: {},
      create: { name: 'Information & Communication Technology', code: 'ICT' },
    }),
    prisma.department.upsert({
      where: { code: 'PROC' },
      update: {},
      create: { name: 'Procurement', code: 'PROC' },
    }),
    prisma.department.upsert({
      where: { code: 'FIN' },
      update: {},
      create: { name: 'Finance', code: 'FIN' },
    }),
  ]);

  // 3) Users (now with passwordHash)
  const [alice, bob, charlie, diana, eric, execUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice.requester@bsj.gov.jm' },
      update: { passwordHash: testHash, departmentId: ict.id },
      create: {
        email: 'alice.requester@bsj.gov.jm',
        name: 'Alice Requester',
        departmentId: ict.id,
        passwordHash: testHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob.manager@bsj.gov.jm' },
      update: { passwordHash: testHash, departmentId: ict.id },
      create: {
        email: 'bob.manager@bsj.gov.jm',
        name: 'Bob Dept Manager',
        departmentId: ict.id,
        passwordHash: testHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'charlie.hod@bsj.gov.jm' },
      update: { passwordHash: testHash, departmentId: ict.id },
      create: {
        email: 'charlie.hod@bsj.gov.jm',
        name: 'Charlie HOD',
        departmentId: ict.id,
        passwordHash: testHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'diana.procurement@bsj.gov.jm' },
      update: { passwordHash: testHash, departmentId: procurement.id },
      create: {
        email: 'diana.procurement@bsj.gov.jm',
        name: 'Diana Procurement',
        departmentId: procurement.id,
        passwordHash: testHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'eric.finance@bsj.gov.jm' },
      update: { passwordHash: testHash, departmentId: finance.id },
      create: {
        email: 'eric.finance@bsj.gov.jm',
        name: 'Eric Finance',
        departmentId: finance.id,
        passwordHash: testHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'executive@bsj.gov.jm' },
      update: { passwordHash: testHash, departmentId: finance.id },
      create: {
        email: 'executive@bsj.gov.jm',
        name: 'Executive Approver',
        departmentId: finance.id,
        passwordHash: testHash,
      },
    }),
  ]);

  // 4) Set ICT manager (1–1)
  await prisma.department.update({
    where: { id: ict.id },
    data: { managerId: bob.id },
  });

  // 5) Role assignments
  await Promise.all([
    assignRole(alice.id, 'REQUESTER'),
    assignRole(bob.id, 'DEPT_MANAGER'),
    assignRole(charlie.id, 'HEAD_OF_DIVISION'),
    assignRole(diana.id, 'PROCUREMENT'),
    assignRole(eric.id, 'FINANCE'),
    assignRole(execUser.id, 'EXECUTIVE'),
  ]);

  // 6) Funding sources
  const [opEx, capEx] = await Promise.all([
    findOrCreateFundingSource('OP-EX', 'Operating Expenditure', 'General Ops'),
    findOrCreateFundingSource('CAP-EX', 'Capital Expenditure', 'Capital projects'),
  ]);

  // 7) Vendors
  const [techSupplies, islandOffice] = await Promise.all([
    findOrCreateVendor('Tech Supplies Ltd.', {
      contact: { email: 'sales@techsupplies.local', phone: '+1-876-555-0123' },
      address: '12 Harbour Street, Kingston',
      website: 'https://techsupplies.local',
      createdAt: new Date(),
    }),
    findOrCreateVendor('Island Office Pro', {
      contact: { email: 'info@islandoffice.local', phone: '+1-876-555-0456' },
      address: '3 Hope Road, Kingston',
      website: 'https://islandoffice.local',
      createdAt: new Date(),
    }),
  ]);

  // 8) Requests etc. (unchanged from your last working version) …
  // R1
  const R1_REF = 'REQ-2025-0001';
  let r1 = await prisma.request.findUnique({ where: { reference: R1_REF } });
  if (!r1) {
    r1 = await prisma.request.create({
      data: {
        reference: R1_REF,
        title: 'Laptops for New Hires',
        description: 'Procurement of 5 mid-range laptops for ICT onboarding.',
        requesterId: alice.id,
        departmentId: ict.id,
        fundingSourceId: opEx.id,
        budgetCode: 'ICT-2025-ONB',
        totalEstimated: D(750000),
        currency: 'USD',
        priority: Prisma.Priority.MEDIUM,
        expectedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
        currentAssignee: { connect: { id: bob.id } },
        vendorId: techSupplies.id,
        status: Prisma.RequestStatus.DEPARTMENT_REVIEW,
        items: {
          create: [
            {
              description: 'Lenovo ThinkPad E-series (16GB/512GB)',
              quantity: 5,
              unitPrice: D(150000),
              totalPrice: D(750000),
              accountCode: 'ICT-EQP-24',
            },
          ],
        },
        attachments: {
          create: [
            {
              filename: 'specs.pdf',
              url: 'https://files.example/specs.pdf',
              mimeType: 'application/pdf',
              uploadedById: alice.id,
            },
          ],
        },
      },
    });

    await prisma.requestStatusHistory.createMany({
      data: [
        { requestId: r1.id, status: Prisma.RequestStatus.SUBMITTED,         changedById: alice.id,  comment: 'Submitted by requester.' },
        { requestId: r1.id, status: Prisma.RequestStatus.DEPARTMENT_REVIEW, changedById: bob.id,    comment: 'Under department review.' },
      ],
      skipDuplicates: true,
    });

    await prisma.requestAction.create({
      data: {
        requestId: r1.id,
        action: Prisma.RequestActionType.SUBMIT,
        comment: 'Initial submission',
        performedById: alice.id,
        metadata: { channel: 'web' },
      },
    });

    console.log('Created sample Request:', r1.reference);
  }

  // R2
  const R2_REF = 'REQ-2025-0002';
  let r2 = await prisma.request.findUnique({ where: { reference: R2_REF } });
  if (!r2) {
    r2 = await prisma.request.create({
      data: {
        reference: R2_REF,
        title: 'Office Chairs Replacement',
        description: 'Replace 20 worn office chairs.',
        requesterId: alice.id,
        departmentId: ict.id,
        fundingSourceId: capEx.id,
        budgetCode: 'ICT-FURN-25',
        totalEstimated: D(400000),
        currency: 'USD',
        priority: Prisma.Priority.HIGH,
        expectedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        currentAssignee: { connect: { id: diana.id } },
        vendorId: islandOffice.id,
        status: Prisma.RequestStatus.PROCUREMENT_REVIEW,
        items: {
          create: [
            {
              description: 'Ergonomic Office Chair',
              quantity: 20,
              unitPrice: D(20000),
              totalPrice: D(400000),
              accountCode: 'FURN-CHAIR-25',
            },
          ],
        },
      },
    });

    await prisma.requestStatusHistory.createMany({
      data: [
        { requestId: r2.id, status: Prisma.RequestStatus.SUBMITTED,           changedById: alice.id,   comment: 'Submitted by requester.' },
        { requestId: r2.id, status: Prisma.RequestStatus.DEPARTMENT_APPROVED, changedById: bob.id,     comment: 'Approved by Dept Manager.' },
        { requestId: r2.id, status: Prisma.RequestStatus.HOD_REVIEW,          changedById: charlie.id, comment: 'HOD forwarded to Procurement.' },
        { requestId: r2.id, status: Prisma.RequestStatus.PROCUREMENT_REVIEW,  changedById: diana.id,   comment: 'Procurement reviewing.' },
      ],
      skipDuplicates: true,
    });

    await prisma.requestAction.createMany({
      data: [
        { requestId: r2.id, action: Prisma.RequestActionType.SUBMIT,  comment: 'Submitted by Alice',    performedById: alice.id,  metadata: { channel: 'web' } },
        { requestId: r2.id, action: Prisma.RequestActionType.APPROVE, comment: 'Dept Manager approved', performedById: bob.id },
        { requestId: r2.id, action: Prisma.RequestActionType.ASSIGN,  comment: 'Assigned to Procurement', performedById: charlie.id, metadata: { to: 'PROCUREMENT' } },
      ],
      skipDuplicates: true,
    });

    console.log('Created sample Request:', r2.reference);
  }

  console.log('Seed complete ✅');
}

main()
  .catch((e) => {
    console.error('Seed failed ❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
