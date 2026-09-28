// Which official boutique pages we read, and how to build their URL per market.
//
// Only brands that actually publish prices are here. Chanel and Hermès do not
// publish handbag prices online at all, and Louis Vuitton / Tiffany block
// automated access — those are listed as unavailable with the reason, rather
// than quietly missing.

import type { Market } from "./markets";

export interface OfficialItem {
  brand: string;
  /** Manufacturer reference, also used to match marketplace listings. */
  reference: string;
  title: string;
  category: "WATCH" | "BAG" | "JEWELLERY" | "FRAGRANCE";
  /** Markets whose product page uses the same slug. */
  markets: Market[];
  path: (market: Market) => string;
}

const LOCALE: Record<Market, string> = { HK: "en-hk", JP: "ja-jp", GB: "en-gb", US: "en-us", SG: "en-sg" };

const rolex = (reference: string, title: string, family: string, slug: string): OfficialItem => ({
  brand: "Rolex",
  reference,
  title,
  category: "WATCH",
  markets: ["HK", "JP", "GB", "US", "SG"],
  path: (m) => `https://www.rolex.com/${LOCALE[m]}/watches/${family}/${slug}`,
});

const omega = (reference: string, title: string, slug: string): OfficialItem => ({
  brand: "Omega",
  reference,
  title,
  category: "WATCH",
  // The Japanese site uses a different slug scheme, so JP is left out rather than guessed.
  markets: ["HK", "GB", "US"],
  path: (m) => `https://www.omegawatches.com/${LOCALE[m]}/${slug}`,
});

export const OFFICIAL_CATALOGUE: OfficialItem[] = [
  rolex("126610LN", "Rolex Submariner Date 41mm Black", "submariner", "m126610ln-0001"),
  rolex("124060", "Rolex Submariner 41mm No-date", "submariner", "m124060-0001"),
  rolex("126710GRNR", "Rolex GMT-Master II Grey/Black", "gmt-master-ii", "m126710grnr-0003"),
  rolex("126334", "Rolex Datejust 41", "datejust", "m126334-0027"),
  rolex("134303", "Rolex Oyster Perpetual 36", "oyster-perpetual", "m134303-0001"),
  omega("21030422001001", "Omega Seamaster Diver 300M 42mm", "watch-omega-seamaster-diver-300m-21030422001001"),
  omega("31030425001002", "Omega Speedmaster Moonwatch Professional", "watch-omega-speedmaster-moonwatch-professional-co-axial-master-chronometer-chronograph-42-mm-31030425001002"),
];

/** Brands people search for whose prices simply are not published or reachable. */
export const OFFICIAL_UNAVAILABLE: { brand: string; reason: string }[] = [
  { brand: "Chanel", reason: "官方網站唔公開手袋價格 — Chanel does not publish handbag prices online." },
  { brand: "Hermes", reason: "官方網站唔公開熱門手袋價格 — Hermès does not publish prices for its sought-after bags." },
  { brand: "Louis Vuitton", reason: "官網封鎖自動讀取（403）— louisvuitton.com blocks automated access." },
  { brand: "Tiffany", reason: "官網封鎖自動讀取（401）— tiffany.com blocks automated access." },
  { brand: "Cartier", reason: "官網搜尋需登入／封鎖 — cartier.com blocks automated search." },
  { brand: "Tudor", reason: "官網唔刊登零售價 — tudorwatch.com does not publish retail prices." },
];

/** Reference tokens found in a marketplace title, e.g. "…Submariner 126610LN 41mm". */
export function referencesIn(title: string): string[] {
  const t = title.toUpperCase().replace(/[^A-Z0-9]/g, " ");
  return OFFICIAL_CATALOGUE.map((i) => i.reference).filter((ref) => new RegExp(`(^| )${ref}( |$)`).test(t));
}
