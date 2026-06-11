import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeQizhengChart, qizhengHash, type BirthInfo } from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const birthSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).default(0),
  gender: z.enum(['M', 'F']),
  calendar: z.enum(['solar', 'lunar']).default('solar'),
  // 果老 needs a birthplace for the ascendant (命度); defaults to Hong Kong in the engine.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = birthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const birth = parsed.data as BirthInfo;
  const hash = qizhengHash(birth);

  // Cache lookup — charts are deterministic; same birth + place = same chart.
  const cached = await prisma.qizhengCache.findUnique({ where: { qizhengHash: hash } });
  if (cached) {
    await prisma.qizhengCache.update({
      where: { qizhengHash: hash },
      data: { hitCount: { increment: 1 }, lastAccessed: new Date() },
    });
    return NextResponse.json({ chart: cached.chartJson, cached: true });
  }

  const chart = computeQizhengChart(birth);
  await prisma.qizhengCache.create({
    data: { qizhengHash: hash, chartJson: chart as unknown as object, engineVersion: chart.engineVersion },
  });

  return NextResponse.json({ chart, cached: false });
}
