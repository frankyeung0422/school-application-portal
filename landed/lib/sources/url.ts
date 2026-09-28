// Turning a pasted product link into something we can price. Pure;
// tests/paste.test.ts.
//
// Shopping starts in an Instagram ad or a WhatsApp group, not in our search
// box. A pasted link names the exact product, which is far better evidence than
// a keyword — so we read the platform's own item id out of the URL and fetch
// that listing directly.

import { isPlatform, type Platform } from "../types";

export interface ParsedProductUrl {
  platform: Platform;
  itemId: string;
  /** Cleaned URL (tracking parameters removed). */
  url: string;
}

interface Rule {
  host: RegExp;
  platform: Platform;
  extract: (u: URL) => string | null;
}

const path = (u: URL, re: RegExp) => u.pathname.match(re)?.[1] ?? null;

const RULES: Rule[] = [
  {
    host: /(^|\.)amazon\.(com|ca|cn|de|es|fr|in|it|nl|pl|se|sg|ae|sa|co\.uk|co\.jp|com\.au|com\.mx|com\.br|com\.tr|com\.be)$/,
    platform: "AMAZON",
    // /dp/ASIN, /gp/product/ASIN, /-/en/dp/ASIN
    extract: (u) => path(u, /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i),
  },
  {
    host: /(^|\.)ebay\.(com|ca|de|es|fr|it|nl|pl|ch|at|ie|ph|co\.uk|com\.au|com\.hk|com\.sg|com\.my)$/,
    platform: "EBAY",
    extract: (u) => path(u, /\/itm\/(?:[^/]+\/)?(\d{9,15})/),
  },
  {
    host: /(^|\.)aliexpress\.(com|us)$/,
    platform: "ALIEXPRESS",
    extract: (u) => path(u, /\/item\/(?:[^/]*?)(\d{6,20})\.html/),
  },
  {
    host: /(^|\.)alibaba\.com$/,
    platform: "ALIBABA",
    extract: (u) => path(u, /\/product-detail\/[^/]*?(\d{6,20})\.html/) ?? path(u, /_(\d{6,20})\.html/),
  },
  {
    host: /(^|\.)(taobao|tmall)\.com$/,
    platform: "TAOBAO",
    extract: (u) => u.searchParams.get("id"),
  },
  {
    host: /(^|\.)jd\.com$/,
    platform: "JD",
    extract: (u) => path(u, /\/(\d{6,20})\.html/),
  },
  {
    host: /(^|\.)1688\.com$/,
    platform: "ALI1688",
    extract: (u) => path(u, /\/offer\/(\d{6,20})\.html/),
  },
];

/** Tracking junk that makes the same product look like a different URL. */
const STRIP_PARAMS = /^(utm_|spm|scm|sourceType|ref_?$|ref_|psc|th|tag|aff|algo|pvid|gatewayAdapt|_trksid|_trkparms|hash|mkevt|mkcid|mkrid|campid|toolid|customid|srsltid)/i;

export function parseProductUrl(input: string): ParsedProductUrl | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const rule = RULES.find((r) => r.host.test(u.hostname));
  if (!rule) return null;
  const itemId = rule.extract(u);
  if (!itemId || !/^[A-Za-z0-9]{6,20}$/.test(itemId)) return null;
  if (!isPlatform(rule.platform)) return null;

  const clean = new URL(u.origin + u.pathname);
  for (const [k, v] of u.searchParams) if (!STRIP_PARAMS.test(k)) clean.searchParams.set(k, v);
  return { platform: rule.platform, itemId, url: clean.toString() };
}

/** Platforms whose listings we can only read after a one-time QR login. */
export const LOGIN_REQUIRED: readonly Platform[] = ["TAOBAO", "ALI1688", "JD", "PDD"];

export function needsLogin(platform: Platform): boolean {
  return LOGIN_REQUIRED.includes(platform);
}
