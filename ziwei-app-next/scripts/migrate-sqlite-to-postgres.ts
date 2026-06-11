/**
 * scripts/migrate-sqlite-to-postgres.ts
 *
 * One-way migration from the legacy SQLite (C:/Projects/ziwei-app/data/fortune_app.db)
 * to the new Postgres schema (apps/web/prisma/schema.prisma).
 *
 * Run nightly during P2-P10 to keep the new DB in sync; final run at cutover.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-sqlite-to-postgres.ts --dry-run
 *   pnpm tsx scripts/migrate-sqlite-to-postgres.ts
 *
 * Notes:
 *  - DB_URL must point to the destination Postgres
 *  - LEGACY_SQLITE_PATH must point to the legacy SQLite file
 *  - Idempotent: re-running upserts by (email) for users, (chartHash) for cache, etc.
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const SQLITE_PATH = process.env.LEGACY_SQLITE_PATH || 'C:/Projects/ziwei-app/data/fortune_app.db';

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

function log(...args: unknown[]) {
  console.log('[migrate]', ...args);
}

function birthHash(info: object): string {
  return createHash('sha256').update(JSON.stringify(info)).digest('hex');
}

interface LegacyUser {
  id: number;
  email: string;
  password_hash: string;
  subscription_type: 'free' | 'premium';
  created_at: string;
}

async function migrateUsers() {
  const rows = sqlite.prepare('SELECT id, email, password_hash, subscription_type, created_at FROM users').all() as LegacyUser[];
  log(`users: ${rows.length} rows in source`);
  if (DRY_RUN) return rows.length;
  let written = 0;
  for (const r of rows) {
    await prisma.user.upsert({
      where: { email: r.email.toLowerCase() },
      create: {
        email: r.email.toLowerCase(),
        passwordHash: r.password_hash,
        role: 'USER',
        createdAt: new Date(r.created_at),
      },
      update: {
        // Don't clobber password (legacy is bcrypt; new is scrypt; both work via verify-and-rehash on next login)
      },
    });
    written++;
  }
  log(`users: ${written} upserted`);
  return written;
}

interface LegacyPrediction {
  id: number;
  user_id: number;
  prediction_type: string;
  birth_info_hash: string;
  birth_info: string;
  prediction_data: string;
  created_at: string;
}

async function migrateCharts() {
  const rows = sqlite.prepare('SELECT id, user_id, prediction_type, birth_info_hash, birth_info, prediction_data, created_at FROM predictions WHERE prediction_type IN (?, ?)').all('ziwei', 'bazi') as LegacyPrediction[];
  log(`charts: ${rows.length} rows in source`);
  if (DRY_RUN) return rows.length;

  // Map legacy user_id (sqlite int) → new user.id (cuid) via email join
  const userEmails = sqlite.prepare('SELECT id, email FROM users').all() as Array<{ id: number; email: string }>;
  const emailById = new Map(userEmails.map((u) => [u.id, u.email.toLowerCase()]));
  const newUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const idByEmail = new Map(newUsers.map((u) => [u.email, u.id]));

  let written = 0;
  for (const r of rows) {
    const email = emailById.get(r.user_id);
    if (!email) continue;
    const newUserId = idByEmail.get(email);
    if (!newUserId) continue;
    const birthInfo = JSON.parse(r.birth_info);
    const chartJson = JSON.parse(r.prediction_data);
    const hash = r.birth_info_hash || birthHash(birthInfo);
    try {
      await prisma.chart.upsert({
        where: { userId_chartHash: { userId: newUserId, chartHash: hash } },
        create: {
          userId: newUserId,
          chartHash: hash,
          birthInfo,
          chartJson,
          engineVersion: 'legacy',
          createdAt: new Date(r.created_at),
        },
        update: {},
      });
      written++;
    } catch (err) {
      log(`chart upsert failed for legacy id=${r.id}:`, (err as Error).message);
    }
  }
  log(`charts: ${written} upserted`);
  return written;
}

interface LegacyPayment {
  id: number;
  user_id: number;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

async function migratePayments() {
  const rows = sqlite.prepare('SELECT id, user_id, payment_id, amount, currency, status, completed_at, created_at FROM payments').all() as LegacyPayment[];
  log(`payments: ${rows.length} rows in source (NOT mirrored — Stripe is canonical going forward)`);
  // Intentional no-op: new system uses Stripe events as source of truth.
  // We keep this here so the script reports the source count for accounting.
  return rows.length;
}

interface LegacyEmailSub {
  user_id: number;
  email: string;
  daily_fortune_enabled: number;
  last_sent_date: string | null;
}

async function migrateEmailPrefs() {
  const rows = sqlite.prepare('SELECT user_id, email, daily_fortune_enabled, last_sent_date FROM email_subscriptions').all() as LegacyEmailSub[];
  log(`email_prefs: ${rows.length} rows in source`);
  if (DRY_RUN) return rows.length;

  const newUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const idByEmail = new Map(newUsers.map((u) => [u.email, u.id]));

  let written = 0;
  for (const r of rows) {
    const userId = idByEmail.get(r.email.toLowerCase());
    if (!userId) continue;
    await prisma.emailPreference.upsert({
      where: { userId },
      create: {
        userId,
        dailyFortuneEnabled: Boolean(r.daily_fortune_enabled),
        weeklyHoroscopeEnabled: true,
        marketingEnabled: true,
        lastSentDate: r.last_sent_date ? new Date(r.last_sent_date) : null,
      },
      update: {
        dailyFortuneEnabled: Boolean(r.daily_fortune_enabled),
        lastSentDate: r.last_sent_date ? new Date(r.last_sent_date) : null,
      },
    });
    written++;
  }
  log(`email_prefs: ${written} upserted`);
  return written;
}

async function main() {
  log(`mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE'}`);
  log(`source: ${SQLITE_PATH}`);

  const stats = {
    users: await migrateUsers(),
    charts: await migrateCharts(),
    emailPrefs: await migrateEmailPrefs(),
    payments: await migratePayments(),
  };

  log('summary:', JSON.stringify(stats, null, 2));
  await prisma.$disconnect();
  sqlite.close();
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
