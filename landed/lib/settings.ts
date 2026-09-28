import { prisma } from "./prisma";
import type { FxMids, Rail } from "./money/fx";
import type { SourceProfile, Wallet } from "./money/landed";
import { DEFAULT_THRESHOLDS, type EligibilityThresholds } from "./eligibility";

// DB-backed configuration. Pure engines never import this file; services load
// what they need here and pass plain values in.

export async function getFlag(key: string, fallback: string): Promise<string> {
  const row = await prisma.systemFlag.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setFlag(key: string, value: string): Promise<void> {
  await prisma.systemFlag.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function getNumberFlag(key: string, fallback: number): Promise<number> {
  const v = Number(await getFlag(key, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
}

/** Commercial knobs, in one place so the admin page and the engines agree. */
export async function commercialSettings() {
  const [fxBufferPct, targetMarginPct, settlementRail, poolMaxAbsorbPct, maxRepricePct, quoteTtlMinutes] =
    await Promise.all([
      getNumberFlag("fx.bufferPct", 0.015),
      getNumberFlag("pricing.targetMarginPct", 0.1),
      getFlag("fx.settlementRail", "AIRWALLEX"),
      getNumberFlag("pools.maxAbsorbPct", 0.03),
      getNumberFlag("channels.maxRepricePct", 0.15),
      getNumberFlag("quotes.ttlMinutes", 15),
    ]);
  return { fxBufferPct, targetMarginPct, settlementRail, poolMaxAbsorbPct, maxRepricePct, quoteTtlMinutes };
}

export async function eligibilityThresholds(): Promise<EligibilityThresholds> {
  return {
    minWatches: await getNumberFlag("eligibility.minWatches", DEFAULT_THRESHOLDS.minWatches),
    minClicks: await getNumberFlag("eligibility.minClicks", DEFAULT_THRESHOLDS.minClicks),
    minMatch: await getNumberFlag("eligibility.minMatch", DEFAULT_THRESHOLDS.minMatch),
    minMarginPct: await getNumberFlag("eligibility.minMarginPct", DEFAULT_THRESHOLDS.minMarginPct),
    maxPriceAgeHours: await getNumberFlag("eligibility.maxPriceAgeHours", DEFAULT_THRESHOLDS.maxPriceAgeHours),
  };
}

export async function loadMids(): Promise<{ mids: FxMids; fetchedAt: Date | null; source: string | null }> {
  const rows = await prisma.fxQuote.findMany({ where: { quote: "HKD" } });
  const mids: FxMids = { HKD: 1 };
  let fetchedAt: Date | null = null;
  let source: string | null = null;
  for (const r of rows) {
    mids[r.base] = r.mid;
    if (!fetchedAt || r.fetchedAt < fetchedAt) fetchedAt = r.fetchedAt;
    source = r.source;
  }
  return { mids, fetchedAt, source };
}

export async function loadRails(): Promise<Record<string, Rail>> {
  const rows = await prisma.fxRail.findMany({ where: { active: true } });
  return Object.fromEntries(rows.map((r) => [r.name, { name: r.name, bps: r.bps, minFeeHkdCents: r.minFeeHkdCents }]));
}

export async function settlementRail(): Promise<Rail> {
  const [rails, s] = await Promise.all([loadRails(), commercialSettings()]);
  const rail = rails[s.settlementRail] ?? Object.values(rails).sort((a, b) => a.bps - b.bps)[0];
  if (!rail) throw new Error("No active FX rail configured — run npm run seed");
  return rail;
}

export async function loadProfiles(): Promise<Record<string, SourceProfile>> {
  const rows = await prisma.sourceConfig.findMany({ where: { enabled: true } });
  return Object.fromEntries(
    rows.map((r) => [
      r.platform,
      {
        platform: r.platform,
        currency: r.currency,
        shipToHkHkd: r.shipToHkHkd,
        freeShipOverNative: r.freeShipOverNative,
        domesticShipNative: r.domesticShipNative,
        viaForwarder: r.viaForwarder,
        forwarderPerKgHkd: r.forwarderPerKgHkd,
        forwarderMinHkd: r.forwarderMinHkd,
        assumedWeightKg: r.assumedWeightKg,
        cardFxMarkupPct: r.cardFxMarkupPct,
        paymentFeePct: r.paymentFeePct,
        importDutyPct: r.importDutyPct,
        officialFreeToPickup: r.officialFreeToPickup,
        officialFreeMaxKg: r.officialFreeMaxKg ?? undefined,
        homeDeliverySurchargeHkd: r.homeDeliverySurchargeHkd,
        volumetricDivisor: r.volumetricDivisor,
      } satisfies SourceProfile,
    ]),
  );
}

export async function affiliateCommissionPct(platform: string): Promise<number> {
  const row = await prisma.sourceConfig.findUnique({ where: { platform } });
  return row?.affiliateCommissionPct ?? 0;
}

/**
 * E-wallet FX spread on a mainland purchase (AlipayHK / WeChat Pay HK). Public
 * figures vary and are not published per transaction, so this is an assumption,
 * shown on the page and editable as a flag (fx.wallet.ALIPAYHK etc.).
 */
export async function walletMarkups(): Promise<Record<Wallet, number>> {
  const [ali, wx] = await Promise.all([getNumberFlag("fx.wallet.ALIPAYHK", 0.005), getNumberFlag("fx.wallet.WECHATPAYHK", 0.005)]);
  return { ALIPAYHK: ali, WECHATPAYHK: wx };
}
