import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';
import { env, publicEnv } from '@/lib/env';
import { loadPrompt, renderPrompt } from '@/lib/ai/prompts/loader';
import { recordCost } from '@/lib/ai/cost-tracker';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({ chartHash: z.string() });

/**
 * Multimodal visual reading — premium-only feature.
 *
 * Flow:
 *   1. Render chart at /api/og/chart?h=... (1200×1200 PNG)
 *   2. Send image to Claude Opus 4.7 as a multimodal message
 *   3. Return Claude's visual interpretation (~600-900 字)
 *
 * Marketing value: differentiator vs "AI just reads JSON". The model
 * literally observes the chart and references specific positions.
 */
export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'chartHash required' }, { status: 400 });

  // Subscription gate
  const sub = await prisma.subscription.findUnique({ where: { userId: session.sub } });
  if (!sub || !['TRIALING', 'ACTIVE'].includes(sub.status)) {
    return NextResponse.json({ error: 'premium-only', upgradeUrl: '/pricing' }, { status: 403 });
  }

  const cached = await prisma.chartCache.findUnique({ where: { chartHash: parsed.data.chartHash } });
  if (!cached) return NextResponse.json({ error: 'chart not found' }, { status: 404 });

  // Fetch the chart PNG from our own OG renderer
  const chartImageUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/api/og/chart?h=${parsed.data.chartHash}`;
  const imageRes = await fetch(chartImageUrl);
  if (!imageRes.ok) {
    return NextResponse.json({ error: 'chart image render failed' }, { status: 500 });
  }
  const imageBytes = await imageRes.arrayBuffer();
  const base64 = Buffer.from(imageBytes).toString('base64');

  const prompt = loadPrompt('visual-reading');
  const system = renderPrompt(prompt.system, {});
  const user = renderPrompt(prompt.user, {});

  if (!env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 });
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const t0 = Date.now();
  try {
    const resp = await anthropic.messages.create({
      model: prompt.defaultModel,
      max_tokens: prompt.maxOutputTokens,
      temperature: prompt.temperature,
      system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
            { type: 'text', text: user },
          ],
        },
      ],
    });
    const text = resp.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
    const latencyMs = Date.now() - t0;
    await recordCost({
      userId: session.sub,
      promptId: prompt.id,
      promptVersion: prompt.version,
      model: prompt.defaultModel,
      inputTokens: resp.usage.input_tokens,
      cachedTokens: 0,
      outputTokens: resp.usage.output_tokens,
      latencyMs,
      success: true,
    });
    return NextResponse.json({ reading: text, model: prompt.defaultModel });
  } catch (err) {
    await recordCost({
      userId: session.sub,
      promptId: prompt.id,
      promptVersion: prompt.version,
      model: prompt.defaultModel,
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - t0,
      success: false,
      error: (err as Error).message,
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
