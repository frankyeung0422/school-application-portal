import { prisma } from "./prisma";
import { fxEconomics } from "./money/fx";
import { commercialSettings, loadMids, loadRails } from "./settings";

/**
 * Forecasts, clearly labelled. Nothing here is money. lib/ledger.ts and the
 * P&L pages must never import this file (scripts/verify-honesty.ts checks).
 */

export async function pipelineProjection() {
  const [openPools, pendingOrders] = await Promise.all([
    prisma.pool.findMany({ where: { status: "OPEN" }, select: { committedQty: true, ladder: true, singleUnitHkdCents: true } }),
    prisma.order.aggregate({ where: { status: "QUOTED" }, _sum: { totalHkdCents: true }, _count: true }),
  ]);
  const poolCommittedUnits = openPools.reduce((s, p) => s + p.committedQty, 0);
  return {
    openPools: openPools.length,
    poolCommittedUnits,
    unpaidCheckoutsCents: pendingOrders._sum.totalHkdCents ?? 0,
    unpaidCheckouts: pendingOrders._count,
  };
}

/** What the FX buffer is expected to earn per HK$1,000 of USD goods on each rail. */
export async function fxBufferIllustration() {
  const [{ mids }, rails, s] = await Promise.all([loadMids(), loadRails(), commercialSettings()]);
  const usd = mids.USD ? 1000 / mids.USD : 128;
  return Object.values(rails).map((rail) => ({
    rail: rail.name,
    ...fxEconomics({ nativeAmount: usd, currency: "USD", mids, bufferPct: s.fxBufferPct, rail }),
  }));
}
