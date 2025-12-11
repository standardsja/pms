import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding navigation menu items...');

    // Clear existing menus
    await prisma.navigationMenu.deleteMany();

    // Seed default menu items
    const menus = await prisma.navigationMenu.createMany({
        data: [
            {
                menuId: 'my-profile',
                label: 'My Profile',
                icon: 'IconUser',
                path: '/profile',
                description: 'View and edit your profile',
                displayOrder: 1,
                isActive: true,
            },
            {
                menuId: 'account-settings',
                label: 'Account Settings',
                icon: 'settings',
                path: '/settings',
                description: 'Manage account settings and preferences',
                displayOrder: 2,
                isActive: true,
            },
            {
                menuId: 'help-support',
                label: 'Help & Support',
                icon: 'IconInfoCircle',
                path: '/help',
                description: 'Get help and support',
                displayOrder: 3,
                isActive: true,
            },
        ],
    });

    console.log(`✅ Seeded ${menus.count} navigation menu items`);

    // Verify seeded data
    const allMenus = await prisma.navigationMenu.findMany({
        orderBy: { displayOrder: 'asc' },
    });

    console.log('\n📋 Seeded Menu Items:');
    allMenus.forEach((menu) => {
        console.log(`  - ${menu.label} (${menu.menuId}) → ${menu.path} [Order: ${menu.displayOrder}]`);
    });

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
});
