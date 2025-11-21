// Add an additional Evaluation Committee member user
// Usage:
//   node scripts/add-evaluation-committee-member.mjs --email newuser@bsj.gov.jm --name "Second Evaluator" [--password PlainTextPass]
// If --password is omitted a strong random password will be generated and displayed.

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root and prisma env (mirrors existing committee script behavior)
dotenvConfig({ path: path.resolve(__dirname, '..', '.env') });
dotenvConfig({ path: path.resolve(__dirname, '..', 'server', 'prisma', '.env') });

const prisma = new PrismaClient();

function parseArgs() {
    const args = process.argv.slice(2);
    const out = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--')) {
            const key = a.replace(/^--/, '');
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
                out[key] = next;
                i++;
            } else {
                out[key] = true;
            }
        }
    }
    return out;
}

function generatePassword(length = 16) {
    // Generate a strong random password (url-safe base64 substring)
    const buf = crypto.randomBytes(length);
    return buf
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, length);
}

async function main() {
    console.log('\n=== Add Evaluation Committee Member ===');
    const { email, name, password } = parseArgs();

    if (!email) {
        console.error('Missing required --email argument');
        process.exit(1);
    }

    const displayName = name || 'Evaluation Committee Member';
    const plainPassword = password || generatePassword();

    try {
        // Ensure role exists
        let role = await prisma.role.findUnique({ where: { name: 'EVALUATION_COMMITTEE' } });
        if (!role) {
            role = await prisma.role.create({
                data: {
                    name: 'EVALUATION_COMMITTEE',
                    description: 'Evaluation Committee Member - Can review and complete BSJ evaluation sections',
                },
            });
            console.log('✓ Created role EVALUATION_COMMITTEE');
        } else {
            console.log('✓ Role EVALUATION_COMMITTEE exists');
        }

        // Create or fetch user
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const hash = await bcrypt.hash(plainPassword, 10);
            user = await prisma.user.create({
                data: {
                    email,
                    name: displayName,
                    passwordHash: hash,
                },
            });
            console.log(`✓ Created user ${email} (ID: ${user.id})`);
        } else {
            console.log(`✓ User ${email} already exists (ID: ${user.id})`);
        }

        // Assign role if missing
        const userRole = await prisma.userRole.findUnique({
            where: { userId_roleId: { userId: user.id, roleId: role.id } },
        });
        if (!userRole) {
            await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
            console.log('✓ Assigned EVALUATION_COMMITTEE role');
        } else {
            console.log('✓ User already has EVALUATION_COMMITTEE role');
        }

        console.log('\n----------------------------------------');
        console.log('Evaluation Committee Member Credentials');
        console.log('----------------------------------------');
        console.log(`Email:    ${email}`);
        console.log(`Name:     ${displayName}`);
        console.log(`Password: ${plainPassword}`);
        console.log('Role:     EVALUATION_COMMITTEE');
        console.log('----------------------------------------');
        console.log('Provide these credentials securely.');
    } catch (err) {
        console.error('❌ Failed to add evaluation committee member:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
