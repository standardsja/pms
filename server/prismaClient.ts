import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { PrismaClient } from '../src/generated/prisma/client';

// Load .env at project root for DATABASE_URL
dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

// Single PrismaClient instance for the API server
export const prisma = new PrismaClient();

export async function ensureDbConnection() {
  try {
    await prisma.$connect();
    // simple ping
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    console.error('Prisma connection failed:', err);
    throw err;
  }
}
