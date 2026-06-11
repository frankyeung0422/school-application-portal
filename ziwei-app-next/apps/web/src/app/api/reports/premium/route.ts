import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { generate, generateStream } from '@/lib/ai/client';
import { requireSession } from '@/lib/auth/session';
import type { Chart } from '@ziwei/engine';

export const runtime = 'nodejs';
export const maxDuration = 120;

const schema = z.object({
  chartHash: z.string(),
  /** When true, stream the draft narrative live for UX; polish happens server-side and is persisted separately. */
  stream: z.boolean().optional().default(true),
});

/**
 * Premium 3-pass report:
 *  1. Gemini research → structured findings (sync)
 *  2. Claude narrative → streamed 2,500-word reading
 *  3. Claude polish → applied AFTER the stream closes, persisted to DB
 *
 * UX: client sees text appearing live (narrative). After stream end, client
 * polls /api/reports/premium/[chartHash] for the polished version which
 * replaces the streaming text once ready (~10-15s additional).
 */
export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response('chartHash required', { status: 400 });

  const cached = await prisma.chartCache.findUnique({ where: { chartHash: parsed.data.chartHash } });
  if (!cached) return new Response('chart not found', { status: 404 });

  const chart = cached.chartJson as unknown as Chart;
  const age = new Date().getFullYear() - chart.birthInfo.year;
  const sharedVars = {
    chartJson: JSON.stringify(chart),
    gender: chart.birthInfo.gender === 'M' ? '男' : '女',
    age: String(age),
  };

  // Pass 1 — research (sync, ~3-5s with Gemini)
  const research = await generate({
    promptId: 'premium-research',
    vars: { chartJson: sharedVars.chartJson },
    userId: session.sub,
  });

  // Pass 2 — narrative (streamed). Capture full text via a TransformStream
  // so we can run pass 3 polish after the user has seen the live narrative.
  const narrativeStream = await generateStream({
    promptId: 'premium-narrative',
    vars: {
      ...sharedVars,
      findings: research.text,
    },
    userId: session.sub,
  });

  let captured = '';
  const tee = new TransformStream<string, string>({
    transform(chunk, controller) {
      captured += chunk;
      controller.enqueue(chunk);
    },
    async flush() {
      // Pass 3 — polish runs after the stream completes. Best-effort: log errors.
      try {
        const polish = await generate({
          promptId: 'premium-polish',
          vars: { draft: captured },
          userId: session.sub,
        });
        // Persist polished narrative on the user's Chart row (or create one).
        await persistPolished(session.sub, parsed.data.chartHash, captured, polish.text);
      } catch (err) {
        console.error('[premium-polish] failed:', (err as Error).message);
        await persistPolished(session.sub, parsed.data.chartHash, captured, null);
      }
    },
  });

  return new Response(narrativeStream.pipeThrough(tee), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function persistPolished(
  userId: string,
  chartHash: string,
  draft: string,
  polished: string | null,
): Promise<void> {
  // Stash on Event so we don't need an extra table. Future: dedicated PremiumReport model.
  await prisma.event.create({
    data: {
      userId,
      eventName: 'premium_report_generated',
      properties: {
        chartHash,
        draftLength: draft.length,
        polishedLength: polished?.length ?? 0,
        polished,
      },
    },
  });
}
