// Reading a price out of a brand's product page. Pure; tests/official.test.ts.
//
// Luxury sites are heavy JS apps, but nearly all of them ship a schema.org
// Product block for search engines — that is a far more stable contract than
// any CSS selector, so it is the only thing we read.

export interface ExtractedPrice {
  priceNative: number;
  currency: string;
}

interface LdOffer {
  price?: unknown;
  priceCurrency?: unknown;
  offers?: unknown;
}

function fromOffer(o: LdOffer): ExtractedPrice | null {
  const price = Number(String(o?.price ?? "").replace(/[^\d.]/g, ""));
  const currency = typeof o?.priceCurrency === "string" ? o.priceCurrency : "";
  if (!Number.isFinite(price) || price <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  return { priceNative: price, currency };
}

/** Walk any JSON-LD shape (arrays, @graph, nested offers) for the first real offer. */
export function extractFromJsonLd(blocks: string[]): ExtractedPrice | null {
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    const queue: unknown[] = [parsed];
    while (queue.length) {
      const node = queue.shift();
      if (Array.isArray(node)) {
        queue.push(...node);
        continue;
      }
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const direct = fromOffer(obj as LdOffer);
      if (direct) return direct;
      for (const key of ["offers", "@graph", "itemListElement", "item", "hasVariant", "mainEntity"]) {
        if (obj[key]) queue.push(obj[key]);
      }
    }
  }
  return null;
}

/** Sanity band per currency — a "price" of 3 or 99,999,999 is a parse error. */
const BANDS: Record<string, [number, number]> = {
  HKD: [200, 50_000_000],
  JPY: [3_000, 900_000_000],
  GBP: [20, 5_000_000],
  USD: [25, 6_000_000],
  SGD: [30, 8_000_000],
  EUR: [20, 5_000_000],
};

export function isPlausibleOfficialPrice(p: ExtractedPrice): boolean {
  const band = BANDS[p.currency];
  if (!band) return false;
  return p.priceNative >= band[0] && p.priceNative <= band[1];
}
