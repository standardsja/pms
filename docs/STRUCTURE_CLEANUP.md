# Project Structure Cleanup Summary

## Changes Made (2025-12-18)

### Root Directory Cleaned ✓

**Moved to `/scripts/` directory:**

-   Test files: `test-*.ts`, `test-*.mjs`, `test-*.sql`
-   Check scripts: `check-*.ts`, `check-*.js`, `check-*.cjs`
-   Admin utilities: `assign-admin.ts`, `unblock-user.ts`
-   Update utilities: `update-pinned-module.ts`
-   Phone/profile utilities: `clear-phone.mjs`, `reset-profile.js`
-   Deployment/setup scripts: `deploy-update.ps1`, `sync-ldap-users.ps1`, `setup-supplier-notifications.ps1`, `start-server.cmd`, `serve-frontend.mjs`, `build.mjs`

**Removed:**

-   Backup .env files: `.env.bak.20251211-115559`, `.env.bak.20251215-081446`, `.env.bak.20251217-103524`
-   Log files: `server.log`

### Updated `.gitignore` ✓

Added patterns to prevent future root clutter:

```
.env.bak.*          # Backup environment files
/test-*.ts          # Test scripts should be in /scripts
/check-*.ts         # Check scripts should be in /scripts
/assign-*.ts        # Utility scripts should be in /scripts
/unblock-*.ts       # Utility scripts should be in /scripts
/update-*.ts        # Utility scripts should be in /scripts
/clear-*.mjs        # Utility scripts should be in /scripts
/reset-*.js         # Utility scripts should be in /scripts
*.sql               # SQL files should be in /scripts
```

## Current Root Structure

**Configuration Files (Required):**

-   `tsconfig.json`, `tsconfig.node.json`, `tsconfig.server.json`
-   `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`
-   `package.json`, `package-lock.json`
-   `ecosystem.config.cjs`, `postcss.config.cjs`, `tailwind.config.cjs`, `prisma.config.ts`
-   `vercel.json`

**Documentation:**

-   `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `DEPLOYMENT.md`
-   Architecture reports: `ADMIN_DASHBOARD_TEST_REPORT.md`, `RBAC_REFACTORING_FINAL_REPORT.md`, `CRITICAL_SECURITY_FIXES.md`, `INNOVATION_HUB_SECURITY_TEST.md`

**Public/Build:**

-   `index.html`

## Directory Structure Overview

```
pms/
├── .github/              # GitHub Actions, config
├── .vscode/              # VS Code settings
├── docs/                 # Architecture & guides
├── public/               # Static assets
├── ref/                  # Reference files
├── scripts/              # All utility & test scripts (NEWLY ORGANIZED)
├── server/               # Backend (Express, Prisma, services)
│   ├── __tests__/        # Backend unit tests
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── prisma/           # Database schema & migrations
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── src/                  # Frontend (React + Vite)
│   ├── components/       # React components
│   ├── hooks/            # React hooks
│   ├── pages/            # Route pages
│   ├── services/         # API client services
│   ├── store/            # State management
│   ├── styles/           # Stylesheets
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── uploads/              # User file uploads
├── .env.example          # Environment template
├── package.json          # Dependencies
└── ... (config files)
```

## Benefits

✓ **Cleaner root directory** - Only essential config files at root level
✓ **Better organization** - All scripts in one place (`/scripts`)
✓ **Easier navigation** - Clear separation of concerns
✓ **Prevents clutter** - `.gitignore` rules prevent new script files in root
✓ **Improved maintainability** - Easier to find and manage utility scripts

## Next Steps

When creating new utility/test scripts:

-   Place them in `/scripts/` directory
-   Follow naming convention: `<category>-<description>.ts|mjs|cjs|ps1|cmd`
-   Example: `scripts/deploy-staging.ps1`, `scripts/test-ldap-sync.mjs`
