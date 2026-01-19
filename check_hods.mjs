import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const hods = await prisma.user.findMany({ 
    where: { roles: { some: { role: { name: "HEAD_OF_DIVISION" } } } } },
    take: 20
  });
  console.log("All HODs:", hods.map(h => ({ id: h.id, name: h.name, deptId: h.departmentId })));
  
  const dms = await prisma.departmentManager.findMany({ take: 20 });
  console.log("DepartmentManager:", dms);
  
  const hr = await prisma.department.findFirst({ where: { name: { contains: "Human" } } });
  console.log("HR:", { id: hr?.id, name: hr?.name });
  
  await prisma.$disconnect();
})();
