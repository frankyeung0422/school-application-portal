import Link from "next/link";
import { pendingReports } from "@/lib/instore/service";
import { prisma } from "@/lib/prisma";
import { hkd, timeAgo } from "@/lib/format";
import { retailerName } from "@/lib/supermarket/retailers";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function PriceReportsPage() {
  const [pending, recent] = await Promise.all([
    pendingReports(),
    prisma.storePriceReport.findMany({ where: { status: { not: "PENDING" } }, orderBy: { reviewedAt: "desc" }, take: 30 }),
  ]);
  // Show the chain's own online price next to each report so the reviewer can judge it.
  const onlineByReport = new Map<number, number | null>();
  for (const r of pending) {
    if (!r.productId) continue;
    const offer = await prisma.offer.findFirst({ where: { productId: r.productId, platform: r.retailer } });
    onlineByReport.set(r.id, offer ? Math.round(offer.latestPrice * 100) : null);
  }

  return (
    <div className="space-y-6">
      <PageTitle title="門市報價審核 In-store price reports" sub="買家報上嚟嘅門市價，核實之後先會公開。" />
      <Notice>
        睇相、睇價錢同網上價差幾遠先決定。批准之後會顯示「用戶提供」同日期，唔會當成官方價。
      </Notice>

      {pending.length ? (
        <div className="space-y-3">
          {pending.map((r) => {
            const online = onlineByReport.get(r.id) ?? null;
            const delta = online ? Math.round(((r.priceCents - online) / online) * 100) : null;
            return (
              <div key={r.id} className="card space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-bold tabular-nums">{hkd(r.priceCents)}</span>
                  <span>{retailerName(r.retailer)}{r.branch ? ` · ${r.branch}` : ""}</span>
                  <span className="text-slate-500">
                    {r.product ? <Link className="underline" href={`/p/${r.product.slug}`}>{r.product.title}</Link> : r.itemName}
                  </span>
                  {online ? (
                    <Badge tone={Math.abs(delta ?? 0) > 40 ? "red" : "slate"}>
                      網上價 {hkd(online)}（{delta! > 0 ? "+" : ""}{delta}%）
                    </Badge>
                  ) : (
                    <Badge>冇網上價可比</Badge>
                  )}
                  <span className="text-xs text-slate-500">見到 {timeAgo(r.seenAt)} · 報 {timeAgo(r.createdAt)}</span>
                </div>
                {r.note ? <div className="text-xs text-amber-700">{r.note}</div> : null}
                {r.photoPath ? (
                  <a href={`/api/instore/photo/${r.photoPath}`} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/instore/photo/${r.photoPath}`} alt="price tag" className="max-h-56 rounded-xl border border-slate-200" />
                  </a>
                ) : (
                  <div className="text-xs text-slate-500">冇相 — 只有數字，要更謹慎。No photo: judge with care.</div>
                )}
                <div className="flex flex-wrap gap-3">
                  <OpForm op="reviewReport" hidden={{ reportId: r.id, decision: "APPROVED" }} label="批准公開 Approve" />
                  <OpForm op="reviewReport" hidden={{ reportId: r.id, decision: "REJECTED" }} fields={[{ name: "reason", label: "拒絕原因", width: "w-56" }]} label="拒絕 Reject" tone="secondary" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty title="冇待審報價 No reports waiting" />
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">最近處理 Recently reviewed</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>狀態</th><th>店舖</th><th className="text-right">價錢</th><th>貨品</th><th>審核</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td><Badge tone={r.status === "APPROVED" ? "green" : "slate"}>{r.status}</Badge></td>
                  <td>{retailerName(r.retailer)}</td>
                  <td className="text-right tabular-nums">{hkd(r.priceCents)}</td>
                  <td className="max-w-xs truncate">{r.itemName ?? `#${r.productId}`}</td>
                  <td className="text-xs text-slate-500">{r.reviewedBy} · {timeAgo(r.reviewedAt)} {r.rejectedReason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
