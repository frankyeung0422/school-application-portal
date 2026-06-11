'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { computeChart, chartHash, ENGINE_VERSION, type BirthInfo } from '@ziwei/engine';
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
});

/**
 * Detects "no real DB" mode (Path A bootstrap) — when DATABASE_URL is the
 * placeholder, all Prisma calls fail. We compute the chart in-memory and
 * pass birth data through the URL instead of relying on the cache table.
 */
function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL || '';
  return !url.includes('placeholder');
}

/**
 * Server Action invoked from the /sample form. Validates input, computes
 * chart, optionally persists to chart_cache (Path B), redirects to
 * /sample/result. Survives Path A (placeholder DB) by skipping persistence.
 */
export async function calculateSampleChartAction(formData: FormData) {
  const raw = {
    year: formData.get('year'),
    month: formData.get('month'),
    day: formData.get('day'),
    hour: formData.get('hour'),
    minute: formData.get('minute') ?? 0,
    gender: formData.get('gender'),
    calendar: formData.get('calendar') ?? 'solar',
  };
  const parsed = birthSchema.safeParse(raw);
  if (!parsed.success) {
    redirect('/sample?error=invalid');
  }

  const birth = parsed.data as BirthInfo;
  const hash = chartHash(birth);

  // Best-effort cache write — silently skip when DB isn't available.
  if (dbAvailable()) {
    try {
      const cached = await prisma.chartCache.findUnique({ where: { chartHash: hash } });
      if (!cached) {
        const chart = computeChart(birth);
        await prisma.chartCache.create({
          data: { chartHash: hash, chartJson: chart as unknown as object, engineVersion: chart.engineVersion },
        });
      } else {
        // Refresh stale rows so engine upgrades (e.g. minor stars, 大限) propagate.
        const fresh = cached.engineVersion !== ENGINE_VERSION ? computeChart(birth) : null;
        await prisma.chartCache.update({
          where: { chartHash: hash },
          data: {
            hitCount: { increment: 1 },
            lastAccessed: new Date(),
            ...(fresh ? { chartJson: fresh as unknown as object, engineVersion: fresh.engineVersion } : {}),
          },
        });
      }
    } catch (err) {
      console.warn('[chart/actions] chart_cache write skipped:', (err as Error).message);
    }
  }

  // Always pass birth data in URL so /sample/result can recompute on the
  // server side even without a DB row.
  const q = new URLSearchParams({
    h: hash,
    y: String(birth.year),
    m: String(birth.month),
    d: String(birth.day),
    hr: String(birth.hour),
    mi: String(birth.minute),
    g: birth.gender,
    c: birth.calendar,
  });
  redirect(`/sample/result?${q.toString()}`);
}

/**
 * Persist the ziwei chart to the logged-in user's collection. Called from
 * /sample/result's save form.
 */
export async function saveZiweiChartAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login?next=/sample/result');

  const raw = {
    year: formData.get('year'),
    month: formData.get('month'),
    day: formData.get('day'),
    hour: formData.get('hour'),
    minute: formData.get('minute') ?? 0,
    gender: formData.get('gender'),
    calendar: formData.get('calendar') ?? 'solar',
  };
  const parsed = birthSchema.safeParse(raw);
  if (!parsed.success) redirect('/sample?error=invalid');

  const birth = parsed.data as BirthInfo;
  const hash = chartHash(birth);
  const chart = computeChart(birth);
  const label = (formData.get('label') as string | null)?.trim() || null;

  if (!dbAvailable()) redirect('/sample/result?h=' + hash);

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
    console.warn('[ziwei/save] failed:', (err as Error).message);
    redirect('/sample/result?h=' + hash + '&save_error=1');
  }
  redirect(`/chart/${targetId}`);
}
