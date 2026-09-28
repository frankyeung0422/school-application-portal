import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/auth";
import { shippingOf } from "@/lib/orders";
import { hkd } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";
import { Badge, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

const TIMELINE: OrderStatus[] = ["PAID", "ROUTED", "SUPPLIER_PLACED", "SHIPPED", "DELIVERED"];

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ id }, { paid }] = await Promise.all([params, searchParams]);
  const customer = await currentCustomer();
  if (!customer) redirect(`/login?next=/account/orders/${id}`);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { lines: { include: { product: true } }, payments: true, supplierOrders: true },
  });
  if (!order || (order.customerId !== customer.id && !customer.isAdmin)) notFound();
  const ship = shippingOf(order);
  const status = order.status as OrderStatus;
  const reached = TIMELINE.indexOf(status === "NEEDS_DECISION" ? "PAID" : status);
  const tracking = order.supplierOrders.map((s) => s.trackingNo).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {paid ? <Notice tone="green">✓ 付款成功，我哋而家向供應商安排落單。Payment received — we&apos;re placing your order.</Notice> : null}
      {order.realness === "TEST" && order.status !== "QUOTED" ? <Notice tone="blue">測試付款 Test payment — no real money moved.</Notice> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">訂單 {order.number}</h1>
        <Badge tone={status === "REFUNDED" || status === "CANCELLED" ? "red" : "green"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>
      </div>

      <ol className="grid grid-cols-5 gap-2 text-center text-xs">
        {TIMELINE.map((s, i) => (
          <li key={s} className={`rounded-lg px-1 py-2 ${i <= reached ? "bg-emerald-100 font-semibold text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
            {ORDER_STATUS_LABELS[s]}
          </li>
        ))}
      </ol>
      {status === "NEEDS_DECISION" ? (
        <Notice>供應商價錢或者存貨有變，我哋同事正在處理；如果無法按原價出貨會全數退款。The supplier changed; we will ship at your price or refund in full.</Notice>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>產品</th><th>數量</th><th>單價</th></tr></thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/p/${l.product.slug}`} className="text-brand-700 underline">{l.product.title}</Link></td>
                <td>{l.qty}</td>
                <td className="tabular-nums">{hkd(l.unitPriceHkdCents)}</td>
              </tr>
            ))}
            <tr className="font-semibold"><td>合計 Total</td><td /><td className="tabular-nums">{hkd(order.totalHkdCents)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4 text-sm">
          <div className="font-semibold">送貨 Delivery</div>
          <div className="mt-1">{ship.name} · {ship.phone}</div>
          <div className="text-slate-600">{ship.address}</div>
          {tracking.length ? <div className="mt-2">追蹤 Tracking: {tracking.join(", ")}</div> : null}
        </div>
        <div className="card p-4 text-sm">
          <div className="font-semibold">付款 Payments</div>
          {order.payments.map((p) => (
            <div key={p.id} className="mt-1 flex justify-between">
              <span>{p.kind} · {p.status}</span>
              <span className="tabular-nums">{hkd(p.amountHkdCents)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
