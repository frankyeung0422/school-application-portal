// 到手價 basket index: one fixed household basket, priced at each supermarket
// chain every week. Pure; tests/basket-index.test.ts.
//
// Fair by construction: the basket is only items every core chain sells, and a
// chain's week counts only if it priced EVERY item that week — a chain never
// looks cheap because it was missing the expensive things.

/** Grocery chains broad enough to price a household basket (not pharmacies). */
export const CORE_CHAINS = ["PARKNSHOP", "WELLCOME", "JASONS", "AEON"] as const;

export const BASKET_SIZE = 30;
export const MAX_PER_CATEGORY = 3;

export interface BasketCandidate {
  productId: number;
  category: string | null;
  /** Chains currently listing it in stock. */
  chains: string[];
}

/** Items every core chain sells, spread across categories; stable order so the basket does not drift week to week. */
export function chooseIndexBasket(
  candidates: BasketCandidate[],
  core: readonly string[] = CORE_CHAINS,
  size = BASKET_SIZE,
  perCategory = MAX_PER_CATEGORY,
): number[] {
  const everywhere = candidates
    .filter((c) => core.every((ch) => c.chains.includes(ch)))
    .sort((a, b) => b.chains.length - a.chains.length || a.productId - b.productId);
  const perCat = new Map<string, number>();
  const picked: number[] = [];
  for (const c of everywhere) {
    const cat = c.category ?? "其他";
    if ((perCat.get(cat) ?? 0) >= perCategory) continue;
    perCat.set(cat, (perCat.get(cat) ?? 0) + 1);
    picked.push(c.productId);
    if (picked.length >= size) break;
  }
  return picked.sort((a, b) => a - b);
}

export interface PricePoint {
  productId: number;
  chain: string;
  /** Monday of the HK week, YYYY-MM-DD. */
  week: string;
  cents: number;
}

export interface ChainWeek {
  chain: string;
  /** Null unless the chain priced every basket item that week. */
  totalCents: number | null;
  priced: number;
}

export interface IndexWeek {
  week: string;
  chains: ChainWeek[];
  /** Cheapest complete chain that week. */
  cheapest: string | null;
  /** Spread between the dearest and cheapest complete chain. */
  spreadCents: number | null;
}

/** Monday (HK time) of the week containing `d`, as YYYY-MM-DD. */
export function hkWeekStart(d: Date): string {
  const hk = new Date(d.getTime() + 8 * 3600_000);
  const dow = (hk.getUTCDay() + 6) % 7; // Mon=0
  hk.setUTCDate(hk.getUTCDate() - dow);
  return hk.toISOString().slice(0, 10);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Weekly totals per chain. Each item's price for a week is the median of that
 * chain's daily prices in it (a one-day glitch cannot move the index).
 */
export function weeklyIndex(basket: number[], points: PricePoint[], chains: readonly string[] = CORE_CHAINS): IndexWeek[] {
  const inBasket = new Set(basket);
  const grouped = new Map<string, number[]>(); // week|chain|product → daily cents
  const weeks = new Set<string>();
  for (const p of points) {
    if (!inBasket.has(p.productId) || !chains.includes(p.chain) || p.cents <= 0) continue;
    weeks.add(p.week);
    const k = `${p.week}|${p.chain}|${p.productId}`;
    const arr = grouped.get(k) ?? [];
    arr.push(p.cents);
    grouped.set(k, arr);
  }
  return [...weeks].sort().map((week) => {
    const rows: ChainWeek[] = chains.map((chain) => {
      let total = 0;
      let priced = 0;
      for (const id of basket) {
        const daily = grouped.get(`${week}|${chain}|${id}`);
        if (!daily) continue;
        total += median(daily);
        priced++;
      }
      return { chain, priced, totalCents: priced === basket.length && basket.length > 0 ? total : null };
    });
    const complete = rows.filter((r) => r.totalCents != null) as (ChainWeek & { totalCents: number })[];
    const sorted = [...complete].sort((a, b) => a.totalCents - b.totalCents || a.chain.localeCompare(b.chain));
    return {
      week,
      chains: rows,
      cheapest: sorted[0]?.chain ?? null,
      spreadCents: sorted.length >= 2 ? sorted[sorted.length - 1].totalCents - sorted[0].totalCents : null,
    };
  });
}

/** Week-over-week change of one chain's total, as a fraction; null when either week is incomplete. */
export function weekChange(weeks: IndexWeek[], chain: string): number | null {
  if (weeks.length < 2) return null;
  const [prev, last] = weeks.slice(-2).map((w) => w.chains.find((c) => c.chain === chain)?.totalCents ?? null);
  if (prev == null || last == null || prev === 0) return null;
  return (last - prev) / prev;
}
