Prisma schema and seed for the Procurement app

Quick setup

1. Install Prisma and the client in the project (from repo root):

   ```bash
   npm install -D prisma
   npm install @prisma/client
   ```

2. Set the `DATABASE_URL` environment variable to point at your MySQL instance. Example:

   ```bash
   export DATABASE_URL="mysql://user:pass@localhost:3306/pms_dev"
   ```

3. Push the schema to the database or run a migration:

   ```bash
   npx prisma db push
   # or to use migrations:
   # npx prisma migrate dev --name init
   ```

4. Generate the Prisma client (if using `db push`):

   ```bash
   npx prisma generate
   ```

5. Run the seed script to create sample roles and users:

   ```bash
   # If you have ts-node installed:
   npx ts-node server/prisma/seed.ts

   # Or compile and run with node (requires a build step / transpile to JS):
   # npx tsc server/prisma/seed.ts --outDir dist && node dist/server/prisma/seed.js
   ```

Notes
- The schema is configured for MySQL. Adjust `provider` in `schema.prisma` if you need PostgreSQL or SQLite for local testing.
- The seed script uses the generated Prisma client. If you change the schema, run `npx prisma generate` before running the seed.
