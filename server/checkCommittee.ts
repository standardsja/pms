import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCommitteeAccounts() {
  try {
    // Check for committee accounts
    const committeeUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'INNOVATION_COMMITTEE'
            }
          }
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        department: true
      }
    });

    console.log('\n=== Committee Accounts ===');
    console.log(`Found ${committeeUsers.length} committee account(s)\n`);
    
    if (committeeUsers.length > 0) {
      committeeUsers.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name}`);
        console.log(`Department: ${user.department?.name || 'None'}`);
        console.log(`Roles: ${user.roles.map(r => r.role.name).join(', ')}`);
        console.log('---');
      });
    } else {
      console.log('No committee accounts found in the database.');
    }

    // Also check all users to see what roles exist
    const allUsers = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('\n=== All Users Summary ===');
    console.log(`Total users: ${allUsers.length}\n`);
    allUsers.forEach(user => {
      const roleNames = user.roles.map(r => r.role.name).join(', ') || 'No roles';
      console.log(`${user.email} - ${user.name || 'No name'} - Roles: ${roleNames}`);
    });

    // Check all roles in the system
    const allRoles = await prisma.role.findMany();
    console.log('\n=== All Roles in System ===');
    allRoles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role.id})`);
    });

  } catch (error) {
    console.error('Error checking committee accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCommitteeAccounts();
