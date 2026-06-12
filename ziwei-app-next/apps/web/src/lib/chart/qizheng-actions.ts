'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { computeQizhengChart, qizhengHash, QIZHENG_ENGINE_VERSION, type BirthInfo } from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';

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

/**
 * Server action from /qizheng/sample. Caches the chart (果老 needs lat/long, so
 * the hash includes birthplace) and passes birth data via URL so the result page
 * can recompute even when no DB is available (Path A).
 */
export async function calculateSampleQizhengAction(formData: FormData) {
  const parsed = parseBirth(formData);
  if (!parsed.success) redirect('/qizheng/sample?error=invalid');

  const birth = parsed.data as BirthInfo;
  const hash = qizhengHash(birth);

  if (dbAvailable()) {
    try {
      const cached = await prisma.qizhengCache.findUnique({ where: { qizhengHash: hash } });
      if (!cached) {
        const chart = computeQizhengChart(birth);
        await prisma.qizhengCache.create({
          data: { qizhengHash: hash, chartJson: chart as unknown as object, engineVersion: chart.engineVersion },
        });
      } else {
        // Refresh stale rows so engine upgrades propagate.
        const fresh = cached.engineVersion !== QIZHENG_ENGINE_VERSION ? computeQizhengChart(birth) : null;
        await prisma.qizhengCache.update({
          where: { qizhengHash: hash },
          data: {
            hitCount: { increment: 1 },
            lastAccessed: new Date(),
            ...(fresh ? { chartJson: fresh as unknown as object, engineVersion: fresh.engineVersion } : {}),
          },
        });
      }
    } catch (err) {
      console.warn('[qizheng/actions] qizheng_cache write skipped:', (err as Error).message);
    }

    // Auto-save for logged-in users — computed charts should appear in the
    // dashboard without requiring the explicit 儲存 click.
    try {
      const session = await getSession();
      if (session) {
        const chart = computeQizhengChart(birth);
        await prisma.chart.upsert({
          where: { userId_chartHash: { userId: session.sub, chartHash: hash } },
          update: { chartJson: chart as unknown as object, engineVersion: chart.engineVersion },
          create: {
            userId: session.sub,
            birthInfo: birth as unknown as object,
            chartHash: hash,
            chartJson: chart as unknown as object,
            engineVersion: chart.engineVersion,
          },
        });
      }
    } catch (err) {
      console.warn('[qizheng/actions] auto-save skipped:', (err as Error).message);
    }
  }

  const q = new URLSearchParams({
    h: hash,
    y: String(birth.year), m: String(birth.month), d: String(birth.day),
    hr: String(birth.hour), mi: String(birth.minute),
    g: birth.gender, c: birth.calendar,
  });
  if (birth.latitude !== undefined) q.set('lat', String(birth.latitude));
  if (birth.longitude !== undefined) q.set('lon', String(birth.longitude));
  redirect(`/qizheng/sample/result?${q.toString()}`);
}

/** Save the current 果老 chart to the user's collection (reuses the Chart model; hash prefix `q_` keeps it distinct from ziwei/bazi). */
export async function saveQizhengChartAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login?next=/qizheng/sample/result');

  const parsed = parseBirth(formData);
  if (!parsed.success) redirect('/qizheng/sample?error=invalid');

  const birth = parsed.data as BirthInfo;
  const hash = qizhengHash(birth);
  const chart = computeQizhengChart(birth);
  const label = (formData.get('label') as string | null)?.trim() || null;

  if (!dbAvailable()) redirect('/qizheng/sample/result?h=' + hash);

  let targetId: string | null = null;
  try {
    const existing = await prisma.chart.findFirst({ where: { userId: session.sub, chartHash: hash } });
    if (existing) {
      targetId = existing.id;
    } else {
      const created = await prisma.chart.create({
        data: {
          userId: session.sub,
          label,
          birthInfo: birth as unknown as object,
          chartHash: hash,
          chartJson: chart as unknown as object,
          engineVersion: chart.engineVersion,
        },
      });
      targetId = created.id;
    }
  } catch (err) {
    console.warn('[qizheng/save] failed:', (err as Error).message);
    redirect('/qizheng/sample/result?h=' + hash + '&save_error=1');
  }
  redirect(`/qizheng/${targetId}`);
}
