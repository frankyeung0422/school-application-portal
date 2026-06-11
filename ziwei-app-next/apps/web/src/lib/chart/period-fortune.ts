import 'server-only';
import {
  computeAllSystems,
  computeTransits,
  analyzeAlerts,
  type BirthInfo,
  type TransitScope,
  type TransitSnapshot,
  type ScopedAlert,
} from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import { buildTransitVars } from './context';

/**
 * Shared engine for personalized period fortunes + period alerts. Used by the
 * dashboard pages (read path) and the cron routes (delivery path) so both share
 * one idempotent code path keyed by the engine's `periodKey`.
 */

const PROMPT_BY_SCOPE: Record<TransitScope, string> = {
  day: 'unified-daily',
  month: 'unified-monthly',
  year: 'unified-yearly',
};

export interface PrimarySubject {
  subjectId: string;
  label: string | null;
  birth: BirthInfo;
}

/** The user's most-recent saved 命主 (Subject with ≥1 chart). Null if none. */
export async function loadPrimarySubject(userId: string): Promise<PrimarySubject | null> {
  const subject = await prisma.subject.findFirst({
    where: { userId, charts: { some: {} } },
    orderBy: { createdAt: 'desc' },
  });
  if (!subject) return null;
  return {
    subjectId: subject.id,
    label: subject.label,
    birth: subject.birthInfo as unknown as BirthInfo,
  };
}

export interface PeriodFortune {
  body: string;
  periodLabel: string;
  periodKey: string;
  fromCache: boolean;
  snapshot: TransitSnapshot;
}

/**
 * Read-through the Fortune cache for (user, subject, scope, period). On miss,
 * generate via the unified-{scope} prompt and persist. Idempotent: concurrent
 * or repeated calls for the same period reuse the stored reading.
 */
export async function getOrCreatePeriodFortune(params: {
  userId: string;
  subject: PrimarySubject;
  scope: TransitScope;
  date: Date;
}): Promise<PeriodFortune> {
  const { userId, subject, scope, date } = params;
  const all = computeAllSystems(subject.birth);
  const snapshot = computeTransits(subject.birth, all, { scope, date });
  const key = {
    userId_subjectId_scope_periodKey: {
      userId,
      subjectId: subject.subjectId,
      scope,
      periodKey: snapshot.periodKey,
    },
  };

  const existing = await prisma.fortune.findUnique({ where: key });
  if (existing) {
    return { body: existing.body, periodLabel: snapshot.periodLabel, periodKey: snapshot.periodKey, fromCache: true, snapshot };
  }

  const vars = buildTransitVars(
    { ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart },
    snapshot,
    { label: subject.label ?? '命主', gender: subject.birth.gender, birth: subject.birth },
  );
  const res = await generate({ promptId: PROMPT_BY_SCOPE[scope], userId, vars });

  await prisma.fortune.upsert({
    where: key,
    update: { body: res.text, model: res.model, promptId: res.promptId, snapshotJson: snapshot as unknown as object },
    create: {
      userId,
      subjectId: subject.subjectId,
      scope,
      periodKey: snapshot.periodKey,
      body: res.text,
      promptId: res.promptId,
      model: res.model,
      snapshotJson: snapshot as unknown as object,
    },
  });

  return { body: res.text, periodLabel: snapshot.periodLabel, periodKey: snapshot.periodKey, fromCache: false, snapshot };
}

/**
 * Run the scoped multi-system alert analyzer for a snapshot and upsert the
 * results. Dedup is by (userId, alertHash) where the hash embeds the periodKey,
 * so a pattern fires once per period and re-fires next period. Returns the
 * ScopedAlerts produced (whether newly created or already present).
 */
export async function syncPeriodAlerts(params: {
  userId: string;
  birth: BirthInfo;
  scope: 'natal' | 'year' | 'month' | 'day';
  snapshot?: TransitSnapshot;
}): Promise<ScopedAlert[]> {
  const { userId, birth, scope, snapshot } = params;
  const all = computeAllSystems(birth);
  const alerts = analyzeAlerts({
    ziwei: all.ziwei.chart,
    bazi: all.bazi.chart,
    qizheng: all.qizheng.chart,
    birthYear: birth.year,
    scope,
    snapshot,
  });

  for (const a of alerts) {
    await prisma.alert.upsert({
      where: { userId_alertHash: { userId, alertHash: a.id } },
      update: {}, // keep isRead/isDismissed/emailSent on re-detection
      create: {
        userId,
        alertHash: a.id,
        alertType: a.type,
        severity: a.severity,
        title: a.title,
        description: a.description,
        palace: a.palace,
        starsJson: a.stars,
        period: a.period,
        scope: a.scope,
        system: a.system,
        recommendations: a.recommendations,
      },
    });
  }
  return alerts;
}
