// Affiliate travel partners: a second, labelled way to search the SAME trip on a
// booking site that pays commission. Pure; tests/travel-partners.test.ts.
//
// Deliberately NOT a replacement for the quote's own link: the prices on the
// page came from Google, and sending a click on "HK$1,240 on Cathay" to a
// different site's search would imply a price we never saw there. So each
// partner is its own button, per search, saying "compare on …".

import { placeByCode } from "./places";
import type { TravelParams } from "./types";

export type TravelPartner = "TRIPCOM" | "AGODA";
export const TRAVEL_PARTNERS: TravelPartner[] = ["TRIPCOM", "AGODA"];

export const PARTNER_LABEL: Record<TravelPartner, string> = {
  TRIPCOM: "Trip.com",
  AGODA: "Agoda",
};

export interface PartnerEnv {
  TRIPCOM_ALLIANCE_ID?: string;
  TRIPCOM_SID?: string;
  AGODA_CID?: string;
}

export function isTravelPartner(v: unknown): v is TravelPartner {
  return typeof v === "string" && (TRAVEL_PARTNERS as string[]).includes(v);
}

/** Partners that have an id configured and can take this kind of search. */
export function partnersFor(kind: TravelParams["kind"], env: PartnerEnv): TravelPartner[] {
  const out: TravelPartner[] = [];
  if (kind === "FLIGHT" && env.TRIPCOM_ALLIANCE_ID && env.TRIPCOM_SID) out.push("TRIPCOM");
  if (kind === "HOTEL" && env.AGODA_CID) out.push("AGODA");
  if (kind === "HOTEL" && env.TRIPCOM_ALLIANCE_ID && env.TRIPCOM_SID) out.push("TRIPCOM");
  return out;
}

/** The partner's own search page for these parameters, carrying our affiliate id; null if not configured. */
export function partnerSearchUrl(partner: TravelPartner, params: TravelParams, env: PartnerEnv): string | null {
  if (!partnersFor(params.kind, env).includes(partner)) return null;
  if (partner === "TRIPCOM") {
    const alliance = { Allianceid: env.TRIPCOM_ALLIANCE_ID!, SID: env.TRIPCOM_SID!, locale: "zh-HK", curr: "HKD" };
    if (params.kind === "FLIGHT") {
      const u = new URL("https://hk.trip.com/flights/showfarefirst");
      u.search = new URLSearchParams({
        dcity: params.from.toLowerCase(),
        acity: params.to.toLowerCase(),
        ddate: params.depart,
        ...(params.return ? { rdate: params.return, triptype: "rt" } : { triptype: "ow" }),
        class: params.cabin === "BUSINESS" || params.cabin === "FIRST" ? "cf" : "y",
        quantity: String(params.adults),
        ...alliance,
      }).toString();
      return u.toString();
    }
    const u = new URL("https://hk.trip.com/hotels/list");
    u.search = new URLSearchParams({
      keyword: placeName(params.place),
      checkin: params.checkIn,
      checkout: params.checkOut,
      adult: String(params.adults),
      ...alliance,
    }).toString();
    return u.toString();
  }
  if (params.kind !== "HOTEL") return null;
  const u = new URL("https://www.agoda.com/partners/partnersearch.aspx");
  u.search = new URLSearchParams({
    pcs: "1",
    cid: env.AGODA_CID!,
    hl: "zh-hk",
    currency: "HKD",
    textToSearch: placeName(params.place),
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.adults),
    rooms: "1",
  }).toString();
  return u.toString();
}

function placeName(place: string): string {
  return placeByCode(place)?.name ?? place;
}

export function partnerEnv(): PartnerEnv {
  return {
    TRIPCOM_ALLIANCE_ID: process.env.TRIPCOM_ALLIANCE_ID,
    TRIPCOM_SID: process.env.TRIPCOM_SID,
    AGODA_CID: process.env.AGODA_CID,
  };
}
