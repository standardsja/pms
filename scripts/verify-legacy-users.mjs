import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.resolve(process.cwd(), 'server', 'prisma', '.env') });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    
    const legacyUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'alice.requester@bsj.gov.jm',
            'bob.manager@bsj.gov.jm',
            'charlie.hod@bsj.gov.jm',
            'diana.procurement@bsj.gov.jm',
            'eric.finance@bsj.gov.jm'
          ]
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        roles: {
          include: { role: true }
        }
      }
    });
    
    console.log('\n✅ Legacy User Verification:');
    console.log('==========================\n');
    
    legacyUsers.forEach(u => {
      const roles = u.roles.map(r => r.role.name).join(', ');
      const hasPassword = u.passwordHash ? '✓' : '✗';
      console.log(`${u.email}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Roles: ${roles}`);
      console.log(`  Password: ${hasPassword}`);
      console.log('');
    });
    
    console.log(`Total legacy users found: ${legacyUsers.length}/5`);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
