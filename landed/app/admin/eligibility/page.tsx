import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { eligibilityEvidence } from "@/lib/fulfil";
import { hkd, msAgo, pct, safeJson, timeAgo } from "@/lib/format";
import { Badge, Empty, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function EligibilityPage() {
  const since = msAgo(14 * 86400_000);
  const candidates = await prisma.product.findMany({
    // Supermarket shelf items are compare-only: HK chains are the source *and* the buyer's route.
    where: { fulfilMode: "AFFILIATE", restricted: false, sourceCount: { gte: 1 }, segment: "GLOBAL" },
    include: {
      _count: { select: { clicks: { where: { createdAt: { gte: since } } }, watches: { where: { active: true } } } },
    },
  });
  const top = candidates
    .sort((a, b) => b._count.clicks + b._count.watches * 4 - (a._count.clicks + a._count.watches * 4))
    .slice(0, 30);
  const evaluated = await Promise.all(top.map(async (p) => ({ p, r: await eligibilityEvidence(p.id) })));
  const reviews = await prisma.eligibilityReview.findMany({ include: { product: true }, orderBy: { createdAt: "desc" }, take: 15 });

  return (
    <div className="space-y-8">
      <PageTitle
        title="資格審查 Fulfilment eligibility"
        sub="證據夠先可以開自家結帳：需求、同款核實、可落單供應商、真實到手成本下嘅利潤、價格新鮮度。Passing creates an ENABLE_FULFIL approval — it never flips the switch itself."
      />
      {evaluated.length ? (
        <div className="space-y-3">
          {evaluated.map(({ p, r }) =>
            r ? (
              <div key={p.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/products/${p.id}`} className="font-semibold text-brand-700 underline">{p.title}</Link>
                  <Badge tone={r.verdict.ok ? "green" : "amber"}>{r.verdict.ok ? "合資格 Eligible" : `欠 ${r.verdict.missing.length} 項`}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <span>關注 {r.evidence.watches14d}</span>
                  <span>點擊 {r.evidence.clicks14d}</span>
                  <span>同款 {r.evidence.fulfilMatchConfidence?.toFixed(2) ?? "—"}</span>
                  <span>利潤 {pct(r.evidence.liveMarginPct)}</span>
                  <span>售價 {hkd(r.plan.price?.priceCents)}</span>
                  <span>比買家自己買 {r.evidence.beatsBuyerRouteByCents == null ? "—" : hkd(r.evidence.beatsBuyerRouteByCents)}</span>
                  <span>價格 {r.evidence.priceAgeHours == null ? "—" : `${Math.round(r.evidence.priceAgeHours)}h`}</span>
                </div>
                {r.verdict.missing.length ? (
                  <ul className="list-disc pl-5 text-xs text-amber-800">
                    {r.verdict.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : null}
                <OpForm op="reviewEligibility" hidden={{ productId: p.id }} label="審查並記錄 Review" tone={r.verdict.ok ? "primary" : "secondary"} />
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <Empty title="未有候選產品 No candidates" />
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">審查紀錄 Review history</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>產品</th><th>結果</th><th>欠缺</th><th>時間</th></tr></thead>
            <tbody>
              {reviews.map((rv) => (
                <tr key={rv.id}>
                  <td className="max-w-xs truncate">{rv.product.title}</td>
                  <td><Badge tone={rv.ok ? "green" : "slate"}>{rv.ok ? "OK" : "未合格"}</Badge></td>
                  <td className="max-w-md text-xs text-slate-500">{safeJson<string[]>(rv.missing, []).join(" · ") || "—"}</td>
                  <td className="text-xs text-slate-500">{timeAgo(rv.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
