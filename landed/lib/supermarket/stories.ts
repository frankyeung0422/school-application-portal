import { prisma } from "../prisma";
import { getFlag, setFlag } from "../settings";
import { OPW_RETAILERS } from "./retailers";
import { detectShrinkflation, type Shrinkflation } from "./history";
import { productHistory, rowsFromOffers } from "./view";
import { familyKey, packTraps, promoTruth, type PackRow, type PackTrap, type PromoTruth } from "./promo-truth";
import { CORE_CHAINS, chooseIndexBasket, hkWeekStart, weeklyIndex, type IndexWeek, type PricePoint } from "./basket-index";

// Services behind the two public data pages (/price-index, /shrinkflation).
// Both are the same data every visitor sees and change at most once per feed
// sync, so results are memoised for a while instead of recomputed per view.

const TTL_MS = 30 * 60_000;
const memo = new Map<string, { at: number; value: unknown }>();
// Keyed on the last feed sync as well as time: the web and the worker are separate
// processes, so a sync in either must retire both processes' cached pages.
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const k = `${key}@${await getFlag("opw.lastSyncAt", "")}`;
  const hit = memo.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await fn();
  memo.set(k, { at: Date.now(), value });
  return value;
}

const BASKET_FLAG = "index.basket";

/** The fixed basket, chosen once from what every core chain sells, then pinned. */
export async function indexBasket(): Promise<number[]> {
  const pinned = JSON.parse(await getFlag(BASKET_FLAG, "[]")) as number[];
  if (Array.isArray(pinned) && pinned.length) return pinned;
  const offers = await prisma.offer.findMany({
    where: { inStock: true, platform: { in: [...CORE_CHAINS] }, product: { segment: "SUPERMARKET" } },
    select: { productId: true, platform: true, product: { select: { category: true } } },
  });
  const byProduct = new Map<number, { productId: number; category: string | null; chains: string[] }>();
  for (const o of offers) {
    if (o.productId == null) continue;
    const c = byProduct.get(o.productId) ?? { productId: o.productId, category: o.product?.category ?? null, chains: [] };
    c.chains.push(o.platform);
    byProduct.set(o.productId, c);
  }
  const basket = chooseIndexBasket([...byProduct.values()]);
  if (basket.length) await setFlag(BASKET_FLAG, JSON.stringify(basket));
  return basket;
}

export interface PriceIndexView {
  basket: { id: number; slug: string; title: string; category: string | null }[];
  weeks: IndexWeek[];
  since: string | null;
}

export async function priceIndex(weeksBack = 12): Promise<PriceIndexView> {
  return cached(`index:${weeksBack}`, async () => {
    const ids = await indexBasket();
    const since = new Date(Date.now() - weeksBack * 7 * 86400_000);
    const [products, snaps] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, title: true, category: true }, orderBy: { category: "asc" } }),
      prisma.offerSnapshot.findMany({
        where: { capturedAt: { gte: since }, offer: { productId: { in: ids }, platform: { in: [...CORE_CHAINS] } } },
        select: { capturedAt: true, price: true, landedHkdCents: true, offer: { select: { productId: true, platform: true } } },
      }),
    ]);
    const points: PricePoint[] = snaps.map((s) => ({
      productId: s.offer.productId!,
      chain: s.offer.platform,
      week: hkWeekStart(s.capturedAt),
      cents: s.landedHkdCents ?? Math.round(s.price * 100),
    }));
    const first = snaps.reduce<Date | null>((m, s) => (!m || s.capturedAt < m ? s.capturedAt : m), null);
    return { basket: products, weeks: weeklyIndex(ids, points), since: first ? first.toISOString().slice(0, 10) : null };
  });
}

export interface ShrinkRow extends Shrinkflation {
  productId: number;
  slug: string;
  title: string;
}

export interface ShrinkflationView {
  rows: ShrinkRow[];
  /** Products whose pack size we track, i.e. could have been caught. */
  watched: number;
  historyDays: number;
}

/** Every supermarket product whose pack got smaller without getting cheaper per unit. */
export async function shrinkflationList(): Promise<ShrinkflationView> {
  return cached("shrink", async () => {
    // Only products whose recorded pack size has ever changed can have shrunk; check just those.
    const changed = await prisma.$queryRawUnsafe<{ productId: number }[]>(
      `SELECT o.productId AS productId
         FROM OfferSnapshot s JOIN Offer o ON o.id = s.offerId
        WHERE s.unitSizeLabel IS NOT NULL AND o.platform IN (${OPW_RETAILERS.map(() => "?").join(",")})
        GROUP BY o.productId HAVING COUNT(DISTINCT s.unitSizeLabel) > 1`,
      ...OPW_RETAILERS,
    );
    const [watched, span] = await Promise.all([
      prisma.product.count({ where: { segment: "SUPERMARKET", unitSize: { not: null } } }),
      prisma.offerSnapshot.aggregate({ where: { unitSizeLabel: { not: null } }, _min: { capturedAt: true } }),
    ]);
    const rows: ShrinkRow[] = [];
    for (const { productId } of changed) {
      const s = detectShrinkflation(await productHistory(Number(productId), 365));
      if (!s) continue;
      const p = await prisma.product.findUnique({ where: { id: Number(productId) }, select: { slug: true, title: true } });
      if (p) rows.push({ ...s, productId: Number(productId), slug: p.slug, title: p.title });
    }
    rows.sort((a, b) => b.changedOn.localeCompare(a.changedOn) || b.perUnitRise - a.perUnitRise);
    const first = span._min.capturedAt;
    return { rows, watched, historyDays: first ? Math.floor((Date.now() - first.getTime()) / 86400_000) : 0 };
  });
}

export interface TruthRow {
  productId: number;
  slug: string;
  title: string;
  chain: string;
  promo: string;
  shelfCents: number;
  truth: PromoTruth;
}

export interface PromoTruthView {
  fake: TruthRow[];
  weak: TruthRow[];
  real: TruthRow[];
  traps: PackTrap[];
  promosChecked: number;
  /** productId → the pack trap it is the dearer "big" side of. */
  trapByProduct: Map<number, PackTrap>;
}

/** Every live supermarket promotion judged against buying singles, plus bigger-pack traps. */
export async function promoTruthView(): Promise<PromoTruthView> {
  return cached("truth", async () => {
    const products = await prisma.product.findMany({
      where: { segment: "SUPERMARKET" },
      select: { id: true, slug: true, title: true, titleEn: true, brand: true, offers: true },
    });
    const fake: TruthRow[] = [];
    const weak: TruthRow[] = [];
    const real: TruthRow[] = [];
    const packRows: PackRow[] = [];
    for (const p of products) {
      const family = familyKey(p.brand, p.titleEn ?? p.title);
      for (const r of rowsFromOffers(p.offers, p.titleEn)) {
        if (!r.inStock) continue;
        const promo = r.promoZh ?? r.promoEn;
        const truth = promo ? promoTruth(r.verdict) : null;
        if (promo && truth) {
          const row = { productId: p.id, slug: p.slug, title: p.title, chain: r.retailer, promo, shelfCents: r.shelfCents, truth };
          (truth.label === "FAKE" ? fake : truth.label === "WEAK" ? weak : real).push(row);
        }
        if (family && r.unit) {
          packRows.push({ productId: p.id, title: p.title, slug: p.slug, chain: r.retailer, family, dim: r.unit.dim, totalUnits: r.unit.totalUnits, unitCents: r.unit.cents, shelfCents: r.shelfCents });
        }
      }
    }
    real.sort((a, b) => b.truth.pctOff - a.truth.pctOff);
    fake.sort((a, b) => a.truth.pctOff - b.truth.pctOff);
    weak.sort((a, b) => a.truth.pctOff - b.truth.pctOff);
    const traps = packTraps(packRows);
    const trapByProduct = new Map<number, PackTrap>();
    for (const t of traps) if (!trapByProduct.has(t.big.productId)) trapByProduct.set(t.big.productId, t);
    return { fake, weak, real, traps, promosChecked: fake.length + weak.length + real.length, trapByProduct };
  });
}
