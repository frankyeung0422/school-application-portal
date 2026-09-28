import Link from "next/link";
import { approvedReportsByRetailer, monthlyLeaderboard } from "@/lib/instore/service";
import { DETECTIVE_BADGE_AT } from "@/lib/instore/leaderboard";
import { RETAILERS, REPORT_ONLY_RETAILERS, pricesArePublished, retailerName } from "@/lib/supermarket/retailers";
import { hkd, timeAgo } from "@/lib/format";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";
import { ReportPrice } from "@/components/storefront/report-price";

export const dynamic = "force-dynamic";

export default async function InStorePage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const { shop } = await searchParams;
  const [reports, board] = await Promise.all([
    approvedReportsByRetailer(shop && RETAILERS.includes(shop as never) ? shop : undefined),
    monthlyLeaderboard(),
  ]);
  const options = RETAILERS.map((code) => ({ code, name: retailerName(code), publishes: pricesArePublished(code) }));

  return (
    <div className="space-y-6">
      <PageTitle
        title="門市實價 In-store prices"
        sub="超市網店價同門市價可以唔同，而且有啲連鎖店（優之良品、優品360、759阿信屋）根本冇公開任何價錢。呢度嘅價錢全部由買家喺舖頭見到之後報上嚟。"
      />
      <Notice tone="blue">
        每個報價都經人手核實先公開，並會標明「用戶提供」同見到嘅日期；有價錢牌相會一齊顯示。我哋唔會將呢啲價錢當成官方價或者計入比價排名。
        <div className="mt-1 text-xs">
          Shopper-reported, human-checked, always labelled and dated — never mixed into the online-price ranking.
        </div>
      </Notice>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">報一個價 Report a price</h2>
          <ReportPrice retailers={options} />
        </div>
        <div className="card p-5">
          <h2 className="font-bold">🕵️ 本月價格偵探 This month&apos;s price detectives</h2>
          <p className="mb-2 text-xs text-slate-500">核實咗嘅報價先計；本月 {DETECTIVE_BADGE_AT} 個或以上有「價格偵探」徽章。留低電郵可以喺度見到自己（只顯示頭兩個字）。</p>
          {board.entries.length ? (
            <ol className="space-y-1 text-sm">
              {board.entries.map((e, i) => (
                <li key={e.handle} className="flex items-center justify-between gap-2">
                  <span>
                    {i + 1}. {e.handle} {e.detective ? <Badge tone="green">價格偵探</Badge> : null}
                  </span>
                  <span className="tabular-nums text-slate-500">{e.approved}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">今個月仲未有 — 做第一個！Be the first this month.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/instore" className={!shop ? "font-semibold text-brand-700" : "text-slate-500"}>全部店舖</Link>
        {options.map((o) => (
          <Link key={o.code} href={`/instore?shop=${o.code}`} className={shop === o.code ? "font-semibold text-brand-700" : "text-slate-500 hover:text-slate-800"}>
            {o.name}
            {(REPORT_ONLY_RETAILERS as readonly string[]).includes(o.code) ? " ★" : ""}
          </Link>
        ))}
      </div>
      <p className="text-xs text-slate-500">★ = 冇公開網上價，只靠買家報價 no published online prices; shopper reports only.</p>

      {reports.length ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>貨品 Item</th><th>店舖</th><th className="text-right">價錢</th><th>分店</th><th>幾時</th><th>相</th></tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-sm">
                    {r.product ? (
                      <Link href={`/p/${r.product.slug}`} className="text-brand-700 underline">{r.product.title}</Link>
                    ) : (
                      r.itemName
                    )}
                  </td>
                  <td className="whitespace-nowrap">{retailerName(r.retailer)}</td>
                  <td className="text-right font-semibold tabular-nums">{hkd(r.priceCents)}</td>
                  <td className="text-xs">{r.branch ?? "—"}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{timeAgo(r.seenAt)}</td>
                  <td>
                    {r.photoPath ? (
                      <a href={`/api/instore/photo/${r.photoPath}`} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">睇相 ↗</a>
                    ) : (
                      <Badge>冇相</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="未有已核實嘅門市報價 No approved in-store reports yet">第一個報價嘅就係你。Be the first to report one.</Empty>
      )}
    </div>
  );
}
