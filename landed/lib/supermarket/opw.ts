// Consumer Council Online Price Watch feed → normalized items. Pure;
// tests/supermarket.test.ts. The fetch lives in sync.ts.

import { isRetailer, type Retailer } from "./retailers";
import { parsePromo, type PromoRule } from "./promo";

interface Localized {
  en?: string;
  "zh-Hant"?: string;
  "zh-Hans"?: string;
}

export interface OpwRawItem {
  code: string;
  brand?: Localized;
  name?: Localized;
  cat1Name?: Localized;
  cat2Name?: Localized;
  cat3Name?: Localized;
  prices?: { supermarketCode: string; price: string }[];
  offers?: ({ supermarketCode: string } & Localized)[];
}

export interface OpwItem {
  code: string;
  titleZh: string;
  titleEn: string;
  brandZh: string | null;
  categoryZh: string;
  categoryEn: string;
  cat1Zh: string;
  cat1En: string;
  prices: { retailer: Retailer; priceCents: number }[];
  promos: { retailer: Retailer; en: string; zh: string; rules: PromoRule[] }[];
}

const zh = (l?: Localized) => (l?.["zh-Hant"] ?? l?.en ?? "").trim();
const en = (l?: Localized) => (l?.en ?? l?.["zh-Hant"] ?? "").trim();

function joinBrand(brand: string, name: string) {
  if (!brand) return name;
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
}

export function normalizeOpw(raw: unknown): { items: OpwItem[]; skipped: number; unknownRetailers: string[] } {
  if (!Array.isArray(raw)) throw new Error("Price Watch feed is not an array");
  const unknown = new Set<string>();
  let skipped = 0;
  const items: OpwItem[] = [];
  for (const r of raw as OpwRawItem[]) {
    // Some live records carry numeric codes; RegExp.test would silently coerce them.
    const code = r?.code == null ? "" : String(r.code).trim();
    if (!/^[A-Z0-9]+$/.test(code)) {
      skipped++;
      continue;
    }
    const prices: OpwItem["prices"] = [];
    for (const p of r.prices ?? []) {
      if (!isRetailer(p.supermarketCode)) {
        unknown.add(p.supermarketCode);
        continue;
      }
      const cents = Math.round(Number(p.price) * 100);
      if (!(cents > 0) || cents > 10_000_000) continue;
      prices.push({ retailer: p.supermarketCode, priceCents: cents });
    }
    if (prices.length === 0) {
      skipped++;
      continue;
    }
    const promos: OpwItem["promos"] = (r.offers ?? [])
      .filter((o): o is { supermarketCode: Retailer } & Localized => isRetailer(o.supermarketCode))
      .map((o) => ({ retailer: o.supermarketCode, en: en(o), zh: zh(o), rules: parsePromo(en(o)) }));
    const brandZh = zh(r.brand) || null;
    items.push({
      code,
      titleZh: joinBrand(zh(r.brand), zh(r.name)),
      titleEn: joinBrand(en(r.brand), en(r.name)),
      brandZh,
      categoryZh: [zh(r.cat1Name), zh(r.cat2Name), zh(r.cat3Name)].filter(Boolean).join(" › "),
      categoryEn: [en(r.cat1Name), en(r.cat2Name), en(r.cat3Name)].filter(Boolean).join(" › "),
      cat1Zh: zh(r.cat1Name),
      cat1En: en(r.cat1Name),
      prices,
      promos,
    });
  }
  return { items, skipped, unknownRetailers: [...unknown] };
}
