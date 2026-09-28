import { describe, expect, it } from "vitest";
import { partnerSearchUrl, partnersFor } from "../lib/travel/partners";
import type { FlightParams, HotelParams } from "../lib/travel/types";

const flight: FlightParams = { kind: "FLIGHT", from: "HKG", to: "TYO", depart: "2026-10-01", return: "2026-10-05", adults: 2, cabin: "ECONOMY" };
const hotel: HotelParams = { kind: "HOTEL", place: "TYO", checkIn: "2026-10-01", checkOut: "2026-10-05", adults: 2 };
const env = { TRIPCOM_ALLIANCE_ID: "111", TRIPCOM_SID: "222", AGODA_CID: "333" };

describe("travel partners", () => {
  it("offers nothing without partner ids (keyless = today's behaviour)", () => {
    expect(partnersFor("FLIGHT", {})).toEqual([]);
    expect(partnerSearchUrl("TRIPCOM", flight, {})).toBeNull();
  });

  it("builds a Trip.com flight search for the same trip, with our alliance id", () => {
    const u = new URL(partnerSearchUrl("TRIPCOM", flight, env)!);
    expect(u.hostname).toBe("hk.trip.com");
    expect(u.searchParams.get("dcity")).toBe("hkg");
    expect(u.searchParams.get("acity")).toBe("tyo");
    expect(u.searchParams.get("rdate")).toBe("2026-10-05");
    expect(u.searchParams.get("quantity")).toBe("2");
    expect(u.searchParams.get("Allianceid")).toBe("111");
    expect(u.searchParams.get("SID")).toBe("222");
  });

  it("one-way flights say so", () => {
    const u = new URL(partnerSearchUrl("TRIPCOM", { ...flight, return: null }, env)!);
    expect(u.searchParams.get("triptype")).toBe("ow");
    expect(u.searchParams.has("rdate")).toBe(false);
  });

  it("Agoda is hotels only, searched by city name", () => {
    expect(partnersFor("FLIGHT", { AGODA_CID: "1" })).toEqual([]);
    const u = new URL(partnerSearchUrl("AGODA", hotel, env)!);
    expect(u.searchParams.get("cid")).toBe("333");
    expect(u.searchParams.get("textToSearch")).toBe("Tokyo");
    expect(partnerSearchUrl("AGODA", flight, env)).toBeNull();
  });
});
