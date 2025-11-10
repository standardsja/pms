import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'miki.supplier@bsj.gov.jm';
    const password = 'Passw0rd!';
    const name = 'Miki Supplier';
    const roleName = 'SUPPLIER';

    console.log(`Creating/updating supplier user: ${email}`);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Ensure SUPPLIER role exists
    let role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
        console.log(`Creating role: ${roleName}`);
        role = await prisma.role.create({
            data: {
                name: roleName,
                description: 'Supplier user with access to supplier dashboard',
            },
        });
    }

    // Upsert user
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            name,
        },
        create: {
            email,
            name,
            passwordHash,
        },
    });

    console.log(`✓ User created/updated: ${user.email} (ID: ${user.id})`);

    // Ensure user has SUPPLIER role assigned
    const existingUserRole = await prisma.userRole.findFirst({
        where: {
            userId: user.id,
            roleId: role.id,
        },
    });

    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: role.id,
            },
        });
        console.log(`✓ Assigned ${roleName} role to user`);
    } else {
        console.log(`✓ User already has ${roleName} role`);
    }

    console.log('\n✅ Supplier user setup complete!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${roleName}`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
