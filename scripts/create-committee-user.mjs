// Create EVALUATION_COMMITTEE role and assign it to a test user
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files
const rootEnv = path.resolve(__dirname, '..', '.env');
const prismaEnv = path.resolve(__dirname, '..', 'server', 'prisma', '.env');
dotenvConfig({ path: rootEnv });
dotenvConfig({ path: prismaEnv });

const prisma = new PrismaClient();

async function createCommitteeUser() {
    console.log('Creating Evaluation Committee user...\n');

    try {
        // 1. Check if EVALUATION_COMMITTEE role exists, if not create it
        let committeeRole = await prisma.role.findUnique({
            where: { name: 'EVALUATION_COMMITTEE' },
        });

        if (!committeeRole) {
            committeeRole = await prisma.role.create({
                data: {
                    name: 'EVALUATION_COMMITTEE',
                    description: 'Evaluation Committee Member - Can review and complete BSJ evaluation sections',
                },
            });
            console.log('✓ Created EVALUATION_COMMITTEE role');
        } else {
            console.log('✓ EVALUATION_COMMITTEE role already exists');
        }

        // 2. Create or find the committee user
        const password = 'Passw0rd!';
        const hash = await bcrypt.hash(password, 10);

        const committeeUserData = {
            email: 'committee@bsj.gov.jm',
            name: 'Evaluation Committee Member',
        };

        let committeeUser = await prisma.user.findUnique({
            where: { email: committeeUserData.email },
        });

        if (!committeeUser) {
            committeeUser = await prisma.user.create({
                data: {
                    email: committeeUserData.email,
                    name: committeeUserData.name,
                    passwordHash: hash,
                },
            });
            console.log(`✓ Created user ${committeeUser.email} (ID: ${committeeUser.id})`);
        } else {
            console.log(`✓ User ${committeeUser.email} (ID: ${committeeUser.id}) already exists`);
        }

        // 3. Assign EVALUATION_COMMITTEE role to the user
        const existingUserRole = await prisma.userRole.findUnique({
            where: {
                userId_roleId: {
                    userId: committeeUser.id,
                    roleId: committeeRole.id,
                },
            },
        });

        if (!existingUserRole) {
            await prisma.userRole.create({
                data: {
                    userId: committeeUser.id,
                    roleId: committeeRole.id,
                },
            });
            console.log(`✓ Assigned EVALUATION_COMMITTEE role to ${committeeUser.email}`);
        } else {
            console.log(`✓ User already has EVALUATION_COMMITTEE role`);
        }

        // 4. Display user credentials
        console.log('\n========================================');
        console.log('EVALUATION COMMITTEE USER CREDENTIALS');
        console.log('========================================');
        console.log(`Email:    ${committeeUserData.email}`);
        console.log(`Password: ${password}`);
        console.log(`Role:     EVALUATION_COMMITTEE`);
        console.log('========================================\n');

        console.log('✅ Committee user setup complete!');
        console.log('You can now log in with the credentials above.\n');
    } catch (error) {
        console.error('❌ Error creating committee user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createCommitteeUser().catch(console.error);
