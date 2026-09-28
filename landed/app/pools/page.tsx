import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { tierFor } from "@/lib/pools";
import { ladderOf } from "@/lib/pools-service";
import { hkd } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PoolsPage() {
  const pools = await prisma.pool.findMany({
    where: { status: { in: ["OPEN", "UNLOCKED"] } },
    include: { product: true },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
  });
  return (
    <div>
      <PageTitle
        title="拼單 Group-buy pools"
        sub="夠人數先扣款，攞到批發價；唔夠人就全部取消，一蚊都唔收。Nobody is charged unless the pool reaches a wholesale tier."
      />
      {pools.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {pools.map((pool) => {
            const ladder = ladderOf(pool);
            const t = tierFor(pool.committedQty, ladder);
            const first = ladder[0];
            const progress = Math.min(100, Math.round((pool.committedQty / (t.next?.minQty ?? first.minQty)) * 100));
            return (
              <Link key={pool.id} href={`/pools/${pool.slug}`} className="card space-y-2 p-5 hover:border-brand-500">
                <div className="line-clamp-2 font-medium">{pool.product.title}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-brand-700">{hkd(t.unitHkdCents)}</span>
                  <span className="text-sm text-slate-400 line-through">{hkd(pool.singleUnitHkdCents)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-slate-500">
                  {pool.status === "UNLOCKED" ? "已成團 Unlocked" : `已有 ${pool.committedQty} 件 · 截止 ${pool.deadline.toLocaleDateString("zh-HK")}`}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty title="暫時冇拼單 No open pools">熱門而且有批發價嘅產品會開拼單。Pools open for popular products with wholesale tiers.</Empty>
      )}
    </div>
  );
}
