#!/bin/bash
# compare-schemas.sh - Compare local and Stork database schemas

LOCAL_DB="${1:-mysql://pms:Password%40101@localhost:3306/pmsdb}"
REMOTE_DB="${2:-mysql://database_admin:03un5gZ1QBls@Stork:3306/db_spinx}"

# Backup existing .env files temporarily
ENV_BACKUP_DIR=$(mktemp -d)
if [ -f "server/prisma/.env" ]; then
  cp server/prisma/.env "$ENV_BACKUP_DIR/.env.prisma.bak"
fi
if [ -f ".env" ]; then
  cp .env "$ENV_BACKUP_DIR/.env.root.bak"
fi

echo "======================================="
echo "Checking LOCAL database schema..."
echo "======================================="
# Temporarily write DATABASE_URL to server/prisma/.env
echo "DATABASE_URL=\"$LOCAL_DB\"" > server/prisma/.env
npx prisma migrate status 2>&1 | grep -v "injecting env" | grep -v "warn"

echo ""
echo "======================================="
echo "Checking STORK database schema..."
echo "======================================="
# Temporarily write DATABASE_URL to server/prisma/.env
echo "DATABASE_URL=\"$REMOTE_DB\"" > server/prisma/.env
npx prisma migrate status 2>&1 | grep -v "injecting env" | grep -v "warn"

# Restore backup .env files
if [ -f "$ENV_BACKUP_DIR/.env.prisma.bak" ]; then
  cp "$ENV_BACKUP_DIR/.env.prisma.bak" server/prisma/.env
else
  rm -f server/prisma/.env
fi
if [ -f "$ENV_BACKUP_DIR/.env.root.bak" ]; then
  cp "$ENV_BACKUP_DIR/.env.root.bak" .env
fi
rm -rf "$ENV_BACKUP_DIR"

echo ""
echo "======================================="
echo "Comparison complete!"
echo "======================================="
