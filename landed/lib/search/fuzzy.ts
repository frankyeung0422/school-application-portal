// Forgiving product search: word order, Traditional/Simplified, typos, plurals,
// synonyms and Chinese↔English all still find the product. Pure — no DB;
// tests/fuzzy.test.ts.
//
// A query is split into *terms*. Each term earns credit 0..1 against a title;
// coverage (the share of terms found) dominates the score, so "band 9 xiaomi"
// finds "Xiaomi Smart Band 9" but "xiaomi band 9" does not rank "Band 8" as a
// match — a missing number the title contradicts is penalised, not ignored.

import * as OpenCCt2cn from "opencc-js/t2cn";
import * as OpenCCcn2t from "opencc-js/cn2t";
import { jaccard, normalizeTitle, tokenize } from "../match/blocking";
import { CN_TO_LATIN } from "../match/translit";
import { CJK_SYNONYMS, canonicalLatin, synonymsOf } from "./synonyms";

const toSimplified = OpenCCt2cn.Converter({ from: "hk", to: "cn" });
const toTraditional = OpenCCcn2t.Converter({ from: "cn", to: "hk" });

/** Below this a row is not a match. Tuned in tests: ~2 of 3 terms found. */
export const FUZZY_MIN = 0.5;

const STOPWORDS = new Set(["the", "a", "an", "for", "with", "and", "of", "in", "on", "to", "new", "的"]);

/** NFKC + lowercase + Traditional→Simplified + punctuation/marketing words stripped. */
export function foldText(s: string): string {
  return normalizeTitle(toSimplified(s.normalize("NFKC").toLowerCase()));
}

/** The query as typed, in Simplified and in Traditional — every form a DB title might use. */
export function scriptVariants(s: string): string[] {
  const t = s.normalize("NFKC").trim();
  return [...new Set([t, toSimplified(t), toTraditional(t)])];
}

function stem(w: string): string {
  if (!/^[a-z]{5,}$/.test(w)) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** Latin words, also split at hyphens and letter/digit seams: "wh-1000xm5" → wh 1000 xm 5. */
function latinParts(folded: string): string[] {
  const out: string[] = [];
  for (const w of folded.match(/[a-z0-9][a-z0-9-]*/g) ?? []) {
    for (const part of w.split("-")) out.push(...(part.match(/[a-z]+|[0-9]+/g) ?? []));
  }
  return out;
}

// ── Chinese → latin concepts ────────────────────────────────────────────────

interface Bridge {
  /** One list per recognised Chinese term: any member present in a title satisfies it. */
  groups: string[][];
  /** Share of the run's characters those terms account for (0..1). */
  covered: number;
}

function bridgeRun(run: string): Bridge {
  const groups: string[][] = [];
  const hit = new Array(run.length).fill(false);
  const mark = (key: string) => {
    for (let i = run.indexOf(key); i !== -1; i = run.indexOf(key, i + 1)) {
      for (let j = i; j < i + key.length; j++) hit[j] = true;
    }
  };
  for (const key in CN_TO_LATIN) {
    if (!run.includes(key)) continue;
    const words = CN_TO_LATIN[key];
    groups.push([...new Set(words.flatMap((w) => [w, canonicalLatin(w)]))]);
    mark(key);
  }
  for (const [cjk, canon] of CJK_SYNONYMS) {
    if (!run.includes(cjk)) continue;
    groups.push([canon, ...synonymsOf(canon).filter((w) => /^[a-z]/.test(w))]);
    mark(cjk);
  }
  return { groups, covered: run.length ? hit.filter(Boolean).length / run.length : 0 };
}

// ── Titles ──────────────────────────────────────────────────────────────────

export interface TitleIndex {
  folded: string;
  /** Latin words, their stems, and latin concepts implied by the Chinese text. */
  words: Set<string>;
  numbers: Set<string>;
  bigrams: Set<string>;
  modelTokens: Set<string>;
}

const INDEX_CACHE = new Map<string, TitleIndex>();

export function indexTitle(title: string): TitleIndex {
  const cached = INDEX_CACHE.get(title);
  if (cached) return cached;
  const folded = foldText(title);
  const words = new Set<string>();
  const numbers = new Set<string>();
  for (const p of latinParts(folded)) {
    words.add(p);
    words.add(stem(p));
    if (/^\d+$/.test(p)) numbers.add(p);
  }
  for (const run of folded.match(/\p{Script=Han}+/gu) ?? []) {
    for (const g of bridgeRun(run).groups) for (const w of g) words.add(w);
  }
  const tok = tokenize(folded);
  const idx: TitleIndex = { folded, words, numbers, bigrams: tok.bigrams, modelTokens: tok.modelTokens };
  if (INDEX_CACHE.size > 20_000) INDEX_CACHE.clear();
  INDEX_CACHE.set(title, idx);
  return idx;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export type QueryTerm =
  | { kind: "latin"; word: string; numeric: boolean }
  | { kind: "han"; run: string; bigrams: string[]; bridge: Bridge };

export interface ParsedQuery {
  folded: string;
  terms: QueryTerm[];
  bigrams: Set<string>;
  modelTokens: Set<string>;
}

export function parseQuery(q: string): ParsedQuery {
  const folded = foldText(q);
  const terms: QueryTerm[] = [];
  const seen = new Set<string>();
  for (const run of folded.match(/\p{Script=Han}+/gu) ?? []) {
    if (STOPWORDS.has(run) || seen.has(run)) continue;
    seen.add(run);
    const bigrams: string[] = [];
    for (let i = 0; i < run.length - 1; i++) bigrams.push(run.slice(i, i + 2));
    terms.push({ kind: "han", run, bigrams: bigrams.length ? bigrams : [run], bridge: bridgeRun(run) });
  }
  for (const p of latinParts(folded)) {
    const word = stem(p);
    if (STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    terms.push({ kind: "latin", word, numeric: /^\d+$/.test(word) });
  }
  const tok = tokenize(folded);
  return { folded, terms, bigrams: tok.bigrams, modelTokens: tok.modelTokens };
}

/** Optimal-string-alignment (Damerau-Levenshtein) distance, giving up above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Typos allowed for a word of this length: none under 5 letters (ipad≠ipod, band≠hand), 1 up to 8, 2 beyond. */
export const typoBudget = (len: number) => (len < 5 ? 0 : len < 9 ? 1 : 2);

function latinCredit(word: string, numeric: boolean, idx: TitleIndex): number {
  if (idx.words.has(word)) return 1;
  if (numeric) return 0; // "9" is never "8" — numbers must match exactly
  for (const alt of synonymsOf(word)) {
    if (/^[a-z]/.test(alt) ? idx.words.has(alt) : idx.folded.includes(alt)) return 0.95;
  }
  const budget = typoBudget(word.length);
  for (const w of idx.words) {
    if (/^\d/.test(w)) continue;
    if (w.length >= 3 && word === `${w}s`) return 0.95; // short plural: "bags" → bag
    // Half-typed ("sams" → samsung) or one slip away ("xiaomy" → xiaomi).
    if (word.length >= 4 && w.length > word.length && w.startsWith(word)) return 0.8;
    if (budget && editDistance(word, w, budget) <= budget) return 0.8;
  }
  return 0;
}

function hanCredit(term: Extract<QueryTerm, { kind: "han" }>, idx: TitleIndex): number {
  if (idx.folded.includes(term.run)) return 1;
  const direct = term.bigrams.filter((b) => idx.bigrams.has(b) || idx.folded.includes(b)).length / term.bigrams.length;
  // Chinese query, English title: 小米手环 → {xiaomi} + {band}
  const { groups, covered } = term.bridge;
  const bridged = groups.length
    ? (groups.filter((g) => g.some((w) => idx.words.has(w))).length / groups.length) * covered * 0.9
    : 0;
  return Math.max(direct, bridged);
}

export interface FuzzyMatch {
  score: number;
  /** Every term found verbatim (no typo/synonym/translation needed). */
  exact: boolean;
}

export function scoreTitle(query: ParsedQuery, title: string): FuzzyMatch {
  if (!query.terms.length) return { score: 0, exact: false };
  const idx = indexTitle(title);
  let sum = 0;
  let allExact = true;
  let numberConflict = false;
  for (const t of query.terms) {
    const c = t.kind === "latin" ? latinCredit(t.word, t.numeric, idx) : hanCredit(t, idx);
    sum += c;
    if (c < 1) allExact = false;
    // The title names a *different* number: "band 9" vs "Band 8" is another product.
    if (t.kind === "latin" && t.numeric && c === 0 && idx.numbers.size) numberConflict = true;
  }
  const coverage = sum / query.terms.length;
  let modelBonus = 0;
  for (const m of query.modelTokens) if (idx.modelTokens.has(m)) modelBonus = 1;
  let score = 0.8 * coverage + 0.1 * jaccard(query.bigrams, idx.bigrams) + 0.1 * modelBonus;
  if (numberConflict) score *= 0.6;
  return { score: Math.min(1, score), exact: allExact };
}

/** Convenience for one-off checks. */
export function fuzzyScore(q: string, title: string): number {
  return scoreTitle(parseQuery(q), title).score;
}

export interface Ranked<T> extends FuzzyMatch {
  row: T;
}

/** Rows that match `q`, best first. `text` gives everything searchable about a row. */
export function rankFuzzy<T>(q: string, rows: T[], text: (row: T) => string, opts: { min?: number } = {}): Ranked<T>[] {
  const query = parseQuery(q);
  const min = opts.min ?? FUZZY_MIN;
  return rows
    .map((row) => ({ row, ...scoreTitle(query, text(row)) }))
    .filter((r) => r.score >= min)
    .sort((a, b) => b.score - a.score);
}

// ── SQL candidate needles, suggestions, signatures ──────────────────────────

/**
 * Substrings worth a `contains` probe so the DB returns a candidate set the
 * scorer can rank: each word (and its stem/synonyms), each Chinese run and its
 * pairs, in Simplified and Traditional. Numbers and 1–2 letter words are too
 * broad to probe on their own.
 */
export function candidateNeedles(q: string, limit = 40): string[] {
  const query = parseQuery(q);
  const out = new Set<string>();
  for (const t of query.terms) {
    if (t.kind === "latin") {
      if (t.numeric || t.word.length < 3) continue;
      out.add(t.word);
      // A typo'd word still shares its first letters with the right one.
      if (t.word.length >= 5) out.add(t.word.slice(0, 4));
      for (const s of synonymsOf(t.word)) for (const v of scriptVariants(s)) out.add(v);
    } else {
      for (const v of scriptVariants(t.run)) out.add(v);
      for (const b of t.bigrams) for (const v of scriptVariants(b)) out.add(v);
      for (const g of t.bridge.groups) for (const w of g) out.add(w);
    }
  }
  return [...out].filter((n) => n.length >= 2).slice(0, limit);
}

/** Word → how many titles use it; the vocabulary didYouMean corrects towards. */
export function vocabulary(titles: Iterable<string>): Map<string, number> {
  const vocab = new Map<string, number>();
  for (const t of titles) {
    for (const p of new Set(latinParts(foldText(t)))) {
      if (p.length >= 3 && !/^\d+$/.test(p)) vocab.set(p, (vocab.get(p) ?? 0) + 1);
    }
  }
  return vocab;
}

/** "xiaomy band" → "xiaomi band" when the catalogue knows "xiaomi". Null when nothing to fix. */
export function didYouMean(q: string, vocab: Map<string, number>): string | null {
  const parts = foldText(q).split(" ");
  let changed = false;
  const fixed = parts.map((w) => {
    if (!/^[a-z]+$/.test(w) || vocab.has(w) || vocab.has(stem(w))) return w;
    const budget = typoBudget(w.length);
    if (!budget) return w;
    let best: { word: string; d: number; n: number } | null = null;
    for (const [v, n] of vocab) {
      const d = editDistance(w, v, budget);
      if (d <= budget && (!best || d < best.d || (d === best.d && n > best.n))) best = { word: v, d, n };
    }
    if (!best) return w;
    changed = true;
    return best.word;
  });
  return changed ? fixed.join(" ") : null;
}

/**
 * Order-, script- and synonym-independent key for a query, so "band 9 xiaomi",
 * "Xiaomi Band 9" and "小米手環9" are recognised as one search (one crawl).
 */
export function querySignature(q: string): string {
  const keys = new Set<string>();
  for (const t of parseQuery(q).terms) {
    if (t.kind === "latin") keys.add(canonicalLatin(t.word));
    else if (t.bridge.covered === 1) for (const g of t.bridge.groups) keys.add(canonicalLatin(g[0]));
    else keys.add(t.run);
  }
  return [...keys].sort().join(" ").slice(0, 200);
}
