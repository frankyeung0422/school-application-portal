import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { candidateNeedles, rankFuzzy } from "@/lib/search/fuzzy";
import { hkd, timeAgo } from "@/lib/format";
import { Badge, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const include = { _count: { select: { clicks: true, watches: true, channelListings: { where: { status: "LIVE" } } } } };
  const needles = q ? candidateNeedles(q) : [];
  const loaded = await prisma.product.findMany({
    where: q ? { OR: [q, ...needles].flatMap((n) => [{ title: { contains: n } }, { keyword: { contains: n } }]) } : {},
    include,
    orderBy: { updatedAt: "desc" },
    take: q ? 2000 : 200,
  });
  // Same forgiving matching as the storefront; typos fall back to scoring recent products.
  const pool = q && loaded.length < 5 ? await prisma.product.findMany({ include, orderBy: { updatedAt: "desc" }, take: 3000 }) : loaded;
  const products = q ? rankFuzzy(q, pool, (p) => `${p.title} ${p.keyword}`).slice(0, 200).map((m) => m.row) : pool;
  return (
    <div className="space-y-4">
      <PageTitle title="產品 Products" sub={`${products.length} shown`} />
      <form className="flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="搜尋 title / keyword" className="input" />
        <button className="btn-secondary">搜尋</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>產品</th><th>模式</th><th>來源</th><th className="text-right">最平到手價</th><th>點擊/關注</th><th>上架</th><th>定價</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="max-w-md">
                  <Link href={`/admin/products/${p.id}`} className="text-brand-700 underline">{p.title}</Link>
                  <div className="text-xs text-slate-400">{p.keyword}</div>
                </td>
                <td>
                  <Badge tone={p.fulfilMode === "FULFIL" ? "green" : "slate"}>{p.fulfilMode}</Badge>
                  {p.restricted ? <Badge tone="red">restricted</Badge> : null}
                </td>
                <td>{p.sourceCount}</td>
                <td className="text-right tabular-nums">{hkd(p.bestLandedHkdCents)}</td>
                <td>{p._count.clicks} / {p._count.watches}</td>
                <td>{p._count.channelListings}</td>
                <td className="text-xs text-slate-500">{timeAgo(p.lastPricedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
