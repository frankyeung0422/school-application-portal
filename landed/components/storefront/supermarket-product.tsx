import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dailyBestHistory } from "@/lib/catalog";
import { buySignal } from "@/lib/passport";
import { hkd, timeAgo } from "@/lib/format";
import { productHistory, rowsFromOffers } from "@/lib/supermarket/view";
import { detectShrinkflation, promoCadence } from "@/lib/supermarket/history";
import { OPW_ATTRIBUTION, RETAILERS, pricesArePublished, retailerName } from "@/lib/supermarket/retailers";
import { approvedReportsFor } from "@/lib/instore/service";
import { publicOrigin } from "@/lib/listings";
import { ReportPrice } from "./report-price";
import { Badge, Notice } from "@/components/ui";
import { PassportChart, ShareButtons, WatchForm } from "./client";
import { AddToBasket } from "./basket";
import { NearestStore } from "./nearest-store";
import { promoTruth, TRUTH_TEXT } from "@/lib/supermarket/promo-truth";
import { promoTruthView } from "@/lib/supermarket/stories";

export async function SupermarketProduct({ productId, customerEmail }: { productId: number; customerEmail?: string }) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { offers: true } });
  const rows = rowsFromOffers(product.offers, product.titleEn);
  const inStock = rows.filter((r) => r.inStock);
  const cheapest = inStock[0];
  const bestDealRow = inStock
    .filter((r) => r.deal)
    .sort((a, b) => a.deal!.unitCents - b.deal!.unitCents)[0];
  const history = await dailyBestHistory(product.id, 90, "SUPERMARKET");
  const reports = await approvedReportsFor(product.id);
  const points = await productHistory(product.id);
  const shrink = detectShrinkflation(points);
  const cadence = promoCadence(points);
  const retailerOptions = RETAILERS.map((code) => ({ code, name: retailerName(code), publishes: pricesArePublished(code) }));
  const passport = buySignal({ dailyBestCents: history.map((h) => h.cents), currentCents: cheapest?.shelfCents ?? 0 });
  // Is this the bigger pack that costs more per unit than a smaller one of the same product?
  const trap = (await promoTruthView()).trapByProduct.get(product.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href={`/supermarket?cat=${encodeURIComponent((product.category ?? "").split(" › ")[0])}`} className="text-xs text-brand-700">
            超市格價 › {product.category}
          </Link>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          {product.titleEn ? <div className="text-sm text-slate-500">{product.titleEn}</div> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <AddToBasket productId={product.id} title={product.title} />
          <ShareButtons title={product.title} url={`${publicOrigin()}/p/${product.slug}`} price={hkd(cheapest?.shelfCents)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="text-sm text-slate-500">買一件最平 Cheapest single unit</div>
          {cheapest ? (
            <>
              <div className="text-4xl font-black tabular-nums text-brand-700">
                <NearestStore retailer={cheapest.retailer} retailerName={retailerName(cheapest.retailer)}>
                  {hkd(cheapest.shelfCents)}
                </NearestStore>
              </div>
              <div className="text-sm">@ {retailerName(cheapest.retailer)} · 掛住個價睇最近分店 hover for the nearest branch</div>
              <div className="mt-1 text-xs text-slate-500">
                查咗 {inStock.length} 間 · 更新 {timeAgo(cheapest.checkedAt)}
              </div>
            </>
          ) : (
            <div className="text-slate-500">暫時冇貨 Out of stock everywhere</div>
          )}
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">買多件最抵 Best multi-buy</div>
          {bestDealRow?.deal ? (
            <>
              <div className="text-4xl font-black tabular-nums text-amber-600">{hkd(bestDealRow.deal.unitCents)}<span className="text-base font-normal text-slate-500"> / 件</span></div>
              <div className="text-sm">
                @ {retailerName(bestDealRow.retailer)}：{bestDealRow.promoZh}（買 {bestDealRow.deal.qty} 件共 {hkd(bestDealRow.deal.totalCents)}）
              </div>
            </>
          ) : (
            <div className="text-slate-500">暫時冇多買優惠 No multi-buy deals right now</div>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>超市 Shop</th><th className="text-right">單件價</th><th className="text-right">單位價 Per unit</th><th>優惠 Promotion</th><th className="text-right">優惠後每件</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.retailer} className={r === cheapest ? "bg-emerald-50" : ""}>
                <td className="whitespace-nowrap">
                  <NearestStore retailer={r.retailer} retailerName={retailerName(r.retailer)}>
                    {retailerName(r.retailer)}
                  </NearestStore>{" "}
                  {r === cheapest ? <Badge tone="green">最平</Badge> : null}
                  {!r.inStock ? <Badge tone="red">冇貨</Badge> : null}
                </td>
                <td className="text-right font-semibold tabular-nums">{hkd(r.shelfCents)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">
                  {r.unit ? (
                    <>
                      {hkd(r.unit.cents)}
                      <div className="text-xs font-normal text-slate-500">{r.unit.labelZh}</div>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="text-sm">
                  {r.promoZh ?? "—"}
                  {r.promoZh && !r.rules.length ? <span className="ml-1 text-xs text-slate-400">（未能自動計算）</span> : null}
                  {r.verdict?.kind === "WORSE" ? (
                    <div className="text-xs font-semibold text-rose-600">
                      按牌面價計唔抵：買 {r.verdict.qty} 件散裝平 {hkd(-r.verdict.savingCents)} — against the listed price, this promo costs more than buying singles
                    </div>
                  ) : null}
                  {r.verdict?.kind === "BETTER" ? (
                    <div className="text-xs text-emerald-700">
                      買 {r.verdict.qty} 件慳 {hkd(r.verdict.savingCents)}
                      {(() => {
                        const t = promoTruth(r.verdict);
                        return t ? ` · ${TRUTH_TEXT[t.label](t)}` : "";
                      })()}
                    </div>
                  ) : null}
                </td>
                <td className="text-right tabular-nums">{r.deal ? `${hkd(r.deal.unitCents)}（買${r.deal.qty}）` : "—"}</td>
                <td>
                  <a className="text-xs text-brand-700 underline" href={`/go/${r.offerId}`} target="_blank" rel="noopener nofollow">
                    消委會資料 ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trap ? (
        <Notice tone="amber">
          <b>大包裝反而貴 Bigger pack, dearer per unit:</b> 喺{retailerName(trap.chain)}，呢個包裝每單位比{" "}
          <Link href={`/p/${trap.small.slug}`} className="underline">{trap.small.title.slice(0, 30)}</Link> 貴 {(trap.dearerBy * 100).toFixed(0)}% — 買細包裝更抵。
        </Notice>
      ) : null}
      {shrink || cadence.verdict !== "NOT_ENOUGH_DATA" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {shrink ? (
            <Notice tone="amber">
              <b>縮水注意 Shrinkflation:</b> 由 {shrink.fromLabel} 變 {shrink.toLabel}（細咗 {Math.round(shrink.shrankBy * 100)}%），
              價錢由 {hkd(shrink.priceThenCents)} 變 {hkd(shrink.priceNowCents)}，即係每單位貴咗 {Math.round(shrink.perUnitRise * 100)}%（{shrink.changedOn}）。
              <div className="mt-1 text-xs">Same shelf, smaller pack: {Math.round(shrink.perUnitRise * 100)}% dearer per unit.</div>
            </Notice>
          ) : null}
          {cadence.verdict !== "NOT_ENOUGH_DATA" ? (
            <Notice tone={cadence.onPromoNow ? "green" : "blue"}>
              <b>減價週期 Promotion cycle:</b> {cadence.explanation}
              {cadence.onPromoNow ? "。而家正在減價。" : cadence.dueInDays != null ? `。上次 ${cadence.daysSinceLastPromo} 日前，${cadence.dueInDays > 0 ? `估計仲有約 ${cadence.dueInDays} 日` : "已經過咗預期時間"}。` : ""}
            </Notice>
          ) : null}
        </div>
      ) : null}

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">門市實價 In-store prices</h2>
          <span className="text-xs text-slate-500">上面嘅價錢係超市網店價；門市價可能唔同。The prices above are the chains&apos; online prices.</span>
        </div>
        {reports.length ? (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold tabular-nums">{hkd(r.priceCents)}</span>
                <span>{retailerName(r.retailer)}{r.branch ? ` · ${r.branch}` : ""}</span>
                <span className="text-xs text-slate-500">{timeAgo(r.seenAt)}見到 · 用戶提供 shopper-reported</span>
                {r.photoPath ? (
                  <a href={`/api/instore/photo/${r.photoPath}`} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">
                    睇價錢牌相 photo ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">未有門市報價。見到實際價錢牌？報俾大家知。No in-store reports yet.</p>
        )}
        <ReportPrice productId={product.id} retailers={retailerOptions} defaultRetailer={cheapest?.retailer} compact />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">價格護照 Price Passport</h2>
            <span className="text-xs text-slate-500">{passport.explanation}</span>
          </div>
          <PassportChart points={history} />
        </div>
        <div className="card space-y-2 p-5">
          <h2 className="font-bold">減價通知 Price-drop alert</h2>
          <p className="text-xs text-slate-500">任何一間超市減到你嘅目標價就通知你。</p>
          <WatchForm productId={product.id} defaultEmail={customerEmail} promo />
        </div>
      </div>
      <p className="text-xs text-slate-500">{OPW_ATTRIBUTION} 優惠唔會疊加，並只按網上價計算。</p>
    </div>
  );
}
