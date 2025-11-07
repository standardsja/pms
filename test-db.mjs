// Test database connection
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`\n📊 Database has ${userCount} users`);
    
    // List all users
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
      console.log('\n👥 Users in database:');
      users.forEach(u => console.log(`  - ${u.email} (${u.name})`));
    } else {
      console.log('\n⚠️  No users found in database!');
      console.log('   Run: node server/prisma/simple-seed.cjs');
    }
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\nCheck:');
    console.error('1. MySQL is running');
    console.error('2. DATABASE_URL in .env is correct');
    console.error('3. Database "pms" exists');
    console.error('4. Credentials are valid');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
