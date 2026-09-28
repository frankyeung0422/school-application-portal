import Link from "next/link";
import { listLuxuryProducts, luxuryBrands } from "@/lib/luxury/view";
import { LUXURY_CATEGORIES, LUXURY_CATEGORY_LABELS, type LuxuryCategory } from "@/lib/luxury/brands";
import { RISK_LABELS } from "@/lib/luxury/risk";
import { hkd, native, pct, timeAgo } from "@/lib/format";
import { officialComparisons, marketLabel } from "@/lib/official/view";
import { countSuspectOffers } from "@/lib/luxury/screen";
import { OFFICIAL_UNAVAILABLE } from "@/lib/official/catalogue";
import { premiumVsOfficial } from "@/lib/official/markets";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const RISK_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function LuxuryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; category?: string; page?: string; suspect?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const showSuspect = sp.suspect === "1";
  const [brands, list, official, suspectTotal] = await Promise.all([
    luxuryBrands(),
    listLuxuryProducts({ q: sp.q, brand: sp.brand, category: sp.category, take: 20, skip: (page - 1) * 20, includeSuspect: showSuspect }),
    officialComparisons(),
    countSuspectOffers(),
  ]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(
      Object.entries({ q: sp.q, brand: sp.brand, category: sp.category, suspect: sp.suspect, ...patch }).filter(([, v]) => v) as [string, string][],
    );
    return `/luxury?${p}`;
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="奢侈品比價 Luxury"
        sub="腕錶、手袋、珠寶、香水 — 比較各平台到手價，同時標明真偽風險。我哋唔會代買奢侈品。"
      />

      <Notice tone="amber">
        <b>睇清楚先好買。</b> 最平嗰個通常就係最似假嘅。高仿泛濫嘅平台（1688、淘寶、速賣通）嘅價錢我哋照顯示，但永遠唔會當成「最平」。
        香港冇進口關稅同增值稅，所以本地行貨本身已經係全球數一數二平，唔好被「平一半」嘅海外報價呃到。
        <div className="mt-1 text-xs">
          Luxury is compared, never fulfilled by us. Prices from platforms with endemic counterfeits are shown but never presented as the cheapest.
        </div>
      </Notice>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">官方定價 Official boutique prices</h2>
          <span className="text-xs text-slate-500">
            直接讀取品牌官網，並非拍賣或第三方報價{official[0]?.capturedAt ? ` · 更新 ${timeAgo(official[0].capturedAt)}` : ""}
          </span>
        </div>
        {official.length ? (
          official.map((o) => (
            <div key={o.reference} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-semibold">{o.title}</span>
                  <span className="ml-2 text-xs text-slate-500">Ref. {o.reference}</span>
                </div>
                {o.comparison.hkSavingCents != null && o.comparison.hkSavingCents > 0 ? (
                  <span className="text-sm font-semibold text-emerald-700">
                    {marketLabel(o.comparison.cheapest!.market)}比香港平 {hkd(o.comparison.hkSavingCents)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">香港已經係最平市場</span>
                )}
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr><th>市場 Market</th><th className="text-right">官方標價</th><th className="text-right">折合港元</th><th className="text-right">實際要俾（連稅／退稅）</th><th>備註</th></tr>
                  </thead>
                  <tbody>
                    {o.comparison.rows.map((r) => (
                      <tr key={r.market} className={r.market === o.comparison.cheapest?.market ? "bg-emerald-50" : ""}>
                        <td className="whitespace-nowrap">{marketLabel(r.market)}</td>
                        <td className="text-right tabular-nums">{native(r.priceNative, r.currency)}</td>
                        <td className="text-right tabular-nums">{hkd(r.stickerHkdCents)}</td>
                        <td className="text-right font-semibold tabular-nums">{hkd(r.effectiveHkdCents)}</td>
                        <td className="text-xs text-slate-500">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {o.missingMarkets.length ? (
                <p className="mt-1 text-xs text-amber-700">未能讀取：{o.missingMarkets.join(", ")} — not published or not readable.</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                跨市場買錶仲要計機票、保養（部分品牌國際聯保）同入境申報。Travel, warranty terms and customs declarations are on top.
              </p>
            </div>
          ))
        ) : (
          <Empty title="未有官方價格 No official prices yet">喺管理頁執行 OFFICIAL_SYNC。Run OFFICIAL_SYNC on /admin/jobs.</Empty>
        )}
        <div className="card p-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">官方價唔公開嘅品牌 Brands that do not publish:</span>
          <ul className="mt-1 list-disc pl-5">
            {OFFICIAL_UNAVAILABLE.map((u) => (
              <li key={u.brand}>
                <b>{u.brand}</b> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">市場放盤 Marketplace listings</h2>
        {suspectTotal > 0 ? (
          <span className="text-sm">
            {showSuspect ? (
              <>
                正顯示 {suspectTotal} 個疑似冒牌放盤 ·{" "}
                <Link href={qs({ suspect: undefined })} className="text-brand-700 underline">隱藏返 Hide them</Link>
              </>
            ) : (
              <>
                已剔除 {suspectTotal} 個「唔可能係真品」嘅放盤 ·{" "}
                <Link href={qs({ suspect: "1" })} className="text-slate-500 underline">睇下係咩 Show what was removed</Link>
              </>
            )}
          </span>
        ) : null}
      </div>
      <form action="/luxury" className="flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="例如：Rolex Submariner、Louis Vuitton Neverfull" className="input text-base" />
        <button className="btn-primary">搜尋</button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link href={qs({ category: undefined, page: undefined })} className={`rounded-full border px-3 py-1 text-sm ${!sp.category ? "border-brand-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>全部類別</Link>
        {LUXURY_CATEGORIES.map((c) => (
          <Link key={c} href={qs({ category: c, page: undefined })} className={`rounded-full border px-3 py-1 text-sm ${sp.category === c ? "border-brand-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            {LUXURY_CATEGORY_LABELS[c as LuxuryCategory]}
          </Link>
        ))}
      </div>
      {brands.length ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={qs({ brand: undefined, page: undefined })} className={!sp.brand ? "font-semibold text-brand-700" : "text-slate-500"}>全部品牌</Link>
          {brands.slice(0, 20).map((b) => (
            <Link key={b.brand} href={qs({ brand: b.brand, page: undefined })} className={sp.brand === b.brand ? "font-semibold text-brand-700" : "text-slate-500 hover:text-slate-800"}>
              {b.brand} <span className="text-xs text-slate-400">{b.count}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {list.items.length ? (
        <div className="space-y-4">
          {list.items.map((row) => (
            <div key={row.product.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.product.brand ? <Badge tone="blue">{row.product.brand}</Badge> : null}
                    <Badge>{LUXURY_CATEGORY_LABELS[row.category]}</Badge>
                  </div>
                  <Link href={`/p/${row.product.slug}`} className="mt-1 block font-medium hover:text-brand-700">{row.product.title}</Link>
                  <div className="text-xs text-slate-400">
                    {row.rows.length} 個來源 · 更新 {timeAgo(row.product.lastPricedAt)}
                    {row.hiddenSuspectCount > 0 && !showSuspect ? (
                      <span className="text-rose-600"> · 已剔除 {row.hiddenSuspectCount} 個疑似冒牌</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  {row.officialHkCents ? (
                    <div className="mb-1 text-xs text-slate-600">
                      官方香港價 <b className="tabular-nums">{hkd(row.officialHkCents)}</b>
                    </div>
                  ) : null}
                  <div className="text-xs text-slate-500">可信來源最平</div>
                  <div className="text-2xl font-black tabular-nums text-brand-700">{hkd(row.bestTrustedCents)}</div>
                  {row.bestTrustedPlatform ? (
                    <div className="text-xs text-slate-500">{PLATFORM_LABELS[row.bestTrustedPlatform as Platform] ?? row.bestTrustedPlatform}</div>
                  ) : (
                    <div className="text-xs text-rose-600">冇低風險來源</div>
                  )}
                  {row.cheapestAnyCents != null && row.bestTrustedCents != null && row.cheapestAnyCents < row.bestTrustedCents ? (
                    <div className="mt-1 text-xs text-rose-600">另有 {hkd(row.cheapestAnyCents)} 嘅高風險報價</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {row.rows.map((r) => (
                  <div key={r.offer.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                    <span className="w-28 shrink-0 text-xs text-slate-500">{PLATFORM_LABELS[r.offer.platform as Platform] ?? r.offer.platform}</span>
                    <span className="w-24 shrink-0 font-semibold tabular-nums">{hkd(r.landedCents)}</span>
                    <Badge tone={RISK_TONE[r.risk.level]}>{RISK_LABELS[r.risk.level]}</Badge>
                    {row.officialHkCents ? (
                      (() => {
                        const p = premiumVsOfficial(r.landedCents, row.officialHkCents!);
                        return (
                          <span className={`w-28 shrink-0 text-xs ${p > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            {p > 0 ? `貴官方 ${pct(p, 0)}` : `平官方 ${pct(-p, 0)}`}
                          </span>
                        );
                      })()
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-500" title={r.risk.reasons.join(" · ")}>{r.risk.reasons[0]}</span>
                    <a className="text-xs text-brand-700 underline" href={`/go/${r.offer.id}`} target="_blank" rel="noopener nofollow sponsored">去睇 ↗</a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title={brands.length ? "搵唔到 No matches" : "未有奢侈品數據 No luxury listings yet"}>
          {brands.length
            ? "試下搜尋型號，例如 126610LN。"
            : "喺管理頁撳「載入奢侈品比價」抓取精選型號，或者直接喺搜尋輸入品牌型號。Admin → Jobs → Load luxury searches."}
        </Empty>
      )}

      <div className="flex justify-between">
        {page > 1 ? <Link className="btn-secondary" href={qs({ page: String(page - 1) })}>← 上一頁</Link> : <span />}
        {page * 20 < list.total ? <Link className="btn-secondary" href={qs({ page: String(page + 1) })}>下一頁 →</Link> : null}
      </div>

      <div className="card space-y-2 p-5 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">買奢侈品之前 Before you buy</h2>
        <p>1. 平過市場中位數 45% 以上嘅「正品」極罕有 — 我哋會標紅。A price far below the market median is the clearest counterfeit signal.</p>
        <p>2. eBay 對合資格腕錶／手袋／珠寶有真偽鑑定（Authenticity Guarantee），留意上架有冇個標誌。</p>
        <p>3. Amazon 睇清楚係咪「Ships from and sold by Amazon」或者品牌官方店。</p>
        <p>4. 香港免關稅：本地授權行貨連保養通常同海外差距唔大，仲有本地保修。</p>
        <p>5. 二手／水貨可能冇原廠保養，跨境退貨亦好麻煩。</p>
      </div>
    </div>
  );
}
