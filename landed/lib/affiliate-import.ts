import { prisma } from "./prisma";
import { postEntry, reverseEntry } from "./ledger";
import { loadMids } from "./settings";
import { toCents, toHkd } from "./money/fx";
import {
  commissionSourceRef,
  parseCommissionReport,
  reconcile,
  type CommissionRow,
  type Programme,
} from "./affiliate-reconcile";
import type { Realness } from "./types";

// Service: a programme's commission report → AffiliateCommission rows, and
// ledger lines for what the programme says was earned. Re-importing the same
// (or a newer) report is safe: every line is keyed by programme + its own ref.

export interface ImportResult {
  rows: number;
  booked: number;
  alreadyBooked: number;
  pending: number;
  reversed: number;
  unattributed: number;
  unknownClick: number;
  bookedHkdCents: number;
  pendingHkdCents: number;
  errors: string[];
}

export async function importCommissionReport(opts: {
  programme: Programme;
  csv: string;
  currency?: string;
  realness?: Realness;
}): Promise<ImportResult> {
  const realness = opts.realness ?? "REAL";
  const { rows, errors } = parseCommissionReport(opts.programme, opts.csv, opts.currency ?? "USD");
  const clickIds = [...new Set(rows.map((r) => r.clickId).filter((x): x is number => x != null))];
  const clicks = await prisma.affiliateClick.findMany({ where: { id: { in: clickIds } }, select: { id: true, productId: true } });
  const productOf = new Map(clicks.map((c) => [c.id, c.productId]));
  const summary = reconcile(rows, new Set(productOf.keys()));
  const { mids } = await loadMids();

  const out: ImportResult = {
    rows: rows.length,
    booked: 0,
    alreadyBooked: 0,
    pending: 0,
    reversed: 0,
    unattributed: rows.filter((r) => r.clickId == null).length,
    unknownClick: summary.unknownClick.length,
    bookedHkdCents: 0,
    pendingHkdCents: 0,
    errors: [...errors],
  };

  const cents = (r: CommissionRow) => {
    try {
      return toCents(toHkd(r.amount, r.currency, mids));
    } catch {
      out.errors.push(`${r.externalRef}: no FX rate for ${r.currency}`);
      return null;
    }
  };

  const save = async (r: CommissionRow, status: string, amountHkdCents: number, ledgerRef: string | null) => {
    const productId = r.clickId != null ? (productOf.get(r.clickId) ?? null) : null;
    const data = {
      subId: r.subId,
      clickId: r.clickId != null && productOf.has(r.clickId) ? r.clickId : null,
      productId,
      amount: r.amount,
      currency: r.currency,
      amountHkdCents,
      status,
      reason: r.reason,
      occurredAt: r.occurredAt,
      ledgerRef,
    };
    await prisma.affiliateCommission.upsert({
      where: { programme_externalRef: { programme: r.programme, externalRef: r.externalRef } },
      create: { programme: r.programme, externalRef: r.externalRef, ...data },
      update: data,
    });
  };

  for (const r of summary.book) {
    const c = cents(r);
    if (c == null || c <= 0) continue;
    const sourceRef = commissionSourceRef(r.programme, r.externalRef);
    const existed = await prisma.ledgerEntry.findUnique({ where: { sourceRef } });
    await postEntry({
      kind: "AFFILIATE",
      amountHkdCents: c,
      realness,
      sourceRef,
      productId: r.clickId != null ? (productOf.get(r.clickId) ?? null) : null,
      channel: r.programme,
      memo: `${r.programme} commission ${r.externalRef}${r.subId ? ` (${r.subId})` : ""}: ${r.amount} ${r.currency}`,
    });
    await save(r, "BOOKED", c, sourceRef);
    if (existed) out.alreadyBooked++;
    else {
      out.booked++;
      out.bookedHkdCents += c;
    }
  }

  for (const r of summary.pending) {
    const c = cents(r) ?? 0;
    // A line already booked by an earlier report stays booked; programmes don't un-earn by going "pending".
    const prior = await prisma.affiliateCommission.findUnique({
      where: { programme_externalRef: { programme: r.programme, externalRef: r.externalRef } },
    });
    if (prior?.status === "BOOKED") continue;
    await save(r, "PENDING", c, null);
    out.pending++;
    out.pendingHkdCents += c;
  }

  for (const r of summary.reverse) {
    const c = cents(r) ?? 0;
    // Same ref previously booked (status went Paid → Reversed): reverse that line.
    let target = await prisma.affiliateCommission.findUnique({
      where: { programme_externalRef: { programme: r.programme, externalRef: r.externalRef } },
    });
    // A separate return line: undo the one booked commission for the same click and amount, if unambiguous.
    if (target?.status !== "BOOKED" && r.clickId != null && r.amount < 0) {
      const candidates = await prisma.affiliateCommission.findMany({
        where: { programme: r.programme, clickId: r.clickId, status: "BOOKED", amount: -r.amount },
      });
      target = candidates.length === 1 ? candidates[0] : target;
    }
    if (target?.status === "BOOKED" && target.ledgerRef) {
      const n = await reverseEntry(target.ledgerRef, `reversed by ${r.programme} ${r.externalRef}: ${r.reason}`);
      await prisma.affiliateCommission.update({ where: { id: target.id }, data: { status: "REVERSED", reason: `reversed by ${r.externalRef}` } });
      if (n) out.reversed++;
    }
    if (target?.externalRef !== r.externalRef) await save(r, "REVERSED", c, null);
  }

  for (const r of summary.skipped) await save(r, "SKIPPED", 0, null);
  return out;
}

/** Clicks → reported → booked, for the admin revenue page. Numbers here are counts and booked money only. */
export async function affiliateFunnel(days = 30) {
  const since = new Date(Date.now() - days * 86400_000);
  const [rows, commissions, travelClicks] = await Promise.all([
    prisma.affiliateClick.findMany({
      where: { createdAt: { gte: since } },
      select: { tracked: true, offer: { select: { platform: true } } },
    }),
    prisma.affiliateCommission.groupBy({ by: ["programme", "status"], _count: true, _sum: { amountHkdCents: true } }),
    prisma.travelClick.count({ where: { createdAt: { gte: since } } }),
  ]);
  const byPlatform = new Map<string, { platform: string; clicks: number; tracked: number }>();
  for (const r of rows) {
    const p = byPlatform.get(r.offer.platform) ?? { platform: r.offer.platform, clicks: 0, tracked: 0 };
    p.clicks++;
    if (r.tracked) p.tracked++;
    byPlatform.set(p.platform, p);
  }
  return {
    days,
    clicks: rows.length,
    tracked: rows.filter((r) => r.tracked).length,
    byPlatform: [...byPlatform.values()].sort((a, b) => b.clicks - a.clicks),
    commissions: commissions.map((c) => ({ programme: c.programme, status: c.status, count: c._count, hkdCents: c._sum.amountHkdCents ?? 0 })),
    travelClicks,
  };
}
