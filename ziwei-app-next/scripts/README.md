# scripts/

One-off / scheduled scripts for the new ziwei-app stack.

## migrate-sqlite-to-postgres.ts

One-way migration from the legacy SQLite to the new Postgres.

```bash
# Dry-run prints counts, makes no writes:
LEGACY_SQLITE_PATH="C:/Projects/ziwei-app/data/fortune_app.db" \
DATABASE_URL="postgres://..." \
pnpm tsx scripts/migrate-sqlite-to-postgres.ts --dry-run

# Live run:
pnpm tsx scripts/migrate-sqlite-to-postgres.ts
```

Run nightly during P2-P10 to keep the new DB warm. Final run at cutover.

Idempotent: re-running upserts by `email` (users), `(userId, chartHash)` (charts), `userId` (email prefs). Legacy `payments` rows are intentionally NOT mirrored — Stripe events become the canonical billing source from P2.
