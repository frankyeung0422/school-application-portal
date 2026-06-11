import Anthropic from '@anthropic-ai/sdk';
import type { NormalizedPost, QCScores } from './types';

/**
 * QC agent — scores a draft post before publishing.
 * Posts averaging < 7 are queued for human review (admin /content-queue).
 *
 * Implementation lands in P5; this is the contract.
 */
export async function scorePost(
  draft: NormalizedPost,
  apiKey: string,
): Promise<QCScores> {
  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `
You are the content QC agent for 紫微閣 (Ziwei Pavilion). Score the draft on 7 dimensions, 0-10 each.
Be strict — the brand cannot afford bland or pushy posts. Output VALID JSON only, no prose.

Dimensions:
- accuracy: factual correctness about ziwei/bazi claims
- brandFit: matches premium-mystical voice (midnight + gold; scholarly + warm)
- urgency: drives feel-need-to-act-now (time-bounded hook, stakes established)
- conversionHook: ends with clear paywalled CTA pointing back to product
- factualClaimRisk: avoids unfalsifiable health/legal/financial promises (10 = safe)
- religiousSensitivity: respectful, no other-faith mockery (10 = safe)
- aiTellRisk: free of "as an AI", em-dashes, "please note", lecture tone (10 = safe)

JSON shape:
{"accuracy":N,"brandFit":N,"urgency":N,"conversionHook":N,"factualClaimRisk":N,"religiousSensitivity":N,"aiTellRisk":N,"notes":["..."]}
  `.trim();

  const userPrompt = `
Draft post:
HEADLINE: ${draft.headline}
BODY: ${draft.body}
CTA: ${draft.cta}
HASHTAGS: ${draft.hashtags.join(' ')}
  `.trim();

  const resp = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 600,
    temperature: 0.1,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = resp.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('');

  const json = JSON.parse(text);
  const dims = [
    json.accuracy,
    json.brandFit,
    json.urgency,
    json.conversionHook,
    json.factualClaimRisk,
    json.religiousSensitivity,
    json.aiTellRisk,
  ];
  const overall = dims.reduce((a, b) => a + b, 0) / dims.length;

  return {
    ...json,
    overall,
  } as QCScores;
}
