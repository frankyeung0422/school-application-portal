import Link from "next/link";
import type { Metadata } from "next";
import { priceIndex } from "@/lib/supermarket/stories";
import { weekChange } from "@/lib/supermarket/basket-index";
import { OPW_ATTRIBUTION, retailerName } from "@/lib/supermarket/retailers";
import { hkd } from "@/lib/format";
import { publicOrigin } from "@/lib/listings";
import { Badge, Empty, PageTitle } from "@/components/ui";
import { ShareButtons } from "@/components/storefront/client";
import { ChannelCta } from "@/components/storefront/channel-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "到手價超市指數 — 同一籃貨，邊間超市最平？| 到手價 Landed",
  description: "每星期用同一籃日用品比較百佳、惠康、Market Place、AEON 嘅總價。只計四間都有售嘅貨品，數據來自消委會網上價格一覽。",
};

const pctText = (x: number | null) => (x == null ? "—" : `${x > 0 ? "▲" : x < 0 ? "▼" : ""}${Math.abs(x * 100).toFixed(1)}%`);

export default async function PriceIndexPage() {
  const view = await priceIndex(12);
  const weeks = view.weeks.slice(-6);
  const latest = weeks[weeks.length - 1];
  const latestTotals = latest?.chains.filter((c) => c.totalCents != null).sort((a, b) => a.totalCents! - b.totalCents!) ?? [];
  const cheapest = latestTotals[0];
  const dearest = latestTotals[latestTotals.length - 1];
  const share = cheapest ? `本週同一籃 ${view.basket.length} 件日用品：${retailerName(cheapest.chain)} 最平 ${hkd(cheapest.totalCents)}` : "到手價超市指數";

  return (
    <div className="space-y-6">
      <PageTitle
        title="到手價超市指數 Basket index"
        sub={<>同一籃 {view.basket.length} 件日用品，每星期喺四間超市嘅總價。只計四間都有售嘅貨品；某間超市嗰星期缺貨就唔排名，唔會因為「冇得賣」而顯得平。</>}
        right={<ShareButtons title={share} url={`${publicOrigin()}/price-index`} price={cheapest ? hkd(cheapest.totalCents) : ""} />}
      />

      {!latest ? (
        <Empty title="數據累積中 Collecting data">超市價格每日同步；第一個星期嘅數據齊咗就會出指數。</Empty>
      ) : (
        <>
          {cheapest && dearest && cheapest.chain !== dearest.chain ? (
            <div className="card flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <div className="text-xs text-slate-500">本週最平 Cheapest this week（{latest.week} 起）</div>
                <div className="text-2xl font-black text-brand-700">{retailerName(cheapest.chain)} {hkd(cheapest.totalCents)}</div>
              </div>
              <div className="text-sm text-slate-600">
                比最貴嘅 {retailerName(dearest.chain)} 平 <b>{hkd(dearest.totalCents! - cheapest.totalCents!)}</b>
                （{((1 - cheapest.totalCents! / dearest.totalCents!) * 100).toFixed(1)}%）
              </div>
            </div>
          ) : null}

          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>超市 Chain</th>
                  {weeks.map((w) => (
                    <th key={w.week} className="text-right">{w.week.slice(5)} 週</th>
                  ))}
                  <th className="text-right">按週變化</th>
                </tr>
              </thead>
              <tbody>
                {latest.chains.map(({ chain }) => (
                  <tr key={chain}>
                    <td className="font-medium">{retailerName(chain)}</td>
                    {weeks.map((w) => {
                      const c = w.chains.find((x) => x.chain === chain)!;
                      return (
                        <td key={w.week} className="text-right tabular-nums">
                          {c.totalCents != null ? (
                            <span className={w.cheapest === chain ? "font-bold text-brand-700" : ""}>{hkd(c.totalCents)}</span>
                          ) : (
                            <span className="text-xs text-slate-400" title="嗰星期未有齊全部貨品嘅價錢">缺 {view.basket.length - c.priced} 件</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-right tabular-nums text-sm">{pctText(weekChange(view.weeks, chain))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">
              每件貨品每星期取嗰間超市每日價錢嘅中位數（一日嘅錯價唔會影響指數）。未計「買2件」等多件優惠。{view.since ? `數據由 ${view.since} 起。` : ""}
            </p>
          </div>

          <div className="card">
            <h2 className="mb-2 font-semibold">籃入面有咩 What is in the basket</h2>
            <div className="flex flex-wrap gap-2">
              {view.basket.map((p) => (
                <Link key={p.id} href={`/p/${p.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm hover:border-brand-500">
                  {p.category ? <Badge>{p.category}</Badge> : null} {p.title.slice(0, 40)}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
      <ChannelCta />
      <p className="text-xs text-slate-500">{OPW_ATTRIBUTION}</p>
    </div>
  );
}
