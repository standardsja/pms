/**
 * Create sample messages for testing
 * Usage: node --import tsx scripts/create-test-messages.mjs <toUserId> <fromUserId>
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function createTestMessages(toUserId, fromUserId) {
    console.log(`Creating test messages for user ID: ${toUserId} from user ID: ${fromUserId}...`);

    const messages = [
        {
            fromUserId: parseInt(fromUserId, 10),
            toUserId: parseInt(toUserId, 10),
            subject: 'RFQ-2024-089 Approval Needed',
            body: 'Please review and approve the RFQ for office supplies. The deadline is approaching and we need your approval to proceed.',
        },
        {
            fromUserId: parseInt(fromUserId, 10),
            toUserId: parseInt(toUserId, 10),
            subject: 'Innovation Meeting Tomorrow',
            body: 'Reminder: Innovation Committee meeting scheduled for tomorrow at 10 AM. Please prepare your idea reviews.',
        },
        {
            fromUserId: parseInt(fromUserId, 10),
            toUserId: parseInt(toUserId, 10),
            subject: 'Budget Update Required',
            body: "Your department's budget allocation needs to be updated in the system by end of day.",
        },
        {
            fromUserId: parseInt(fromUserId, 10),
            toUserId: parseInt(toUserId, 10),
            subject: 'Welcome to the PMS',
            body: 'Welcome to the Procurement Management System! This is a sample message to help you get started.',
            readAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago, already read
        },
    ];

    try {
        for (const message of messages) {
            const created = await prisma.message.create({
                data: message,
            });
            console.log(`✓ Created message: ${created.subject}`);
        }
        console.log('\n✅ All test messages created successfully!');
    } catch (error) {
        console.error('❌ Error creating messages:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Get userIds from command line
const toUserId = process.argv[2];
const fromUserId = process.argv[3];

if (!toUserId || !fromUserId) {
    console.error('❌ Error: Please provide both toUserId and fromUserId');
    console.log('Usage: node --loader tsx scripts/create-test-messages.mjs <toUserId> <fromUserId>');
    console.log('Example: node --loader tsx scripts/create-test-messages.mjs 1 2');
    process.exit(1);
}

createTestMessages(toUserId, fromUserId);
