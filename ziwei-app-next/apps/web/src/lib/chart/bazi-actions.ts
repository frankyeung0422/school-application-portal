'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { computeBazi, baziHash, BAZI_ENGINE_VERSION, type BirthInfo } from '@ziwei/engine';
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

function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL || '';
  return !url.includes('placeholder');
}

/**
 * Server action invoked from /bazi/sample. Mirrors calculateSampleChartAction
 * but for bazi. Survives Path A (no DB) by passing birth data via URL params
 * so the result page can recompute.
 */
export async function calculateSampleBaziAction(formData: FormData) {
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
  if (!parsed.success) redirect('/bazi/sample?error=invalid');

  const birth = parsed.data as BirthInfo;
  const hash = baziHash(birth);

  if (dbAvailable()) {
    try {
      const cached = await prisma.chartCache.findUnique({ where: { chartHash: hash } });
      if (!cached) {
        const chart = computeBazi(birth);
        await prisma.chartCache.create({
          data: { chartHash: hash, chartJson: chart as unknown as object, engineVersion: chart.engineVersion },
        });
      } else {
        // Refresh stale rows so engine upgrades propagate.
        const fresh = cached.engineVersion !== BAZI_ENGINE_VERSION ? computeBazi(birth) : null;
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
      console.warn('[bazi/actions] chart_cache write skipped:', (err as Error).message);
    }

    // Auto-save for logged-in users — computed charts should appear in the
    // dashboard without requiring the explicit 儲存 click.
    try {
      const session = await getSession();
      if (session) {
        const chart = computeBazi(birth);
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
      console.warn('[bazi/actions] auto-save skipped:', (err as Error).message);
    }
  }

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
  redirect(`/bazi/sample/result?${q.toString()}`);
}

/**
 * Save the current bazi chart to the user's collection. Called from the
 * sample result page when a logged-in user clicks "save".
 */
export async function saveBaziChartAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login?next=/bazi/sample/result');

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
  if (!parsed.success) redirect('/bazi/sample?error=invalid');

  const birth = parsed.data as BirthInfo;
  const hash = baziHash(birth);
  const chart = computeBazi(birth);
  const label = (formData.get('label') as string | null)?.trim() || null;

  if (!dbAvailable()) redirect('/bazi/sample/result?h=' + hash);

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
    console.warn('[bazi/save] failed:', (err as Error).message);
    redirect('/bazi/sample/result?h=' + hash + '&save_error=1');
  }
  redirect(`/bazi/${targetId}`);
}
