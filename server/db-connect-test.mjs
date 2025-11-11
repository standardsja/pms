#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  try {
    // Basic connectivity check: list first user id if present
    const users = await prisma.user.findMany({ select: { id: true, email: true }, take: 1 });
    const ideaCount = await prisma.idea.count().catch(() => null);
    const duration = Date.now() - start;

    console.log(JSON.stringify({
      status: 'PASS',
      durationMs: duration,
      sampleUser: users[0] || null,
      ideaCount,
      dbUrlRedacted: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:(?:[^:@]*?)@/, ':***@') : null
    }, null, 2));
  } catch (err) {
    const duration = Date.now() - start;
    console.error(JSON.stringify({
      status: 'FAIL',
      durationMs: duration,
      error: err.message,
      stack: err.stack?.split('\n').slice(0,3),
      dbUrlRedacted: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:(?:[^:@]*?)@/, ':***@') : null
    }, null, 2));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
