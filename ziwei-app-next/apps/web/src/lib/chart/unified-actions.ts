'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { computeAllSystems, type BirthInfo } from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { syncPeriodAlerts } from '@/lib/chart/period-fortune';
import { flushAlertEmails } from '@/lib/alerts/notify';

const birthSchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
  hour: z.coerce.number().int().min(0).max(23),
  minute: z.coerce.number().int().min(0).max(59).default(0),
  gender: z.enum(['M', 'F']),
  calendar: z.enum(['solar', 'lunar']).default('solar'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL || '';
  return !url.includes('placeholder');
}

function parseBirth(formData: FormData) {
  const lat = formData.get('latitude');
  const lon = formData.get('longitude');
  return birthSchema.safeParse({
    year: formData.get('year'),
    month: formData.get('month'),
    day: formData.get('day'),
    hour: formData.get('hour'),
    minute: formData.get('minute') ?? 0,
    gender: formData.get('gender'),
    calendar: formData.get('calendar') ?? 'solar',
    latitude: lat === null || lat === '' ? undefined : lat,
    longitude: lon === null || lon === '' ? undefined : lon,
  });
}

function birthParams(birth: BirthInfo): URLSearchParams {
  const q = new URLSearchParams({
    y: String(birth.year), m: String(birth.month), d: String(birth.day),
    hr: String(birth.hour), mi: String(birth.minute),
    g: birth.gender, c: birth.calendar,
  });
  if (birth.latitude !== undefined) q.set('lat', String(birth.latitude));
  if (birth.longitude !== undefined) q.set('lon', String(birth.longitude));
  return q;
}

/**
 * Find-or-create the Subject + three Chart rows for a birth. Dedupes via the
 * ziwei chart's (userId, chartHash) — repeated computes/saves of the same
 * birth reuse the existing subject instead of stacking duplicates.
 */
async function persistUnifiedReading(
  userId: string,
  birth: BirthInfo,
  all: ReturnType<typeof computeAllSystems>,
  label: string | null,
): Promise<string> {
  const existing = await prisma.chart.findUnique({
    where: { userId_chartHash: { userId, chartHash: all.ziwei.hash } },
    select: { subjectId: true },
  });
  let subjectId = existing?.subjectId ?? null;
  if (!subjectId) {
    const subject = await prisma.subject.create({
      data: { userId, label, birthInfo: birth as unknown as object },
    });
    subjectId = subject.id;
  } else if (label) {
    await prisma.subject.update({ where: { id: subjectId }, data: { label } }).catch(() => {});
  }

  const systems = [all.ziwei, all.bazi, all.qizheng] as const;
  await Promise.all(
    systems.map((s) =>
      prisma.chart.upsert({
        where: { userId_chartHash: { userId, chartHash: s.hash } },
        update: { subjectId, chartJson: s.chart as unknown as object, engineVersion: s.chart.engineVersion },
        create: {
          userId,
          subjectId,
          label,
          birthInfo: birth as unknown as object,
          chartHash: s.hash,
          chartJson: s.chart as unknown as object,
          engineVersion: s.chart.engineVersion,
        },
      }),
    ),
  );
  return subjectId;
}

/**
 * Server action from /reading. Computes all three systems at once, warms the
 * caches (best-effort), and forwards birth data via URL so /reading/result can
 * recompute even without a DB (Path A). Logged-in users get their reading
 * AUTO-SAVED to the account (and land on the saved subject page) — computing
 * and then losing the result was the #1 "where did my chart go" complaint.
 */
export async function calculateUnifiedAction(formData: FormData) {
  const parsed = parseBirth(formData);
  if (!parsed.success) redirect('/reading?error=invalid');

  const birth = parsed.data as BirthInfo;
  const all = computeAllSystems(birth);

  // Auto-save for logged-in users → straight to the saved reading.
  const session = await getSession();
  if (session && dbAvailable()) {
    try {
      const subjectId = await persistUnifiedReading(session.sub, birth, all, null);
      redirect(`/reading/${subjectId}`);
    } catch (err) {
      // redirect() throws NEXT_REDIRECT — never swallow it.
      if ((err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw err;
      console.warn('[unified/calculate] auto-save failed, falling back to teaser:', (err as Error).message);
    }
  }

  if (dbAvailable()) {
    try {
      await Promise.all([
        // update also refreshes chartJson so engine upgrades propagate to cached rows
        prisma.chartCache.upsert({
          where: { chartHash: all.ziwei.hash },
          update: { hitCount: { increment: 1 }, lastAccessed: new Date(), chartJson: all.ziwei.chart as unknown as object, engineVersion: all.ziwei.chart.engineVersion },
          create: { chartHash: all.ziwei.hash, chartJson: all.ziwei.chart as unknown as object, engineVersion: all.ziwei.chart.engineVersion },
        }),
        prisma.chartCache.upsert({
          where: { chartHash: all.bazi.hash },
          update: { hitCount: { increment: 1 }, lastAccessed: new Date(), chartJson: all.bazi.chart as unknown as object, engineVersion: all.bazi.chart.engineVersion },
          create: { chartHash: all.bazi.hash, chartJson: all.bazi.chart as unknown as object, engineVersion: all.bazi.chart.engineVersion },
        }),
        prisma.qizhengCache.upsert({
          where: { qizhengHash: all.qizheng.hash },
          update: { hitCount: { increment: 1 }, lastAccessed: new Date(), chartJson: all.qizheng.chart as unknown as object, engineVersion: all.qizheng.chart.engineVersion },
          create: { qizhengHash: all.qizheng.hash, chartJson: all.qizheng.chart as unknown as object, engineVersion: all.qizheng.chart.engineVersion },
        }),
      ]);
    } catch (err) {
      console.warn('[unified/actions] cache warm skipped:', (err as Error).message);
    }
  }

  redirect(`/reading/result?${birthParams(birth).toString()}`);
}

/**
 * Persist a unified reading: one Subject grouping three Charts (紫微/八字/果老),
 * all linked by subjectId. Charts are upserted on (userId, chartHash) so a
 * previously-saved single-system chart is adopted into the subject instead of
 * colliding with the unique constraint.
 */
export async function saveUnifiedReadingAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login?next=/reading');

  const parsed = parseBirth(formData);
  if (!parsed.success) redirect('/reading?error=invalid');

  const birth = parsed.data as BirthInfo;
  const label = (formData.get('label') as string | null)?.trim() || null;
  const all = computeAllSystems(birth);

  if (!dbAvailable()) redirect(`/reading/result?${birthParams(birth).toString()}`);

  const userId = session.sub;
  let subjectId: string | null = null;
  try {
    subjectId = await persistUnifiedReading(userId, birth, all, label);
  } catch (err) {
    console.warn('[unified/save] failed:', (err as Error).message);
    redirect(`/reading/result?${birthParams(birth).toString()}&save_error=1`);
  }

  // Immediate natal alert detection + high-severity email (best-effort, never
  // blocks the redirect). Period alerts are handled by the cron sweep.
  try {
    await syncPeriodAlerts({ userId, birth, scope: 'natal' });
    await flushAlertEmails(userId);
  } catch (err) {
    console.warn('[unified/save] alert detection skipped:', (err as Error).message);
  }

  redirect(`/reading/${subjectId}`);
}
