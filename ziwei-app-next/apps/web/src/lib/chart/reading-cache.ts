import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';

/**
 * Persistent cache for one-off AI readings (合參 synthesis, 紫微/八字/果老
 * detail readings). Rows live in the Fortune table under scope='reading';
 * `cacheKey` must fold in the engine version so charts recomputed by a newer
 * engine get fresh text, e.g. `synthesis@0.6.0` or `bazi-<chartId>@0.4.0`.
 *
 * Before this, every visit to a saved reading re-ran the LLM (30-60s wait +
 * token cost) — saved readings should read instantly.
 */
export async function getOrCreateReading(opts: {
  userId: string;
  subjectId?: string | null;
  cacheKey: string;
  promptId: string;
  vars: Record<string, unknown>;
}): Promise<{ text: string; model: string; cached: boolean }> {
  const { userId, subjectId = null, cacheKey, promptId, vars } = opts;
  const scope = 'reading';

  try {
    const existing = await prisma.fortune.findFirst({
      where: { userId, scope, periodKey: cacheKey, subjectId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return { text: existing.body, model: existing.model, cached: true };
  } catch {
    // cache read is best-effort — fall through to generation
  }

  const res = await generate({ promptId, userId, vars });

  try {
    await prisma.fortune.create({
      data: {
        userId,
        subjectId,
        scope,
        periodKey: cacheKey,
        body: res.text,
        promptId,
        model: res.model,
      },
    });
  } catch (err) {
    console.warn('[reading-cache] persist skipped:', (err as Error).message);
  }
  return { text: res.text, model: res.model, cached: false };
}
