# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0-beta] - 2025-11-13

Status: Beta (pre-release)

### Added
- Trending service with time-decay scoring and hourly job.
- Duplicate detection via fuzzy matching (Dice's Coefficient).
- Relevance-based search with weighted scoring and autocomplete.
- Committee service with batch approve/reject and dashboard/member stats.
- WebSockets (Socket.io) with room-based subscriptions and rich events.
- Analytics service with pre-aggregations, background job, and endpoints.
- Monitoring service with request/cache/DB metrics and health endpoints.

### Changed
- Optimized promote/approve/reject flows to minimize queries and emit events.
- Refactored server bootstrap to support WebSockets and rate limiting.
- Added composite DB indexes and `trendingScore` field for fast sorts.

### Security
- Multi-tier rate limiting across general, auth, votes, idea creation, and batch ops.
- Improved input validation and cache invalidation consistency.

### Developer Experience
- Documentation updates: `QUICK_START.md`, `ALL_TASKS_COMPLETE.md`, `PRIORITY_4_COMPLETE.md`.
- Version set to `2.0.0-beta` in `package.json`.

### Migration Notes
- Run Prisma generate and deploy migrations once DB is online:
  - `npx prisma generate --schema=server/prisma/schema.prisma`
  - `npx prisma migrate deploy --schema=server/prisma/schema.prisma`

### Known Items
- `package-lock.json` may still reflect older version until next install.
- Trending score updates use raw SQL to avoid Prisma type lag.

---

Keep an eye on `GET /health` and `GET /api/metrics` during beta.
