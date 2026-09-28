import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shippingOf } from "@/lib/orders";
import { hkd, native, timeAgo } from "@/lib/format";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  const sos = await prisma.supplierOrder.findMany({
    where: { status: { in: ["NEEDS_DECISION", "TASK_OPEN", "PLACED", "SHIPPED"] } },
    include: { offer: true, order: true, pool: true },
    orderBy: { createdAt: "asc" },
  });
  const actionIds = sos.map((s) => s.actionRequestId).filter((x): x is string => Boolean(x));
  const actions = new Map((await prisma.actionRequest.findMany({ where: { id: { in: actionIds } } })).map((a) => [a.id, a]));
  const approved = (s: (typeof sos)[number]) => s.actionRequestId != null && actions.get(s.actionRequestId)?.status === "executed";

  const ready = sos.filter((s) => s.status === "TASK_OPEN" && approved(s));
  const waiting = sos.filter((s) => (s.status === "TASK_OPEN" && !approved(s)) || s.status === "NEEDS_DECISION");
  const inFlight = sos.filter((s) => s.status === "PLACED" || s.status === "SHIPPED");

  return (
    <div className="space-y-8">
      <PageTitle title="採購 Purchasing" sub="已批准嘅供應商訂單：去供應商網站落單，然後填返真實單號同扣款金額（入賬用）。Buy it, then enter the real receipt — that is what the ledger books." />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">待落單 Ready to buy ({ready.length})</h2>
        {ready.length ? ready.map((s) => {
          const ship = s.order ? shippingOf(s.order) : null;
          return (
            <div key={s.id} className="card space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">SO #{s.id}</Badge>
                <span>{s.order ? <>訂單 <Link className="underline" href={`/account/orders/${s.order.id}`}>{s.order.number}</Link></> : `拼單 ${s.pool?.slug}`}</span>
                <span className="text-slate-500">{timeAgo(s.createdAt)}</span>
              </div>
              <div>
                <b>{s.qty} ×</b> <a className="text-brand-700 underline" href={s.offer.url} target="_blank" rel="noreferrer">{s.offer.title}</a> ({s.offer.platform}, 標價 {native(s.offer.latestPrice, s.offer.currency)})
              </div>
              <div className="text-xs text-slate-500">預計成本 {hkd(s.expectedCostHkdCents)} via {s.rail} · FX mid {s.fxMid} · {s.routingReason}</div>
              {ship ? <div className="text-xs">送貨：{ship.name} · {ship.phone} · {ship.address}</div> : <div className="text-xs">送去集運倉，到港後逐件派送 Ship to forwarder for consolidation</div>}
              <OpForm
                op="confirmPurchase"
                hidden={{ supplierOrderId: s.id }}
                fields={[
                  { name: "externalRef", label: "供應商單號 Supplier order #", width: "w-48" },
                  { name: "nativeAmountPaid", label: `實付 (${s.offer.currency})`, type: "number", width: "w-32" },
                  { name: "actualDebitedHkd", label: "實際扣款 HKD", type: "number", width: "w-32" },
                ]}
                label="確認已落單 Confirm purchase"
              />
            </div>
          );
        }) : <Empty title="冇待落單 Nothing ready to buy" />}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">等待批准 / 決定 Waiting ({waiting.length})</h2>
        {waiting.length ? (
          <Notice>呢啲要先喺 <Link href="/admin/actions" className="underline">Approvals</Link> 批准。
            {waiting.map((s) => ` SO #${s.id} (${s.status})`).join(",")}
          </Notice>
        ) : <p className="text-sm text-slate-500">—</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">已落單 In flight ({inFlight.length})</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>SO</th><th>貨品</th><th>單號</th><th>實際成本</th><th>狀態</th><th>更新</th></tr></thead>
            <tbody>
              {inFlight.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td className="max-w-xs truncate">{s.qty} × {s.offer.title}</td>
                  <td>{s.externalRef}</td>
                  <td className="tabular-nums">{hkd(s.actualCostHkdCents)}</td>
                  <td><Badge tone={s.status === "SHIPPED" ? "blue" : "amber"}>{s.status}</Badge>{s.trackingNo ? <div className="text-xs">{s.trackingNo}</div> : null}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      {s.status === "PLACED" ? (
                        <OpForm op="supplierOutcome" hidden={{ supplierOrderId: s.id, outcome: "SHIPPED" }} fields={[{ name: "trackingNo", label: "追蹤號", width: "w-36" }]} label="已發貨" tone="secondary" />
                      ) : null}
                      <OpForm op="supplierOutcome" hidden={{ supplierOrderId: s.id, outcome: "RECEIVED" }} label="已收貨 Received" tone="secondary" />
                      <OpForm op="supplierOutcome" hidden={{ supplierOrderId: s.id, outcome: "FAILED" }} label="失敗 Failed" tone="danger" confirm="Mark this supplier order failed?" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
