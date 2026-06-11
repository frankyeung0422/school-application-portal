import 'server-only';
import { prisma } from '@/lib/db/prisma';

/**
 * Pricing (USD per 1M tokens) — update as providers change.
 * Source: anthropic.com/pricing, ai.google.dev/pricing as of 2026-05.
 */
const PRICING: Record<string, { input: number; cached: number; output: number }> = {
  'claude-opus-4-7':   { input: 15.0, cached: 1.5,  output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0,  cached: 0.3,  output: 15.0 },
  'claude-haiku-4-5':  { input: 1.0,  cached: 0.1,  output: 5.0  },
  'gemini-2.5-pro':    { input: 2.5,  cached: 0.625, output: 10.0 },
  'gemini-2.5-flash':  { input: 0.15, cached: 0.0375, output: 0.6 },
  'gpt-4o':            { input: 2.5,  cached: 1.25, output: 10.0 },
  'gpt-4o-mini':       { input: 0.15, cached: 0.075, output: 0.6 },
  'gpt-4.1':           { input: 2.0,  cached: 0.5,  output: 8.0  },
  'gpt-4.1-mini':      { input: 0.4,  cached: 0.1,  output: 1.6  },
  'o1-mini':           { input: 3.0,  cached: 1.5,  output: 12.0 },
};

export function computeCost(
  model: string,
  inputTokens: number,
  cachedTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model];
  if (!p) return 0;
  const freshInput = Math.max(0, inputTokens - cachedTokens);
  return (
    (freshInput * p.input + cachedTokens * p.cached + outputTokens * p.output) / 1_000_000
  );
}

export async function recordCost(params: {
  userId?: string | null;
  promptId: string;
  promptVersion: string;
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}) {
  const usdCost = computeCost(params.model, params.inputTokens, params.cachedTokens, params.outputTokens);
  // Best-effort — observability must never kill an AI response.
  try {
    await prisma.costLedgerEntry.create({
      data: {
        userId: params.userId ?? null,
        promptId: params.promptId,
        promptVersion: params.promptVersion,
        model: params.model,
        inputTokens: params.inputTokens,
        cachedTokens: params.cachedTokens,
        outputTokens: params.outputTokens,
        usdCost,
        latencyMs: params.latencyMs,
        success: params.success,
        error: params.error ?? null,
      },
    });
  } catch (err) {
    console.warn('[cost-tracker] ledger write skipped:', (err as Error).message);
  }
  return usdCost;
}
