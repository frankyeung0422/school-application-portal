import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import type { Chart, PlacedStar } from '@ziwei/engine';

export const runtime = 'nodejs';

const schema = z.object({
  chartHash: z.string(),
});

/**
 * Free-tier reading — generates just the 命宮 palace interpretation.
 * Heavily cached by chart hash (same birth always returns same reading).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'chartHash required' }, { status: 400 });

  const cached = await prisma.chartCache.findUnique({ where: { chartHash: parsed.data.chartHash } });
  if (!cached) return NextResponse.json({ error: 'chart not found' }, { status: 404 });

  const chart = cached.chartJson as unknown as Chart;
  const mingong = chart.palaces.find((p) => p.isMingong);
  if (!mingong) return NextResponse.json({ error: 'no 命宮' }, { status: 500 });

  const mainStars = (mingong.stars as PlacedStar[]).map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? `化${s.transformation}` : ''}`).join('、') || '空宮';

  const result = await generate({
    promptId: 'free-mingong',
    vars: {
      mingongBranch: mingong.branch,
      mingongGanzhi: mingong.ganzhi,
      mainStars,
      bureau: chart.bureau.bureau,
      yearGanzhi: chart.yearGanzhi,
      gender: chart.birthInfo.gender === 'M' ? '男' : '女',
    },
  });

  return NextResponse.json({
    reading: result.text,
    model: result.model,
    cached: false,
  });
}
