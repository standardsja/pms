// Load both root .env and server Prisma .env so CLI commands have DATABASE_URL
import "dotenv/config";
import path from "path";
import * as dotenv from "dotenv";
// Prefer server/prisma/.env if present
dotenv.config({ path: path.resolve(process.cwd(), "server", "prisma", ".env") });
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "server/prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
