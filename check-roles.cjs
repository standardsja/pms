const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 35 },
      include: {
        roles: { include: { role: true } },
        department: true
      }
    });

    console.log('User:', user.name);
    console.log('Email:', user.email);
    console.log('Department:', user.department?.name, `(${user.department?.code})`);
    console.log('Roles:', user.roles.map(ur => ur.role.name));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
