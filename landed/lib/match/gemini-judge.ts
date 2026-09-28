import { generateJson } from "../gemini";
import { jaccard, sharesModelToken, tokenize } from "./blocking";
import {
  incompatibleReason,
  parsePackQty,
  parseUnitSize,
} from "./attributes";
import { getImageForGemini } from "./image-cache";
import type { Verdict } from "../types";

/** The fields the judge reads — satisfied by a Prisma Offer row. */
export interface Listing {
  platform: string;
  title: string;
  latestPrice: number;
  currency: string;
  shopName?: string | null;
  moq?: number | null;
  packQty?: number | null;
  isAccessory?: boolean | null;
  attributes?: string | null;
  imageUrl?: string | null;
}

export interface JudgeResult {
  verdict: Verdict;
  confidence: number;
  variantNote: string | null;
  reason: string | null;
  model: string;
}

interface GeminiVerdict {
  sameProduct: boolean;
  confidence: number;
  variantDifference: string | null;
  reason: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sameProduct: { type: "boolean" },
    confidence: { type: "number" },
    variantDifference: { type: "string", nullable: true },
    reason: { type: "string" },
  },
  required: ["sameProduct", "confidence", "reason"],
};

const SAME_THRESHOLD = 0.75;
const UNSURE_THRESHOLD = 0.5;

function describeListing(l: Listing, label: string): string {
  const parts = [
    `${label}:`,
    `platform=${l.platform}`,
    `title="${l.title}"`,
    `price=${l.latestPrice} ${l.currency}`,
  ];
  if (l.shopName) parts.push(`shop="${l.shopName}"`);
  if (l.moq) parts.push(`MOQ=${l.moq} (wholesale listing)`);
  const packQty = l.packQty ?? parsePackQty(l.title);
  if (packQty) parts.push(`packQty=${packQty} units per listing`);
  const size = parseUnitSize(l.title);
  if (size) parts.push(`size=${size.label}`);
  if (l.attributes) parts.push(`attributes=${l.attributes}`);
  return parts.join(" ");
}

/**
 * Deterministic heuristic judge — used when MATCH_JUDGE=heuristic or in
 * fixture mode, so e2e runs need no API key and stay reproducible.
 *
 * Confidence is capped at 0.70: a title-only verdict must never outrank a
 * Gemini verdict that actually compared the two product photos.
 */
export function heuristicJudge(a: Listing, b: Listing): JudgeResult {
  const blocker = incompatibleReason(
    { title: a.title, packQty: a.packQty, isAccessory: a.isAccessory ?? undefined },
    { title: b.title, packQty: b.packQty, isAccessory: b.isAccessory ?? undefined },
  );
  if (blocker) {
    return {
      verdict: "DIFFERENT",
      confidence: 0.9,
      variantNote: null,
      reason: blocker,
      model: "heuristic",
    };
  }

  const ta = tokenize(a.title);
  const tb = tokenize(b.title);
  const jac = jaccard(ta.bigrams, tb.bigrams);
  const model = sharesModelToken(ta, tb);
  if (model || jac >= 0.45) {
    return {
      verdict: "SAME",
      confidence: model ? 0.7 : 0.65,
      variantNote: null,
      reason: model
        ? "shared model-number token"
        : `high title similarity (jaccard=${jac.toFixed(2)})`,
      model: "heuristic",
    };
  }
  if (jac >= 0.25) {
    return {
      verdict: "UNSURE",
      confidence: 0.6,
      variantNote: null,
      reason: `moderate title similarity (jaccard=${jac.toFixed(2)})`,
      model: "heuristic",
    };
  }
  return {
    verdict: "DIFFERENT",
    confidence: 0.8,
    variantNote: null,
    reason: `low title similarity (jaccard=${jac.toFixed(2)})`,
    model: "heuristic",
  };
}

export async function judgePair(a: Listing, b: Listing): Promise<JudgeResult> {
  if (
    process.env.MATCH_JUDGE === "heuristic" ||
    process.env.ADAPTER_MODE === "fixture" ||
    // No key configured: degrade to the deterministic judge instead of failing
    // every MATCH job. The heuristic now enforces the same hard rejects and
    // caps its own confidence, so this is honest rather than merely tolerable.
    !process.env.GEMINI_API_KEY
  ) {
    return heuristicJudge(a, b);
  }

  // Deterministic rejects never reach the API — same rules as the prefilter, so
  // a pair that slipped through (e.g. via a cached listing) still cannot become
  // an opportunity, and we do not pay to be told what we already know.
  const blocker = incompatibleReason(
    { title: a.title, packQty: a.packQty, isAccessory: a.isAccessory ?? undefined },
    { title: b.title, packQty: b.packQty, isAccessory: b.isAccessory ?? undefined },
  );
  if (blocker) {
    return {
      verdict: "DIFFERENT",
      confidence: 0.9,
      variantNote: null,
      reason: blocker,
      model: "rule",
    };
  }

  const [imgA, imgB] = await Promise.all([
    getImageForGemini(a.imageUrl),
    getImageForGemini(b.imageUrl),
  ]);
  const images = [imgA, imgB].filter((x) => x !== null);

  const prompt = [
    "You compare two e-commerce listings from different platforms and decide whether they sell the SAME sellable product (same brand, model, and spec).",
    "Rules:",
    "- Different color or size of the identical model = SAME, but set variantDifference (e.g. \"color only\").",
    "- A bundle/multi-pack vs a single unit = NOT the same, even if the per-unit price matches.",
    "- An accessory or replacement part (lid, straw, case, strap, charger) for a product vs the product itself = NOT the same. This is the most common mistake — check for it first.",
    "- A different capacity/size of the same line (32oz vs 24oz) = NOT the same.",
    "- A wholesale lot listing of the identical item = SAME (it has an MOQ).",
    imgA && imgB
      ? "Two product images are attached, in the same order as the listings."
      : images.length === 1
        ? "Only one product image is available; weigh titles more and lower your confidence."
        : "No product images available; judge from titles/attributes only and lower your confidence.",
    "",
    describeListing(a, "Listing A"),
    describeListing(b, "Listing B"),
    "",
    'Respond with JSON: {"sameProduct": boolean, "confidence": 0..1, "variantDifference": string|null, "reason": string}',
  ].join("\n");

  const { value, model } = await generateJson<GeminiVerdict>(
    prompt,
    RESPONSE_SCHEMA,
    images as { mimeType: string; data: string }[],
  );

  const confidence = Math.max(0, Math.min(1, value.confidence));
  let verdict: Verdict;
  if (value.sameProduct && confidence >= SAME_THRESHOLD) verdict = "SAME";
  else if (value.sameProduct && confidence >= UNSURE_THRESHOLD) verdict = "UNSURE";
  else verdict = "DIFFERENT";

  return {
    verdict,
    confidence,
    variantNote: value.variantDifference ?? null,
    reason: value.reason ?? null,
    model,
  };
}
