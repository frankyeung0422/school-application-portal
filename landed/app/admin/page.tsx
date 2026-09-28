import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pnl, pnlBy, LEDGER_KINDS, LEDGER_LABELS } from "@/lib/ledger";
import { currentEnvelope, openExposureCents } from "@/lib/pools-service";
import { hkd, hkdSigned, msAgo } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";
import { Notice, PageTitle, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

// Real money only, from the ledger. Forecasts live on /admin/forecast.

async function PnlTable({ realness }: { realness: "REAL" | "TEST" }) {
  const [p, byChannel] = await Promise.all([pnl(realness), pnlBy("channel", realness)]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>類別 Kind</th><th className="text-right">筆數</th><th className="text-right">金額 HKD</th></tr>
          </thead>
          <tbody>
            {LEDGER_KINDS.map((k) => (
              <tr key={k}>
                <td>{LEDGER_LABELS[k]}</td>
                <td className="text-right tabular-nums">{p.byKind[k]?.count ?? 0}</td>
                <td className={`text-right tabular-nums ${(p.byKind[k]?.cents ?? 0) < 0 ? "text-rose-700" : ""}`}>{hkdSigned(p.byKind[k]?.cents ?? 0)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td>淨額 Net</td>
              <td />
              <td className="text-right tabular-nums">{hkdSigned(p.netCents)}</td>
            </tr>
            <tr className="text-slate-500">
              <td>已清算 Cleared (&gt;14 日)</td>
              <td />
              <td className="text-right tabular-nums">{hkdSigned(p.clearedNetCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>渠道 Channel</th><th className="text-right">淨額 Net</th></tr></thead>
          <tbody>
            {byChannel.length ? (
              byChannel.map((r) => (
                <tr key={String(r.key)}>
                  <td>{r.key ?? "—"}</td>
                  <td className="text-right tabular-nums">{hkdSigned(r.cents)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={2} className="text-slate-400">未有紀錄 No entries</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const [products, fulfil, openPools, pending, ordersByStatus, exposure, envelope, clicks7d, watches] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { fulfilMode: "FULFIL" } }),
    prisma.pool.count({ where: { status: "OPEN" } }),
    prisma.actionRequest.count({ where: { status: "pending" } }),
    prisma.order.groupBy({ by: ["status"], _count: true, where: { status: { not: "QUOTED" } } }),
    openExposureCents(),
    currentEnvelope(),
    prisma.affiliateClick.count({ where: { createdAt: { gte: msAgo(7 * 86400_000) } } }),
    prisma.watch.count({ where: { active: true } }),
  ]);
  return (
    <div className="space-y-8">
      <PageTitle title="總覽 Dashboard" sub={<>只顯示真實入賬 — 預測喺 <Link className="underline" href="/admin/forecast">Forecast</Link>。Ledger money only.</>} />
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="產品 Products" value={products} hint={`${fulfil} 可代買`} />
        <Stat label="7 日點擊 Clicks" value={clicks7d} />
        <Stat label="減價通知 Watches" value={watches} />
        <Stat label="拼單 Open pools" value={openPools} />
        <Stat label="待批 Pending" value={pending} hint={<Link href="/admin/actions" className="underline">審批</Link>} />
        <Stat
          label="資金佔用 Exposure"
          value={hkd(exposure)}
          hint={envelope ? `上限 v${envelope.version} ${hkd(envelope.maxOpenExposureHkdCents)}` : "未設上限"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">真實資金 REAL money</h2>
        <PnlTable realness="REAL" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">測試資金 TEST money</h2>
        <Notice tone="blue">測試資金，唔計收入。Test-mode and mock payments — proves the flow works, never counts as revenue.</Notice>
        <PnlTable realness="TEST" />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">訂單 Orders</h2>
        <div className="flex flex-wrap gap-2">
          {ordersByStatus.length ? (
            ordersByStatus.map((o) => (
              <span key={o.status} className="card px-3 py-2 text-sm">
                {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}: <b>{o._count}</b>
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">未有訂單 No orders</span>
          )}
        </div>
      </section>
    </div>
  );
}
