import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { PLATFORMS } from "../lib/types";

// Idempotent defaults. `-- --demo` also builds a keyless demo catalogue from
// the fixture adapters so every page has something real to render.
//
// Cost figures are deliberately conservative public ballparks (Sept 2026) —
// edit them on /admin/settings with your own forwarder and rail quotes.

const SOURCES = [
  { platform: "ALIEXPRESS", country: "CN", currency: "USD", shipToHkHkd: 15, freeShipOverNative: 10, affiliateCommissionPct: 0.03 },
  { platform: "AMAZON", country: "US", currency: "USD", shipToHkHkd: 110, freeShipOverNative: 49, affiliateCommissionPct: 0.03, assumedWeightKg: 0.8 },
  { platform: "EBAY", country: "US", currency: "USD", shipToHkHkd: 120, affiliateCommissionPct: 0.02, assumedWeightKg: 0.8 },
  { platform: "ALIBABA", country: "CN", currency: "USD", shipToHkHkd: 150 },
  // Taobao official consolidation: free to HK pickup points / lockers since 2025-08
  // (no minimum). Weight cap and door surcharge are ballparks — edit on /admin/settings.
  { platform: "TAOBAO", country: "CN", currency: "CNY", domesticShipNative: 8, viaForwarder: true, forwarderPerKgHkd: 18, forwarderMinHkd: 18, officialFreeToPickup: true, officialFreeMaxKg: 3, homeDeliverySurchargeHkd: 20 },
  { platform: "ALI1688", country: "CN", currency: "CNY", domesticShipNative: 10, viaForwarder: true, forwarderPerKgHkd: 18, forwarderMinHkd: 18 },
  { platform: "JD", country: "CN", currency: "CNY", domesticShipNative: 0, viaForwarder: true, forwarderPerKgHkd: 18, forwarderMinHkd: 18 },
  { platform: "PDD", country: "CN", currency: "CNY", domesticShipNative: 5, viaForwarder: true, forwarderPerKgHkd: 18, forwarderMinHkd: 18 },
];

const RAILS = [
  { name: "CARD_HK", label: "HK card (FX markup ≈1.95%)", bps: 195, minFeeHkdCents: 0 },
  { name: "AIRWALLEX", label: "Airwallex (≈0.6% — confirm your plan)", bps: 60, minFeeHkdCents: 0 },
  { name: "WISE", label: "Wise Business (≈0.55% + min)", bps: 55, minFeeHkdCents: 300 },
];

// Placeholder mids, stamped as not live. The worker's FETCH_FX replaces them.
const MIDS = { USD: 7.8, CNY: 1.09, JPY: 0.052, EUR: 8.6, GBP: 10.1, SGD: 6.1 };

const CHANNELS = [
  { platform: "STOREFRONT", status: "CONNECTED", commissionPct: 0, paymentFeePct: 0.034, fixedFeeHkdCents: 235 },
  { platform: "EBAY", status: "NOT_CONNECTED", commissionPct: 0.1325, paymentFeePct: 0, fixedFeeHkdCents: 300 },
  { platform: "SHOPIFY", status: "NOT_CONNECTED", commissionPct: 0, paymentFeePct: 0.033, fixedFeeHkdCents: 235 },
  { platform: "META", status: "NOT_CONNECTED", commissionPct: 0, paymentFeePct: 0.034, fixedFeeHkdCents: 235 },
  { platform: "TIKTOK_SHOP", status: "NOT_AVAILABLE", commissionPct: 0.05, paymentFeePct: 0.02, fixedFeeHkdCents: 0 },
  { platform: "SHOPEE", status: "NOT_AVAILABLE", commissionPct: 0.06, paymentFeePct: 0.02, fixedFeeHkdCents: 0 },
  { platform: "HKTVMALL", status: "NOT_AVAILABLE", commissionPct: 0.2, paymentFeePct: 0, fixedFeeHkdCents: 0 },
];

async function main() {
  const demo = process.argv.includes("--demo");

  for (const s of SOURCES) {
    await prisma.sourceConfig.upsert({ where: { platform: s.platform }, create: s, update: {} });
  }
  for (const r of RAILS) {
    await prisma.fxRail.upsert({ where: { name: r.name }, create: r, update: {} });
  }
  for (const [base, mid] of Object.entries(MIDS)) {
    await prisma.fxQuote.upsert({
      where: { base_quote: { base, quote: "HKD" } },
      create: { base, quote: "HKD", mid, source: "seed-default (not live)", fetchedAt: new Date("2000-01-01") },
      update: {},
    });
  }
  for (const c of CHANNELS) {
    await prisma.channelAccount.upsert({ where: { platform: c.platform }, create: c, update: {} });
  }
  for (const p of PLATFORMS) {
    const needsLogin = ["TAOBAO", "ALI1688", "JD", "PDD"].includes(p);
    await prisma.platformSession.upsert({
      where: { platform: p },
      create: { platform: p, status: needsLogin ? "LOGGED_OUT" : "NOT_REQUIRED" },
      update: {},
    });
  }
  for (const [key, value] of Object.entries({ runMode: "DRY", killSwitch: "OFF", "payments.liveUnlocked": "NO" })) {
    await prisma.systemFlag.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  if (!(await prisma.capitalEnvelope.findFirst())) {
    await prisma.capitalEnvelope.create({ data: { version: 1, maxOpenExposureHkdCents: 2_000_000, note: "Initial HK$20,000 cap" } });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@landed.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "landed-admin-2026";
  const admin = await prisma.customer.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "Admin", passwordHash: hashPassword(adminPassword), isAdmin: true },
    update: { isAdmin: true },
  });
  console.log(`seed: defaults ok; admin ${admin.email}${process.env.ADMIN_PASSWORD ? "" : " / landed-admin-2026 (set ADMIN_PASSWORD)"}`);

  if (demo) {
    process.env.ADAPTER_MODE = "fixture";
    const { getAdapter } = await import("../lib/sources/adapters");
    const { upsertOffers, clusterKeyword } = await import("../lib/catalog");
    const keyword = "demo";
    for (const p of PLATFORMS) {
      const listings = await (await getAdapter(p)).searchProducts(keyword);
      await upsertOffers(keyword, listings);
    }
    const r = await clusterKeyword(keyword);
    // The 1688 factory shop is the one supplier we can place orders with in the demo.
    await prisma.supplier.updateMany({ where: { platform: "ALI1688" }, data: { fulfilmentMode: "MANUAL_ASSISTED" } });
    await prisma.searchQuery.upsert({
      where: { normalized: keyword },
      create: { normalized: keyword, display: keyword, lastCrawledAt: new Date() },
      update: { lastCrawledAt: new Date() },
    });
    console.log(`seed --demo: ${JSON.stringify(r)}`);

    // One flight and one hotel search on demo fares, so /travel has something to show offline.
    const { requestTravelSearch, handleTravelSearch } = await import("../lib/travel/service");
    const { addDays, hkToday } = await import("../lib/travel/types");
    const day = addDays(hkToday(), 21);
    for (const params of [
      { kind: "FLIGHT" as const, from: "HKG", to: "TYO", depart: day, return: addDays(day, 5), adults: 1, cabin: "ECONOMY" as const },
      { kind: "HOTEL" as const, place: "TYO", checkIn: day, checkOut: addDays(day, 3), adults: 2 },
    ]) {
      const req = await requestTravelSearch(params);
      const job = req.jobId ? await prisma.job.findUnique({ where: { id: req.jobId } }) : null;
      if (job) {
        await handleTravelSearch(job, { source: "FIXTURE" });
        await prisma.job.update({ where: { id: job.id }, data: { status: "DONE", finishedAt: new Date() } });
      }
    }
    console.log("seed --demo: travel demo searches ready (HKG→TYO, Tokyo hotels)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
