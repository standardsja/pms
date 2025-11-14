# PMS File Structure - Organized

## Overview
The PMS (Procurement Management System) project has been cleaned and organized for better maintainability. All test files, temporary migration scripts, and documentation have been properly organized.

## Directory Structure

### Root Level
```
pms/
├── .github/          # GitHub workflows and configurations
├── dist/             # Production build output
├── docs/             # 📁 All project documentation (16 MD files)
├── node_modules/     # NPM dependencies
├── prisma/           # Legacy prisma folder (migrations only)
├── public/           # Public static assets
├── ref/              # Reference materials (PDFs)
├── scripts/          # 📁 Utility scripts (3 scripts + README)
├── server/           # 🚀 Backend Express API
├── src/              # ⚛️ Frontend React application
├── uploads/          # File upload storage
├── .editorconfig     # Editor configuration
├── .env              # Environment variables
├── .gitignore        # Git ignore rules
├── .prettierrc       # Code formatting config
├── CHANGELOG.md      # Version history
├── README.md         # Main project documentation
├── package.json      # NPM configuration
├── tsconfig.json     # TypeScript configuration
└── vite.config.ts    # Vite build configuration
```

### 📁 `/docs` - Documentation (NEW)
All documentation files organized in one location:

**Quick Start Guides:**
- `QUICK_START.md` - General system quick start
- `QUICK_START_TESTING.md` - Testing procedures
- `INNOVATION_HUB_QUICKSTART.md` - Innovation Hub quick start

**Feature Documentation:**
- `INNOVATION_HUB_DOCS.md` - Complete Innovation Hub docs
- `INNOVATION_HUB_PRODUCTION_READY.md` - Production deployment
- `INNOVATION_HUB_OPTIMIZATION.md` - Performance optimizations
- `PROCUREMENT_OFFICER_DASHBOARD.md` - Dashboard features
- `PROCUREMENT_OFFICER_IMPLEMENTATION.md` - Implementation details
- `PROCUREMENT_OFFICER_STRUCTURE.md` - Architecture

**Technical Guides:**
- `BACKEND_MIDDLEWARE_GUIDE.md` - Middleware documentation
- `PRODUCTION_ERROR_HANDLING.md` - Error handling strategies
- `OPTIMIZATION_SUMMARY.md` - All optimizations summary
- `COMMITTEE_OPTIMIZATION.md` - Committee optimizations
- `LOGIN_ANIMATIONS.md` - Login UI animations
- `TESTING_CHECKLIST.md` - Testing checklist
- `README.md` - Documentation index

### 📁 `/scripts` - Utility Scripts
Production-safe utility scripts for database management:

- `create-fallback-users.mjs` - Create test users
- `list-all-users.mjs` - List all users
- `seedInnovation.ts` - Seed Innovation Hub data
- `README.md` - Scripts documentation

### 🚀 `/server` - Backend
```
server/
├── auth/             # Azure AD authentication
├── config/           # Server configuration
├── middleware/       # Express middleware
├── prisma/           # Prisma schema and migrations (ACTIVE)
│   ├── schema.prisma # Database schema
│   ├── seed.ts       # Database seeding
│   └── migrations/   # Database migrations
├── scripts/          # Server utility scripts
│   ├── backfill-vote-counts.mjs
│   ├── create-user-with-role.mjs
│   └── migrate-currency-to-jmd.mjs
├── services/         # Business logic services
├── templates/        # Email templates
├── uploads/          # Upload directory
├── utils/            # Utility functions
├── index.ts          # Main server entry point
└── prismaClient.ts   # Prisma client singleton
```

### ⚛️ `/src` - Frontend
```
src/
├── assets/           # Images, fonts, static files
├── auth/             # Authentication logic
├── components/       # React components
├── pages/            # Page components
├── router/           # React Router configuration
├── services/         # API services
├── store/            # Redux store
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── App.tsx           # Main App component
├── i18n.tsx          # Internationalization
├── main.tsx          # React entry point
└── theme.config.tsx  # Theme configuration
```

## Files Removed (Cleanup)

### ✅ Test Files (Root)
- `test-auth-endpoints.sh`
- `test-auth.ps1`
- `test-db-connection.mjs`
- `test-db.mjs`
- `test-flow.mjs`
- `test-idea-creation.mjs`
- `test-innovation-api.mjs`
- `test-login.mjs`
- `test-vote-api.mjs`
- `test-vote-fix.mjs`
- `test-vote-toggle.mjs`
- `test-voting.mjs`

### ✅ Check/Debug Scripts (Root)
- `check-tables.mjs`
- `check-vote-counts.mjs`

### ✅ Temporary Migration Files
- `add-profile-columns.sql`
- `add-trending-score.sql`
- `apply-migration.mjs`
- `apply-trending-score.ps1`
- `restart-server.ps1`

### ✅ Server Cleanup
- `server/approveIdea.mjs`
- `server/check-ideas.mjs`
- `server/check-innovation-tables.mjs`
- `server/check-votes.mjs`
- `server/checkCommittee.ts`
- `server/checkIdeas.mjs`
- `server/create-supplier.js`
- `server/createCommittee.ts`
- `server/db-connect-test.mjs`
- `server/index.mjs.bak`
- `server/index.ts.old`
- `server/list-users.mjs`
- `server/test-innovation.mjs`
- `server/testIdeaWorkflow.ts`

### ✅ Scripts Directory Cleanup
- `scripts/add-profile-columns.mjs`
- `scripts/check-approved-ideas.mjs`
- `scripts/check-db.mjs`
- `scripts/check-id-types.mjs`
- `scripts/check-ideas-data.mjs`
- `scripts/check-profile-columns.mjs`
- `scripts/check-user-vote.mjs`
- `scripts/test-api-endpoints.mjs`
- `scripts/test-vote-counts.mjs`
- `scripts/test-vote.mjs`
- `scripts/verify-legacy-users.mjs`

### ✅ Server Scripts Cleanup
- `server/scripts/test-admin.mjs`

### ✅ Prisma Cleanup
- `prisma/schema.prisma.bak`
- `prisma/seed.ts` (duplicate - real one in server/prisma)

### ✅ Public Assets Cleanup
- `public/demo-prepare.html`
- `public/test-auth.html`

### ✅ Documentation Moved to /docs
- All task completion markdown files
- All optimization documentation
- All feature-specific guides
- All implementation documentation

## Key Improvements

1. **📁 Centralized Documentation** - All docs in `/docs` with README index
2. **🧹 Clean Root Directory** - Only essential config files remain
3. **🔧 Organized Scripts** - Production scripts in `/scripts` with documentation
4. **🗑️ Removed ~40+ Files** - Test files, backups, and temporary migrations
5. **📝 Added README Files** - Documentation for `/docs` and `/scripts`
6. **🎯 Clear Structure** - Easy to navigate for new developers

## Quick Commands

```bash
# Install dependencies
npm install

# Development
npm run dev                    # Start frontend dev server
npm run server:dev            # Start backend dev server

# Database
npm run prisma:seed           # Seed database

# Utility Scripts
node scripts/create-fallback-users.mjs
node scripts/list-all-users.mjs
npx tsx scripts/seedInnovation.ts

# Server Maintenance
node server/scripts/backfill-vote-counts.mjs
```

## Notes

- Active Prisma schema is in `server/prisma/schema.prisma`
- Root `/prisma` folder only contains migration history
- All test files removed - use proper test framework if needed
- Documentation now easy to find in `/docs` folder
- Only production-ready scripts remain

---

**Last Organized:** November 13, 2025
**Version:** 2.0.0-beta
