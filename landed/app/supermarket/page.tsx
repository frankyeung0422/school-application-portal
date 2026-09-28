import Link from "next/link";
import { getFlag } from "@/lib/settings";
import { listSupermarketProducts, supermarketCategories, type SupermarketSort } from "@/lib/supermarket/view";
import { OPW_ATTRIBUTION } from "@/lib/supermarket/retailers";
import { timeAgo } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";
import { SupermarketRow } from "@/components/storefront/supermarket-row";

export const dynamic = "force-dynamic";

const SORTS: [SupermarketSort, string][] = [
  ["gap", "差價最大 Biggest gap"],
  ["unit", "每單位最平 Cheapest per unit"],
  ["promo", "優惠最多 Most promos"],
  ["price", "價錢最低 Lowest price"],
];

export default async function SupermarketPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = (SORTS.find(([s]) => s === sp.sort)?.[0] ?? undefined) as SupermarketSort | undefined;
  const [cats, list, lastSync] = await Promise.all([
    supermarketCategories(),
    listSupermarketProducts({ q: sp.q, cat: sp.cat, sort, take: 30, skip: (page - 1) * 30 }),
    getFlag("opw.lastSyncAt", ""),
  ]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q: sp.q, cat: sp.cat, sort: sp.sort, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/supermarket?${p}`;
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="超市格價 Supermarket prices"
        sub={<>百佳、惠康、Market Place、AEON、大昌、龍豐、屈臣氏、萬寧、莎莎 — 每日更新{lastSync ? `（${timeAgo(lastSync)}）` : ""}，已計「買2件$X」等優惠。</>}
        right={
          <div className="flex flex-wrap gap-2">
            <Link href="/price-index" className="btn-secondary">超市指數</Link>
            <Link href="/shrinkflation" className="btn-secondary">縮水通脹</Link>
            <Link href="/promo-truth" className="btn-secondary">優惠真相</Link>
            <Link href="/basket" className="btn-primary">睇購物清單邊間最平 →</Link>
          </div>
        }
      />

      <form action="/supermarket" className="flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="例如：維他奶、出前一丁、Colgate" className="input text-base" />
        {sp.cat ? <input type="hidden" name="cat" value={sp.cat} /> : null}
        <button className="btn-primary">搜尋</button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link href={qs({ cat: undefined, page: undefined })} className={`rounded-full border px-3 py-1 text-sm ${!sp.cat ? "border-brand-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>全部</Link>
        {cats.map((c) => (
          <Link key={c.name} href={qs({ cat: c.name, page: undefined })} className={`rounded-full border px-3 py-1 text-sm ${sp.cat === c.name ? "border-brand-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            {c.name} <span className="text-xs text-slate-400">{c.count}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">{list.total} 件</span>
        {SORTS.map(([s, label]) => (
          <Link key={s} href={qs({ sort: s, page: undefined })} className={(sort ?? (sp.q ? "price" : "gap")) === s ? "font-semibold text-brand-700" : "text-slate-500 hover:text-slate-800"}>{label}</Link>
        ))}
      </div>

      {list.items.length ? (
        <div className="space-y-3">
          {list.items.map((i) => (
            <SupermarketRow key={i.product.id} product={i.product} rows={i.rows} gapCents={i.gapCents} savingVsTypicalCents={i.savingVsTypicalCents} outlierRetailers={i.outlierRetailers} />
          ))}
        </div>
      ) : (
        <Empty title={cats.length ? "搵唔到 No matches" : "未有超市數據 No supermarket data yet"}>
          {cats.length ? "試下用品牌或者英文名。" : "Worker 會每 3 小時同步消委會價格（npm run worker），或者喺管理頁執行 SUPERMARKET_SYNC。"}
        </Empty>
      )}

      <div className="flex justify-between">
        {page > 1 ? <Link className="btn-secondary" href={qs({ page: String(page - 1) })}>← 上一頁</Link> : <span />}
        {page * 30 < list.total ? <Link className="btn-secondary" href={qs({ page: String(page + 1) })}>下一頁 →</Link> : null}
      </div>
      <p className="text-xs text-slate-500">{OPW_ATTRIBUTION}</p>
    </div>
  );
}
