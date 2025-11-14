// Load both root .env and server Prisma .env so CLI commands have DATABASE_URL
import 'dotenv/config';
import path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prefer a .env in server/prisma for the innovation hub extended schema; fall back to root .env
const serverPrismaEnv = path.resolve(process.cwd(), 'server', 'prisma', '.env');
if (fs.existsSync(serverPrismaEnv)) {
  dotenv.config({ path: serverPrismaEnv });
}

// Use the server/prisma/schema.prisma as authoritative combined procurement + innovation schema.
// (Root prisma/schema.prisma kept for historical reference but not used by CLI now.)
export default defineConfig({
  schema: 'server/prisma/schema.prisma',
  migrations: { path: 'server/prisma/migrations' },
  engine: 'classic',
  datasource: { url: env('DATABASE_URL') },
});
