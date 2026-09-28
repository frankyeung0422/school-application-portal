import { prisma } from "./prisma";
import type { Realness } from "./types";

/**
 * The only writer of LedgerEntry (enforced by scripts/verify-honesty.ts).
 *
 * A ledger line records money that moved: a captured charge, a refund, a
 * supplier payment, a commission that a programme actually reported. Expected
 * margins, "projected FX gain" and pool pipelines are projections and live in
 * lib/projections.ts, which this file must never import. TEST money is stored
 * (so flows can be verified end to end) but is never summed with REAL money.
 */

export const LEDGER_KINDS = [
  "AFFILIATE",
  "SALE",
  "SUPPLIER_COST",
  "SHIPPING",
  "FX_GAIN",
  "FEE",
  "REFUND",
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export const LEDGER_LABELS: Record<LedgerKind, string> = {
  AFFILIATE: "聯盟佣金 Affiliate commission",
  SALE: "銷售收入 Sales",
  SUPPLIER_COST: "供應商成本 Supplier cost",
  SHIPPING: "運費 Shipping",
  FX_GAIN: "匯兌收益 FX result",
  FEE: "手續費 Fees",
  REFUND: "退款 Refunds",
};

/** Money in is positive, money out negative. Enforced per kind. */
const SIGN: Record<LedgerKind, 1 | -1 | 0> = {
  AFFILIATE: 1,
  SALE: 1,
  SUPPLIER_COST: -1,
  SHIPPING: -1,
  FX_GAIN: 0, // either sign — a realised FX loss is a real loss
  FEE: -1,
  REFUND: -1,
};

export class LedgerSignError extends Error {}

export async function postEntry(e: {
  kind: LedgerKind;
  amountHkdCents: number;
  realness: Realness;
  /** Idempotency: one real-world event → one ledger line, however often a webhook retries. */
  sourceRef: string;
  orderId?: string | null;
  poolId?: number | null;
  productId?: number | null;
  channel?: string | null;
  memo?: string;
}) {
  if (!Number.isInteger(e.amountHkdCents)) throw new LedgerSignError("ledger amounts are integer cents");
  const sign = SIGN[e.kind];
  if (sign !== 0 && Math.sign(e.amountHkdCents) !== sign && e.amountHkdCents !== 0) {
    throw new LedgerSignError(`${e.kind} must be ${sign > 0 ? "positive" : "negative"}, got ${e.amountHkdCents}`);
  }
  const existing = await prisma.ledgerEntry.findUnique({ where: { sourceRef: e.sourceRef } });
  if (existing) return existing;
  return prisma.ledgerEntry.create({
    data: {
      kind: e.kind,
      amountHkdCents: e.amountHkdCents,
      realness: e.realness,
      sourceRef: e.sourceRef,
      orderId: e.orderId ?? null,
      poolId: e.poolId ?? null,
      productId: e.productId ?? null,
      channel: e.channel ?? null,
      memo: e.memo,
    },
  });
}

/** Card money is not ours until the dispute window has mostly passed. */
export const CLEARING_DAYS = 14;

export async function clearEntries(now = new Date()) {
  const cutoff = new Date(now.getTime() - CLEARING_DAYS * 86400_000);
  const res = await prisma.ledgerEntry.updateMany({
    where: { clearedAt: null, reversedAt: null, occurredAt: { lte: cutoff } },
    data: { clearedAt: now },
  });
  return res.count;
}

export async function pnl(realness: Realness) {
  const rows = await prisma.ledgerEntry.groupBy({
    by: ["kind"],
    where: { realness, reversedAt: null },
    _sum: { amountHkdCents: true },
    _count: true,
  });
  const byKind = Object.fromEntries(rows.map((r) => [r.kind, { cents: r._sum.amountHkdCents ?? 0, count: r._count }]));
  const net = rows.reduce((s, r) => s + (r._sum.amountHkdCents ?? 0), 0);
  const cleared = await prisma.ledgerEntry.aggregate({
    where: { realness, reversedAt: null, clearedAt: { not: null } },
    _sum: { amountHkdCents: true },
  });
  return { byKind, netCents: net, clearedNetCents: cleared._sum.amountHkdCents ?? 0 };
}

export async function pnlBy(field: "channel" | "productId", realness: Realness) {
  const rows = await prisma.ledgerEntry.groupBy({
    by: [field],
    where: { realness, reversedAt: null },
    _sum: { amountHkdCents: true },
  });
  return rows
    .map((r) => ({ key: (r as Record<string, unknown>)[field] as string | number | null, cents: r._sum.amountHkdCents ?? 0 }))
    .sort((a, b) => b.cents - a.cents);
}

/**
 * A booked line the counterparty has since taken back (a programme reversing a
 * commission). The line stays for the audit trail; reversedAt drops it from P&L.
 */
export async function reverseEntry(sourceRef: string, memo: string) {
  const res = await prisma.ledgerEntry.updateMany({
    where: { sourceRef, reversedAt: null },
    data: { reversedAt: new Date(), memo },
  });
  return res.count;
}
