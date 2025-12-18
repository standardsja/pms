# Project Folder Structure Guide

## Root Level - Essential Files Only

```
pms/
├── README.md                    # Project overview (KEEP IN ROOT)
├── CHANGELOG.md                 # Version history (KEEP IN ROOT)
├── CONTRIBUTING.md              # Contribution guidelines (KEEP IN ROOT)
├── DEPLOYMENT.md                # Deployment instructions (KEEP IN ROOT)
├── package.json                 # Dependencies
├── package-lock.json            # Lock file
├── index.html                   # Frontend entry point
├── tsconfig.json                # TypeScript config (root)
├── tsconfig.node.json           # TypeScript config (node tools)
├── tsconfig.server.json         # TypeScript config (server)
├── vite.config.ts               # Vite bundler config
├── vitest.config.ts             # Vitest config
├── vitest.setup.ts              # Vitest setup
├── prisma.config.ts             # Prisma config
├── ecosystem.config.cjs          # PM2 config
├── postcss.config.cjs           # PostCSS config
├── tailwind.config.cjs          # Tailwind config
├── vercel.json                  # Vercel deployment config
└── .gitignore, .env, etc.       # Config files
```

## Folders - Organized by Purpose

### `/docs/` - All Documentation

**Architecture & Implementation:**

-   `ARCHITECTURE.md` - System design overview
-   `QUICK_START.md` - Getting started guide
-   `PRODUCTION_*.md` - Production deployment guides

**Feature Documentation:**

-   `INNOVATION_HUB_*.md` - Innovation hub features
-   `LDAP_*.md` - LDAP authentication
-   `RBAC_*.md` - Role-based access control
-   `PROCUREMENT_*.md` - Procurement features
-   `ROLE_REQUEST_*.md` - Role request system

**Reports & Testing:**

-   `*_REPORT.md` - Audit/security/test reports
-   `*_TEST*.md` - Test documentation
-   `*_FIXES.md` - Bug fix documentation
-   `SECURITY_*.md` - Security documentation

### `/scripts/` - All Utility & Test Scripts

**Organization within scripts:**

```
scripts/
├── Test Files
│   ├── test-*.ts
│   ├── test-*.mjs
│   └── test-*.sql
├── Check/Debug Scripts
│   ├── check-*.ts
│   ├── check-*.js
│   └── debug-*.mjs
├── Admin Utilities
│   ├── assign-admin.ts
│   ├── unblock-user.ts
│   └── create-*.mjs
├── Setup/Deployment
│   ├── deploy-*.ps1
│   ├── setup-*.ps1
│   ├── sync-*.ps1
│   ├── build.mjs
│   └── start-server.cmd
└── Database
    └── *.sql files
```

**Naming Convention:**

-   `test-<feature>.ts` - Unit/feature tests
-   `check-<item>.ts` - Verification scripts
-   `debug-<system>.mjs` - Debug utilities
-   `create-<resource>.mjs` - Resource creation
-   `setup-<feature>.ps1` - Setup scripts
-   `deploy-<target>.ps1` - Deployment scripts
-   `sync-<source>.ps1` - Sync/integration scripts

### `/server/` - Backend Code

```
server/
├── __tests__/           # Backend unit tests
├── config/              # Configuration files
│   ├── environment.ts
│   ├── ldapGroupMapping.ts
│   ├── roles-permissions.json
│   └── logger.ts
├── middleware/          # Express middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── validation.ts
├── prisma/              # Database
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── routes/              # API route handlers
│   ├── auth.ts
│   ├── admin.ts
│   ├── requests.ts
│   └── ...
├── services/            # Business logic
│   ├── ldapService.ts
│   ├── websocketService.ts
│   └── ...
├── types/               # TypeScript interfaces
├── utils/               # Helper functions
├── jobs/                # Background jobs
└── index.ts             # Express app entry
```

### `/src/` - Frontend Code

```
src/
├── components/          # React components
│   ├── Layouts/
│   ├── Common/
│   └── Procurement/
├── pages/               # Route pages
│   ├── Procurement/
│   ├── Innovation/
│   └── ...
├── hooks/               # React hooks
├── services/            # API client services
│   ├── evaluationService.ts
│   ├── requestService.ts
│   └── ...
├── store/               # State management (Zustand/Redux)
├── types/               # TypeScript interfaces
├── utils/               # Helper functions
├── styles/              # Global stylesheets
├── App.tsx
└── main.tsx
```

### `/docs/` - Sub-organization

For larger doc collections, create subdirectories:

```
docs/
├── GUIDES/              # How-to guides
│   ├── LDAP_SETUP.md
│   ├── DEPLOYMENT.md
│   └── ...
├── ARCHITECTURE/        # Technical design
│   ├── RBAC.md
│   ├── WORKFLOW.md
│   └── ...
├── REPORTS/             # Test/audit reports
│   ├── SECURITY_AUDIT.md
│   ├── TEST_RESULTS.md
│   └── ...
└── FEATURES/            # Feature documentation
    ├── INNOVATION_HUB.md
    ├── PROCUREMENT.md
    └── ...
```

## What Goes Where - Quick Reference

| Item               | Location            | Reason                                     |
| ------------------ | ------------------- | ------------------------------------------ |
| README.md          | Root                | Standard practice, first file users see    |
| CHANGELOG.md       | Root                | Standard practice, version history         |
| CONTRIBUTING.md    | Root                | Standard practice, contribution guidelines |
| DEPLOYMENT.md      | Root                | Critical operational docs                  |
| Test reports       | `/docs/`            | Documentation, not code                    |
| Security reports   | `/docs/`            | Documentation, not code                    |
| Test scripts       | `/scripts/`         | Executable code                            |
| Deployment scripts | `/scripts/`         | Executable code                            |
| Database setup     | `/scripts/`         | Executable code                            |
| Component code     | `/src/components/`  | Frontend code                              |
| API logic          | `/server/services/` | Backend logic                              |
| Database schema    | `/server/prisma/`   | Data structure                             |
| API routes         | `/server/routes/`   | Route handlers                             |

## Cleanup Rules

Enforce via `.gitignore`:

```
# Prevent markdown files in root (except approved list)
/*_REPORT.md
/*_TEST*.md
/*_FIXES.md

# Prevent scripts in root
/test-*.ts
/check-*.ts
/*.mjs
/*.ps1
```

## Best Practices

1. ✓ Keep root clean - only essential config files
2. ✓ All executable scripts in `/scripts/`
3. ✓ All documentation in `/docs/`
4. ✓ Organized code in `/src/` and `/server/`
5. ✓ Follow naming conventions consistently
6. ✓ Use .gitignore to prevent clutter
7. ✓ Update this guide when structure changes
