#!/usr/bin/env bash
set -euo pipefail

# switch-db.sh
# Usage: ./scripts/switch-db.sh [local|prod]
#
# This script switches environment files between local and production variants.
# It will look for these files in the repo root and in the `server/` folder:
#   .env.local    -> environment for local DB development
#   .env.prod     -> environment for production (heron) DB
#
# The script will back up existing `.env` files before replacing them and will
# attempt to restart a PM2 process named `pms-backend` if present.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 [local|prod]"
  exit 2
fi

TARGET="$1"

if [ "$TARGET" != "local" ] && [ "$TARGET" != "prod" ]; then
  echo "Invalid target: $TARGET. Use 'local' or 'prod'."
  exit 2
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)

switch_one() {
  local src_dir="$1"
  local src_name="$2"
  local dest_name="$3"

  local src_path="$src_dir/$src_name"
  local dest_path="$src_dir/$dest_name"

  if [ ! -f "$src_path" ]; then
    echo "  - Skipping $src_path (not found)"
    return
  fi

  if [ -f "$dest_path" ]; then
    echo "  - Backing up $dest_path -> ${dest_path}.bak.$TIMESTAMP"
    cp -a "$dest_path" "${dest_path}.bak.$TIMESTAMP"
  fi

  echo "  - Copying $src_path -> $dest_path"
  cp -a "$src_path" "$dest_path"
}

echo "Switching environment to: $TARGET"
echo "Project root: $ROOT_DIR"

if [ "$TARGET" = "local" ]; then
  SRC_ROOT_FILE=".env.local"
  SRC_SERVER_FILE="server/.env.local"
else
  SRC_ROOT_FILE=".env.prod"
  SRC_SERVER_FILE="server/.env.prod"
fi

echo "Processing root .env files..."
switch_one "$ROOT_DIR" "$SRC_ROOT_FILE" ".env"

echo "Processing server/.env files..."
switch_one "$ROOT_DIR/server" "${SRC_SERVER_FILE##server/}" ".env"

echo "Finished switching files."

# Try to restart pm2 process if it exists
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "pms-backend"; then
    echo "Restarting pm2 process 'pms-backend'..."
    pm2 restart pms-backend || echo "  pm2 restart returned non-zero exit code"
  else
    echo "pm2 is installed but 'pms-backend' process not found. Start or restart your server manually."
  fi
else
  echo "pm2 not found on PATH. If you run the server with another tool, restart it now."
fi

echo "Note: Ensure your .env.local and .env.prod files contain the correct DATABASE_URL / MYSQL settings."
echo "Example: create '$ROOT_DIR/.env.local' and '$ROOT_DIR/.env.prod' with appropriate DB connection strings."

exit 0
