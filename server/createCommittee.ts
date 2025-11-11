import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createCommitteeAccount() {
  try {
    console.log('\n=== Creating Innovation Committee Account ===\n');

    // 1. Create or get the INNOVATION_COMMITTEE role
    let committeeRole = await prisma.role.findUnique({
      where: { name: 'INNOVATION_COMMITTEE' }
    });

    if (!committeeRole) {
      console.log('Creating INNOVATION_COMMITTEE role...');
      committeeRole = await prisma.role.create({
        data: {
          name: 'INNOVATION_COMMITTEE',
          description: 'Innovation Committee Member - Can review and approve innovation ideas'
        }
      });
      console.log(`✓ Role created (ID: ${committeeRole.id})`);
    } else {
      console.log(`✓ Role already exists (ID: ${committeeRole.id})`);
    }

    // 2. Check if committee user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'committee@bsj.gov.jm' }
    });

    if (existingUser) {
      console.log('\n✓ Committee user already exists');
      console.log(`Email: ${existingUser.email}`);
      console.log(`Name: ${existingUser.name}`);
      
      // Check if they already have the role
      const hasRole = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: existingUser.id,
            roleId: committeeRole.id
          }
        }
      });

      if (!hasRole) {
        console.log('\nAssigning INNOVATION_COMMITTEE role to existing user...');
        await prisma.userRole.create({
          data: {
            userId: existingUser.id,
            roleId: committeeRole.id
          }
        });
        console.log('✓ Role assigned');
      } else {
        console.log('✓ User already has INNOVATION_COMMITTEE role');
      }
    } else {
      // 3. Create the committee user
      console.log('\nCreating committee user account...');
      const hashedPassword = await bcrypt.hash('Committee123!', 10);

      const committeeUser = await prisma.user.create({
        data: {
          email: 'committee@bsj.gov.jm',
          name: 'Innovation Committee',
          passwordHash: hashedPassword,
          roles: {
            create: {
              roleId: committeeRole.id
            }
          }
        },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      console.log('✓ Committee account created successfully!');
      console.log(`\nID: ${committeeUser.id}`);
      console.log(`Email: ${committeeUser.email}`);
      console.log(`Name: ${committeeUser.name}`);
      console.log(`Password: Committee123!`);
      console.log(`Roles: ${committeeUser.roles.map(r => r.role.name).join(', ')}`);
    }

    // 4. Verify the account
    console.log('\n=== Verification ===');
    const verifyUser = await prisma.user.findUnique({
      where: { email: 'committee@bsj.gov.jm' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (verifyUser) {
      console.log('✓ Account verified in database');
      console.log(`Email: ${verifyUser.email}`);
      console.log(`Roles: ${verifyUser.roles.map(r => r.role.name).join(', ')}`);
    }

    console.log('\n=== Login Credentials ===');
    console.log('Email: committee@bsj.gov.jm');
    console.log('Password: Committee123!\n');

  } catch (error) {
    console.error('Error creating committee account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCommitteeAccount();
