/**
 * Create sample notifications for testing
 * Usage: node --import tsx scripts/create-test-notifications.mjs <userId>
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function createTestNotifications(userId) {
    console.log(`Creating test notifications for user ID: ${userId}...`);

    const notifications = [
        {
            userId: parseInt(userId, 10),
            type: 'MENTION',
            message: 'You were mentioned in a new innovation idea discussion',
        },
        {
            userId: parseInt(userId, 10),
            type: 'STAGE_CHANGED',
            message: 'Your idea "Smart Office Automation" moved to Review stage',
        },
        {
            userId: parseInt(userId, 10),
            type: 'IDEA_APPROVED',
            message: 'Your innovation idea "Cost Optimization Tool" has been approved!',
        },
        {
            userId: parseInt(userId, 10),
            type: 'MENTION',
            message: 'Sarah Johnson mentioned you in a comment',
            readAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago, already read
        },
    ];

    try {
        for (const notification of notifications) {
            const created = await prisma.notification.create({
                data: notification,
            });
            console.log(`✓ Created notification: ${created.message}`);
        }
        console.log('\n✅ All test notifications created successfully!');
    } catch (error) {
        console.error('❌ Error creating notifications:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
    console.error('❌ Error: Please provide a user ID');
    console.log('Usage: node --loader tsx scripts/create-test-notifications.mjs <userId>');
    process.exit(1);
}

createTestNotifications(userId);
