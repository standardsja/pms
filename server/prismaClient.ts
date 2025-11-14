import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load env in priority order: server/prisma/.env (schema-local) overrides root .env
const rootEnv = path.resolve(process.cwd(), '.env');
const prismaEnv = path.resolve(process.cwd(), 'server', 'prisma', '.env');
// Load root first, then override with prisma env if present
dotenvConfig({ path: rootEnv });
dotenvConfig({ path: prismaEnv });

// Single PrismaClient instance for the API server
export const prisma = new PrismaClient();

export async function ensureDbConnection() {
  try {
    await prisma.$connect();
    // simple ping
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    // Log a sanitized hint for easier troubleshooting (host:port only)
    try {
      const url = process.env.DATABASE_URL || '';
      const m = url.match(/^[^:]+:\/\/[\w-]+(?::[^@]*)?@([^/:?#]+)(?::(\d+))?/);
      if (m) {
        const host = m[1];
        const port = m[2] || '3306';
        console.error(`Prisma connection failed (host=${host}, port=${port})`);
      }
    } catch {}
    console.error('Prisma connection failed:', err);
    throw err;
  }
}
