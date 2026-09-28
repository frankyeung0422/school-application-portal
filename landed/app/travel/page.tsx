import Link from "next/link";
import { SearchPoller } from "@/components/storefront/client";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";
import { cheapestClaim } from "@/lib/claims";
import { hkd, timeAgo } from "@/lib/format";
import { PLACES, placeByCode, placeLabel } from "@/lib/travel/places";
import { filterFlights, filterHotels, formatDuration } from "@/lib/travel/rank";
import { requestTravelSearch, travelResults } from "@/lib/travel/service";
import { PARTNER_LABEL, partnerEnv, partnersFor } from "@/lib/travel/partners";
import {
  CABINS,
  CABIN_LABELS,
  addDays,
  hkToday,
  hotelQueryText,
  nightsBetween,
  parseFlightParams,
  parseHotelParams,
  type FlightDetails,
  type HotelDetails,
  type TravelParams,
} from "@/lib/travel/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function TravelPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab === "hotels" ? "hotels" : "flights";
  const today = hkToday();
  const submitted = tab === "flights" ? Boolean(sp.to) : Boolean(sp.city);
  const parsed = submitted ? (tab === "flights" ? parseFlightParams(sp, today) : parseHotelParams(sp, today)) : null;
  const request = parsed?.ok ? await requestTravelSearch(parsed.params) : null;

  return (
    <div className="space-y-6">
      <PageTitle
        title="機票酒店 Flights & hotels"
        sub="搵最平嘅機票同酒店 — 以全程總價（所有乘客、所有晚數、連稅）排序，然後帶你去航空公司或訂房網站自己訂。我哋唔代訂。"
      />

      <div className="flex gap-2" role="tablist">
        {(["flights", "hotels"] as const).map((t) => (
          <Link
            key={t}
            href={`/travel?tab=${t}`}
            role="tab"
            aria-selected={tab === t}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {t === "flights" ? "✈ 機票 Flights" : "🏨 酒店 Hotels"}
          </Link>
        ))}
      </div>

      <datalist id="places">
        {PLACES.map((p) => (
          <option key={p.code} value={p.nameZh} label={`${p.name} (${p.code})`} />
        ))}
      </datalist>

      {tab === "flights" ? <FlightForm sp={sp} today={today} /> : <HotelForm sp={sp} today={today} />}

      {parsed && !parsed.ok ? <Notice tone="red">{parsed.error}</Notice> : null}

      {request?.quotaExhausted ? (
        <Notice tone="amber">
          本月即時查價額度已用完，{request.searchId ? "以下係較早前查到嘅價錢" : "暫時未能查價"}。
          This month&apos;s live-search budget is used up{request.searchId ? " — showing earlier results" : ""}.
        </Notice>
      ) : null}

      {request?.jobId ? <SearchPoller jobId={request.jobId} platforms={[tab === "flights" ? "Google Flights" : "Google Hotels"]} /> : null}

      {request?.searchId && parsed?.ok ? (
        parsed.params.kind === "FLIGHT" ? (
          <FlightResults searchId={request.searchId} params={parsed.params} nonstop={sp.nonstop === "1"} />
        ) : (
          <HotelResults searchId={request.searchId} params={parsed.params} minRating={Number(sp.minRating) || 0} />
        )
      ) : !submitted ? (
        <Empty title={tab === "flights" ? "揀目的地同日期開始比較 Pick a destination and dates" : "揀城市同日期開始比較 Pick a city and dates"}>
          試下「東京」「曼谷」「Seoul」— 打錯字或者簡體都搵到。
        </Empty>
      ) : null}
    </div>
  );
}

function FlightForm({ sp, today }: { sp: SP; today: string }) {
  const depart = sp.depart ?? addDays(today, 14);
  return (
    <form action="/travel" className="card grid gap-3 p-4 sm:grid-cols-6">
      <input type="hidden" name="tab" value="flights" />
      <label className="text-sm sm:col-span-1">
        出發 From
        <input name="from" defaultValue={sp.from ?? "香港"} list="places" required className="input mt-1" />
      </label>
      <label className="text-sm sm:col-span-2">
        目的地 To
        <input name="to" defaultValue={sp.to ?? ""} list="places" required placeholder="東京 / Bangkok / TPE" className="input mt-1" />
      </label>
      <label className="text-sm">
        去程 Depart
        <input type="date" name="depart" defaultValue={depart} min={today} required className="input mt-1" />
      </label>
      <label className="text-sm">
        回程 Return（可留空）
        <input type="date" name="return" defaultValue={sp.return ?? ""} min={today} className="input mt-1" />
      </label>
      <label className="text-sm">
        乘客 Adults
        <input type="number" name="adults" defaultValue={sp.adults ?? "1"} min={1} max={9} className="input mt-1" />
      </label>
      <label className="text-sm sm:col-span-2">
        艙位 Cabin
        <select name="cabin" defaultValue={sp.cabin ?? "ECONOMY"} className="input mt-1">
          {CABINS.map((c) => (
            <option key={c} value={c}>{CABIN_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 self-end text-sm sm:col-span-2">
        <input type="checkbox" name="nonstop" value="1" defaultChecked={sp.nonstop === "1"} /> 只要直航 Nonstop only
      </label>
      <button className="btn-primary self-end sm:col-span-2">搵最平機票</button>
    </form>
  );
}

function HotelForm({ sp, today }: { sp: SP; today: string }) {
  const checkin = sp.checkin ?? addDays(today, 14);
  return (
    <form action="/travel" className="card grid gap-3 p-4 sm:grid-cols-6">
      <input type="hidden" name="tab" value="hotels" />
      <label className="text-sm sm:col-span-2">
        城市／地區 City or area
        <input name="city" defaultValue={sp.city ?? ""} list="places" required placeholder="東京 / 新宿 / Bangkok" className="input mt-1" />
      </label>
      <label className="text-sm">
        入住 Check-in
        <input type="date" name="checkin" defaultValue={checkin} min={today} required className="input mt-1" />
      </label>
      <label className="text-sm">
        退房 Check-out
        <input type="date" name="checkout" defaultValue={sp.checkout ?? addDays(checkin, 2)} min={today} required className="input mt-1" />
      </label>
      <label className="text-sm">
        人數 Adults
        <input type="number" name="adults" defaultValue={sp.adults ?? "2"} min={1} max={9} className="input mt-1" />
      </label>
      <label className="text-sm">
        最低評分 Min rating
        <select name="minRating" defaultValue={sp.minRating ?? ""} className="input mt-1">
          <option value="">不限 Any</option>
          <option value="3.5">3.5+</option>
          <option value="4">4.0+</option>
          <option value="4.5">4.5+</option>
        </select>
      </label>
      <button className="btn-primary sm:col-span-6 sm:justify-self-end">搵最平酒店</button>
    </form>
  );
}

function SourceLine({ source, fetchedAt, count, searchUrl, kind, searchId }: { source: string | null; fetchedAt: Date | null; count: number; searchUrl: string | null; kind: TravelParams["kind"]; searchId: number }) {
  const google = kind === "FLIGHT" ? "Google Flights" : "Google Hotels";
  const partners = partnersFor(kind, partnerEnv());
  return (
    <div className="space-y-2">
      {source === "FIXTURE" ? (
        <Notice tone="blue">
          <b>示範數據 Demo data</b> — 未設定 SERPAPI_KEY，以下航空公司／酒店同價錢都係虛構，只供示範。Set SERPAPI_KEY for live {google} prices.
        </Notice>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        {fetchedAt && count ? <span className="font-semibold text-emerald-700">{cheapestClaim(count, fetchedAt)}</span> : <span />}
        <span className="text-xs text-slate-500">
          價錢來源 {google}{source === "SERPAPI" ? "（經 SerpApi）" : ""} · 更新 {timeAgo(fetchedAt)}
          {searchUrl ? (
            <>
              {" · "}
              <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="underline">喺 {google} 睇全部</a>
            </>
          ) : null}
        </span>
      </div>
      {partners.length ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>同一行程再比較 Compare the same trip on:</span>
          {partners.map((p) => (
            <a key={p} href={`/go/travel/partner/${searchId}?p=${p}`} target="_blank" rel="noopener noreferrer sponsored" className="btn-secondary py-1 text-xs">
              {PARTNER_LABEL[p]} ↗
            </a>
          ))}
          <span>聯盟連結：經此預訂我哋或會收佣金，價錢由對方網站決定。Affiliate links — the partner sets its own prices.</span>
        </div>
      ) : null}
    </div>
  );
}

async function FlightResults({ searchId, params, nonstop }: { searchId: number; params: Extract<TravelParams, { kind: "FLIGHT" }>; nonstop: boolean }) {
  const view = await travelResults<FlightDetails>(searchId);
  if (!view) return null;
  const { search } = view;
  const quotes = filterFlights(view.quotes, { nonstopOnly: nonstop });
  const to = placeByCode(params.to);
  const from = placeByCode(params.from);
  if (search.status === "FAILED" && !view.quotes.length) {
    return <Empty title="查價失敗 Search failed">{search.error ?? "請稍後再試 Try again later"}</Empty>;
  }
  if (!view.quotes.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">
        {from ? placeLabel(from) : params.from} → {to ? placeLabel(to) : params.to}
        <span className="ml-2 text-sm font-normal text-slate-500">
          {params.depart}{params.return ? ` – ${params.return} 來回` : " 單程"} · {params.adults} 位 · {CABIN_LABELS[params.cabin]}
        </span>
      </h2>
      <SourceLine source={search.source} fetchedAt={search.fetchedAt} count={view.quotes.length} searchUrl={search.searchUrl} kind="FLIGHT" searchId={search.id} />
      <Notice tone="amber">
        價錢係 {params.adults} 位乘客嘅{params.return ? "來回" : "單程"}總價（連稅及附加費），機票價隨時變，以航空公司結帳頁為準。
        標明「寄艙行李另收費」嘅票價未包行李。Fares change often; the airline&apos;s checkout is final. Bags may cost extra.
      </Notice>
      {quotes.length ? (
        quotes.map((q, i) => {
          const d = q.details;
          const first = d.legs[0];
          const last = d.legs[d.legs.length - 1];
          return (
            <div key={q.id} className={`card flex flex-wrap items-center gap-4 p-4 ${i === 0 ? "border-emerald-400" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{q.provider}</div>
                <div className="text-sm tabular-nums">
                  {first.depart.slice(11)} {first.from} → {last.arrive.slice(11)} {last.to}
                  <span className="ml-2 text-slate-500">{formatDuration(d.durationMin)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.stops === 0 ? <Badge tone="green">直航 Nonstop</Badge> : <Badge>轉機 {d.stops} 次{d.layovers.length ? ` · ${d.layovers.join(", ")}` : ""}</Badge>}
                  {d.bags === "EXTRA" ? <Badge tone="amber">寄艙行李另收費 Bags extra</Badge> : null}
                  {d.overnight ? <Badge tone="blue">跨夜 Overnight</Badge> : null}
                  {params.return ? <Badge>來回總價 · 顯示去程</Badge> : null}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black tabular-nums">{hkd(q.totalHkdCents)}</div>
                {params.adults > 1 ? <div className="text-xs text-slate-500">每位約 {hkd(Math.round(q.totalHkdCents / params.adults))}</div> : null}
                <a href={`/go/travel/${q.id}`} target="_blank" rel="noopener noreferrer" className="btn-primary mt-2 inline-block text-sm">去訂 Book →</a>
              </div>
            </div>
          );
        })
      ) : (
        <Empty title="冇直航選擇 No nonstop options">取消「只要直航」睇埋轉機航班。</Empty>
      )}
    </section>
  );
}

async function HotelResults({ searchId, params, minRating }: { searchId: number; params: Extract<TravelParams, { kind: "HOTEL" }>; minRating: number }) {
  const view = await travelResults<HotelDetails>(searchId);
  if (!view) return null;
  const { search } = view;
  const quotes = filterHotels(view.quotes, { minRating });
  const nights = nightsBetween(params.checkIn, params.checkOut);
  if (search.status === "FAILED" && !view.quotes.length) {
    return <Empty title="查價失敗 Search failed">{search.error ?? "請稍後再試 Try again later"}</Empty>;
  }
  if (!view.quotes.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">
        {placeByCode(params.place) ? placeLabel(placeByCode(params.place)!) : hotelQueryText(params)}
        <span className="ml-2 text-sm font-normal text-slate-500">
          {params.checkIn} – {params.checkOut} · {nights} 晚 · {params.adults} 位
        </span>
      </h2>
      <SourceLine source={search.source} fetchedAt={search.fetchedAt} count={view.quotes.length} searchUrl={search.searchUrl} kind="HOTEL" searchId={search.id} />
      <Notice tone="amber">
        價錢係成個住宿嘅總價。標明「估算」嘅係每晚價 × 晚數，未必包稅同服務費；最終以訂房網站結帳頁為準。
        Totals marked &quot;estimated&quot; are nightly × nights and may exclude taxes and fees.
      </Notice>
      {quotes.length ? (
        quotes.map((q, i) => {
          const d = q.details;
          return (
            <div key={q.id} className={`card flex flex-wrap items-center gap-4 p-4 ${i === 0 ? "border-emerald-400" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{q.provider}</div>
                <div className="text-sm text-slate-600">
                  {d.stars ? `${"★".repeat(Math.round(d.stars))} ` : ""}
                  {d.rating != null ? `評分 ${d.rating.toFixed(1)}` : "未有評分"}
                  {d.reviews ? `（${d.reviews.toLocaleString()} 則評價）` : ""}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.totalEstimated ? <Badge tone="amber">估算總價 Estimated</Badge> : null}
                  {d.taxesIncluded ? <Badge tone="green">含稅 Taxes in</Badge> : <Badge>未必含稅 Taxes may be extra</Badge>}
                  {d.amenities.slice(0, 3).map((a) => (
                    <Badge key={a}>{a}</Badge>
                  ))}
                </div>
                {d.sellers.length > 1 ? (
                  <div className="mt-1 text-xs text-slate-500">
                    每晚：{d.sellers.map((s) => `${s.source} ${hkd(s.nightlyHkdCents)}`).join(" · ")}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xl font-black tabular-nums">{hkd(q.totalHkdCents)}</div>
                <div className="text-xs text-slate-500">{nights} 晚 · 每晚約 {hkd(d.nightlyHkdCents)}</div>
                <a href={`/go/travel/${q.id}`} target="_blank" rel="noopener noreferrer" className="btn-primary mt-2 inline-block text-sm">去訂 Book →</a>
              </div>
            </div>
          );
        })
      ) : (
        <Empty title="冇符合評分嘅酒店 No hotels at that rating">降低最低評分再試。</Empty>
      )}
    </section>
  );
}
