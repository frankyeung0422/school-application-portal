// Turn discovered product titles (bestseller/trending pages) into scan
// keywords for the SEARCH_CRAWL pipeline. Heuristic-first: works with no
// Gemini key; refineKeywordsWithGemini is an optional upgrade.

import { normalizeTitle } from "../match/blocking";
import { generateJson } from "../gemini";
import type { DiscoveredCandidate } from "../sources/types";

const MAX_TOKENS = 6;
const MAX_CHARS = 40;

// Marketing/filler words that carry no search signal on their own.
const EN_STOPWORDS = new Set([
  "the", "a", "an", "for", "with", "and", "or", "of", "to", "in", "on",
  "new", "hot", "sale", "deal", "deals", "free", "shipping", "official",
  "original", "genuine", "authentic", "pack", "pcs", "set", "lot",
]);

/** Ordered tokens in title order; mixed CJK/latin/digit runs stay together
 *  ("小米手环9" must not split — CN platforms search it as one term). */
function orderedTokens(title: string): string[] {
  const norm = normalizeTitle(title);
  return norm.match(/[\p{Script=Han}a-z0-9][\p{Script=Han}a-z0-9-]*/gu) ?? [];
}

const isModelToken = (t: string) => t.length >= 4 && /\d/.test(t);

/**
 * Distill one title into a search keyword, or null when the title is too
 * generic to search. Keeps leading tokens (brand + product words) up to and
 * including the first model token; caps length so platform search boxes and
 * the Listing.keyword blocking key stay sane.
 */
export function distillKeyword(title: string): string | null {
  const tokens = orderedTokens(title).filter((t) => !EN_STOPWORDS.has(t));
  if (tokens.length === 0) return null;

  const modelIdx = tokens.findIndex(isModelToken);
  const cut = modelIdx >= 0 ? Math.min(modelIdx + 1, MAX_TOKENS) : MAX_TOKENS;
  const kept: string[] = [];
  let chars = 0;
  for (const t of tokens.slice(0, cut)) {
    if (chars + t.length > MAX_CHARS && kept.length > 0) break;
    kept.push(t);
    chars += t.length + 1;
  }

  const keyword = kept.join(" ").trim();
  // Too generic: a lone short latin word ("earbuds") matches everything.
  const cjk = /\p{Script=Han}/u.test(keyword);
  if (!cjk && kept.length < 2) return null;
  if (keyword.length < 3) return null;
  return keyword;
}

/** Distill + dedupe (on normalized form) + cap. */
export function distillKeywords(
  titles: string[],
  opts?: { max?: number },
): string[] {
  const max = opts?.max ?? 5;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const title of titles) {
    const kw = distillKeyword(title);
    if (!kw) continue;
    const key = normalizeTitle(kw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Gemini refinement: distill candidate titles into bilingual (EN + 中文)
 * search keywords so CN buy-side platforms search well. Throws when the key
 * is missing or the API fails — callers fall back to distillKeywords.
 */
export async function refineKeywordsWithGemini(
  candidates: Pick<DiscoveredCandidate, "title">[],
  max: number,
): Promise<string[]> {
  const titles = candidates.map((c) => `- ${c.title}`).join("\n");
  const prompt = `You pick resale-arbitrage research keywords. Below are product titles scraped from bestseller/deal pages on US marketplaces.

Select up to ${max} distinct products worth cross-platform price comparison (branded, identifiable models; skip generic accessories). For each, output ONE search keyword usable on both US (Amazon/eBay) and Chinese (1688/淘宝/京东) platforms: brand + model in English, followed by the common Chinese product name if one exists, e.g. "Xiaomi Smart Band 9 小米手环9". Max 40 characters each.

Titles:
${titles}`;
  const { value } = await generateJson<string[]>(prompt, {
    type: "array",
    items: { type: "string" },
    maxItems: max,
  });
  const cleaned = value
    .map((k) => k.trim())
    .filter((k) => k.length >= 3 && k.length <= 60);
  if (cleaned.length === 0) throw new Error("Gemini returned no usable keywords");
  return cleaned.slice(0, max);
}
