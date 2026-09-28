import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ladderOf } from "@/lib/pools-service";
import { hkd, timeAgo } from "@/lib/format";
import { Badge, Empty, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPools() {
  const pools = await prisma.pool.findMany({
    include: { product: true, commitments: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <PageTitle title="拼單 Pools" sub="Open a pool from a FULFIL product's admin page; opening needs approval and fits inside the capital envelope." />
      {pools.length ? pools.map((p) => (
        <div key={p.id} className="card space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={p.status === "OPEN" ? "blue" : p.status === "UNLOCKED" ? "green" : p.status === "FAILED" ? "red" : "slate"}>{p.status}</Badge>
            <Link href={`/pools/${p.slug}`} className="font-semibold underline">{p.product.title}</Link>
            <span className="text-slate-500">committed {p.committedQty} · deadline {p.deadline.toLocaleString("zh-HK")} · exposure {hkd(p.exposureHkdCents)}</span>
          </div>
          <div className="text-xs">ladder: 1 → {hkd(p.singleUnitHkdCents)}; {ladderOf(p).map((s) => `${s.minQty}+ → ${hkd(s.unitHkdCents)}`).join("; ")}</div>
          {p.outcome ? <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">{JSON.stringify(JSON.parse(p.outcome), null, 2)}</pre> : null}
          {p.commitments.length ? (
            <table className="table">
              <thead><tr><th>買家</th><th>數量</th><th>最多/件</th><th>已扣/件</th><th>狀態</th><th>時間</th></tr></thead>
              <tbody>
                {p.commitments.map((c) => (
                  <tr key={c.id}>
                    <td>{c.customer.email}</td>
                    <td>{c.qty}</td>
                    <td>{hkd(c.maxUnitHkdCents)}</td>
                    <td>{hkd(c.chargedUnitHkdCents)}</td>
                    <td><Badge tone={c.status === "CHARGED" ? "green" : c.status === "DECLINED" ? "red" : "slate"}>{c.status}</Badge></td>
                    <td className="text-xs text-slate-500">{timeAgo(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      )) : <Empty title="未有拼單 No pools yet" />}
    </div>
  );
}
