# Utility Scripts

This directory contains utility scripts for database management and system maintenance.

## Available Scripts

### Database Management
- **`create-fallback-users.mjs`** - Creates fallback test users for development
- **`list-all-users.mjs`** - Lists all users in the database with their roles
- **`seedInnovation.ts`** - Seeds the Innovation Hub with sample data

## Usage

Run scripts from the project root directory:

```bash
# Example: Create fallback users
node scripts/create-fallback-users.mjs

# Example: List all users
node scripts/list-all-users.mjs

# Example: Seed innovation data
npx tsx scripts/seedInnovation.ts
```

## Server Scripts

Additional maintenance scripts are located in `server/scripts/`:
- **`backfill-vote-counts.mjs`** - Recalculates vote counts for all ideas
- **`create-user-with-role.mjs`** - Creates a user with a specific role
- **`migrate-currency-to-jmd.mjs`** - Migrates currency values to JMD
