import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.request.count();
  if (count > 0) {
    console.log(`Seed skipped: ${count} requests already present.`);
  } else {
    await prisma.request.create({
      data: {
        title: 'Laptops for new hires',
        requester: 'Alice Johnson',
        department: 'IT',
        justification: 'Equipment for onboarding 3 engineers',
        status: 'PENDING_FINANCE',
        totalEstimated: 3 * 1200 + 3 * 200,
        items: {
          create: [
            { description: 'Dell XPS 13', quantity: 3, unitPrice: 1200 },
            { description: 'Docking station', quantity: 3, unitPrice: 200 },
          ],
        },
      },
    });

    await prisma.request.create({
      data: {
        title: 'Office chairs replacement',
        requester: 'Bob Smith',
        department: 'Facilities',
        justification: 'Replace worn-out chairs in open space',
        status: 'FINANCE_VERIFIED',
        totalEstimated: 10 * 350,
        items: {
          create: [
            { description: 'Ergonomic chair Model A', quantity: 10, unitPrice: 350 },
          ],
        },
      },
    });
  }

  // Seed a demo admin user if none exists
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hash = await bcrypt.hash('Password123!', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: hash,
        role: 'ADMIN',
      },
    });
    console.log('Seeded demo admin user: admin@example.com / Password123!');
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
