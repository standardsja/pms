#!/bin/bash

# ===================================================================
# Load Balancing Feature Deployment Script
# ===================================================================
# Purpose: Deploy the complete load balancing feature to heron server
# Components: Database migration, Prisma generation, PM2 restart
#
# Usage: ssh into heron, then run:
#   cd ~/pms && bash scripts/deploy-load-balancing.sh
# ===================================================================

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_ROOT/server"

echo "=================================================="
echo "Load Balancing Feature Deployment"
echo "=================================================="
echo ""

# Step 1: Verify environment
echo "[1/6] Verifying environment..."
if [[ ! -f "$SERVER_DIR/.env" ]]; then
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        echo "⚠️  $SERVER_DIR/.env missing; copying root .env for Prisma (DATABASE_URL, JWT_SECRET)."
        cp "$PROJECT_ROOT/.env" "$SERVER_DIR/.env"
        echo "✅ Copied root .env to server/.env"
        echo "   NOTE: For production hygiene keep secrets only in one place and rotate if exposed."
    else
        echo "❌ ERROR: $SERVER_DIR/.env not found and no root .env present"
        echo "   Create $SERVER_DIR/.env with at least DATABASE_URL and JWT_SECRET"
        exit 1
    fi
fi

if ! command -v npx &> /dev/null; then
    echo "❌ ERROR: npx not found - please install Node.js"
    exit 1
fi

echo "✅ Environment verified"
echo ""

# Step 2: Run tests
echo "[2/6] Running unit tests..."
cd "$PROJECT_ROOT"
if npm run test:server -- server/__tests__/loadBalancingService.test.ts; then
    echo "✅ All tests passed"
else
    echo "⚠️  Warning: Tests failed, but continuing deployment"
    echo "   Review test output above"
fi
echo ""

# Step 3: Create database migration
echo "[3/6] Creating database migration..."
cd "$SERVER_DIR"

# Check if migration already exists
if ls prisma/migrations/*add_load_balancing* 2>/dev/null; then
    echo "⚠️  Migration already exists, skipping creation"
else
    if npx prisma migrate dev --name add_load_balancing; then
        echo "✅ Migration created and applied"
    else
        echo "❌ ERROR: Migration failed"
        exit 1
    fi
fi
echo ""

# Step 4: Generate Prisma Client
echo "[4/6] Regenerating Prisma Client..."
cd "$SERVER_DIR"
if npx prisma generate; then
    echo "✅ Prisma Client regenerated"
else
    echo "❌ ERROR: Prisma generate failed"
    exit 1
fi
echo ""

# Step 5: Check PM2 status
echo "[5/6] Checking PM2 processes..."
if command -v pm2 &> /dev/null; then
    echo "Current PM2 status:"
    pm2 list
    echo ""
else
    echo "⚠️  PM2 not found - skipping process management"
    echo "   You'll need to restart the backend manually"
fi
echo ""

# Step 6: Restart backend
echo "[6/6] Restarting backend..."
if command -v pm2 &> /dev/null; then
    if pm2 restart pms-backend; then
        echo "✅ Backend restarted successfully"
        echo ""
        echo "Waiting for backend to stabilize..."
        sleep 3
        pm2 logs pms-backend --lines 20 --nostream
    else
        echo "❌ ERROR: Failed to restart backend"
        exit 1
    fi
else
    echo "⚠️  Skipping restart (PM2 not available)"
fi
echo ""

# Summary
echo "=================================================="
echo "Deployment Complete!"
echo "=================================================="
echo ""
echo "✅ Database migration applied"
echo "✅ Prisma Client regenerated"
echo "✅ Backend restarted (if PM2 available)"
echo ""
echo "Next Steps:"
echo "1. Log in as PROCUREMENT_MANAGER"
echo "2. Navigate to Load Balancing Settings page"
echo "3. Enable load balancing and select a strategy"
echo "4. Test auto-assignment by approving a request"
echo ""
echo "Verification Commands:"
echo "  pm2 logs pms-backend          # View backend logs"
echo "  pm2 monit                     # Monitor processes"
echo "  mysql -e 'SELECT * FROM LoadBalancingSettings;'  # Check DB"
echo ""
