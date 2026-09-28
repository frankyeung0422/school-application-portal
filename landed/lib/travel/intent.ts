// "東京機票" / "cheap flights to bangkok" / "大阪酒店" typed into product search
// should offer the travel search instead of crawling marketplaces for it.
// Pure; tests/travel.test.ts.

import { foldText } from "../search/fuzzy";
import { resolvePlace, type Place } from "./places";
import type { TravelKind } from "./types";

// Folded (Simplified, lowercase) forms.
const FLIGHT_WORDS = ["机票", "飞机", "航班", "来回", "单程", "flights", "flight", "airfare", "air ticket", "plane ticket", "fly to"];
const HOTEL_WORDS = ["酒店", "住宿", "旅馆", "民宿", "hotels", "hotel", "hostel", "accommodation", "resort"];
const FILLER = ["平", "便宜", "特价", "去", "往", "飞", "cheap", "cheapest", "to", "in", "from", "hong kong", "hk", "香港"];

export interface TravelIntent {
  kind: TravelKind;
  place: Place;
}

export function detectTravelIntent(q: string): TravelIntent | null {
  let t = ` ${foldText(q)} `;
  const hasFlight = FLIGHT_WORDS.some((w) => t.includes(w));
  const hasHotel = HOTEL_WORDS.some((w) => t.includes(w));
  if (!hasFlight && !hasHotel) return null;
  for (const w of [...FLIGHT_WORDS, ...HOTEL_WORDS].sort((a, b) => b.length - a.length)) t = t.split(w).join(" ");
  for (const w of FILLER) {
    // Latin fillers only as whole words ("to" must not eat "tokyo"); Chinese anywhere.
    t = /^[a-z ]+$/.test(w) ? t.replace(new RegExp(`\\b${w}\\b`, "g"), " ") : t.split(w).join(" ");
  }
  const place = resolvePlace(t.replace(/\s+/g, " ").trim());
  if (!place || place.code === "HKG") return null;
  return { kind: hasFlight ? "FLIGHT" : "HOTEL", place };
}
