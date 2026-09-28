"use client";

import { useEffect, useState } from "react";
import type { Deal } from "@/lib/deals/service";

// Location stays in this browser tab: it is sent only as query parameters to
// /api/food/near and /api/stores/near for that one request, never stored.

const money = (cents: number | null | undefined) => (cents == null ? "—" : `HK$${(cents / 100).toLocaleString("en-HK", { maximumFractionDigits: 1 })}`);

interface Place {
  id: string;
  name: string;
  rating: number | null;
  reviews: number | null;
  priceBand: string | null;
  priceApprox: boolean;
  cuisine: string | null;
  address: string | null;
  openNow: boolean | null;
  mapsUrl: string;
  metres: number;
  walkMin: number;
  goodValue: boolean;
}

interface FoodResponse {
  places: Place[];
  source: "SERPAPI" | "OSM" | "FIXTURE";
  fetchedAt: string;
  attribution: string;
  note: string | null;
  error?: string;
}

interface Branch {
  name: string;
  distance: string;
  walkMinutes: number;
  mapsUrl: string;
}

type Point = { lat: number; lng: number; label: string };

export function NearbyPanel({
  deals,
  districts,
  cuisines,
}: {
  deals: Deal[];
  districts: { code: string; zh: string; en: string; lat: number; lng: number }[];
  cuisines: { code: string; zh: string }[];
}) {
  const [point, setPoint] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState("");
  const [maxWalk, setMaxWalk] = useState(10);
  const [maxPrice, setMaxPrice] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [food, setFood] = useState<FoodResponse | null>(null);
  const [loadingFood, setLoadingFood] = useState(false);
  const [branches, setBranches] = useState<Record<string, Branch | null>>({});

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("呢個瀏覽器唔支援定位，請揀地區。Location is not available — pick a district.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "你而家嘅位置 Your location" });
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "你冇俾定位權限 — 請揀地區。Location permission denied — pick a district instead."
            : "暫時定唔到位 — 請揀地區。Could not get your location — pick a district.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  useEffect(() => {
    if (!point) return;
    let stop = false;
    const qs = new URLSearchParams({ lat: String(point.lat), lng: String(point.lng), cuisine, maxWalk: String(maxWalk), ...(maxPrice ? { maxPrice: String(maxPrice) } : {}), ...(openNow ? { openNow: "1" } : {}) });
    // Loading flag flips inside the async task so the effect body stays side-effect free.
    const run = async () => {
      setLoadingFood(true);
      try {
        const r = await fetch(`/api/food/near?${qs}`, { cache: "no-store" });
        const j = (await r.json()) as FoodResponse;
        if (!stop) setFood(j);
      } catch {
        if (!stop) setFood({ places: [], source: "OSM", fetchedAt: new Date().toISOString(), attribution: "", note: null, error: "網絡錯誤 Network error" });
      } finally {
        if (!stop) setLoadingFood(false);
      }
    };
    void run();
    return () => {
      stop = true;
    };
  }, [point, cuisine, maxWalk, maxPrice, openNow]);

  useEffect(() => {
    if (!point) return;
    let stop = false;
    const retailers = [...new Set(deals.map((d) => d.retailer).filter((r): r is string => Boolean(r)))];
    void Promise.all(
      retailers.map(async (retailer) => {
        const r = await fetch(`/api/stores/near?${new URLSearchParams({ lat: String(point.lat), lng: String(point.lng), retailer })}`, { cache: "no-store" });
        const j = r.ok ? ((await r.json()) as { stores: Branch[] }) : { stores: [] };
        return [retailer, j.stores[0] ?? null] as const;
      }),
    ).then((pairs) => {
      if (!stop) setBranches(Object.fromEntries(pairs));
    });
    return () => {
      stop = true;
    };
  }, [point, deals]);

  return (
    <div className="space-y-8">
      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={locate} disabled={locating} className="btn-primary">
            {locating ? "定位中… Locating" : "📍 用我位置 Use my location"}
          </button>
          <span className="text-sm text-slate-500">或者揀地區 or pick a district:</span>
          <select
            aria-label="地區 District"
            className="input w-auto"
            value=""
            onChange={(e) => {
              const d = districts.find((x) => x.code === e.target.value);
              if (d) setPoint({ lat: d.lat, lng: d.lng, label: `${d.zh} ${d.en}` });
            }}
          >
            <option value="">— 地區 District —</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.zh} {d.en}</option>
            ))}
          </select>
        </div>
        {geoError ? <p className="text-sm text-amber-700" role="alert">{geoError}</p> : null}
        {point ? <p className="text-sm text-slate-600">位置 Location: <b>{point.label}</b></p> : null}
        <p className="text-xs text-slate-400">你嘅位置只會用嚟計今次嘅距離，唔會儲存。Your location is used for this request only and never stored.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">🍜 附近抵食 Cheap eats nearby</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <select aria-label="菜式 Cuisine" className="input w-auto" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            {cuisines.map((c) => (
              <option key={c.code} value={c.code}>{c.zh}</option>
            ))}
          </select>
          <select aria-label="步行時間 Walking time" className="input w-auto" value={maxWalk} onChange={(e) => setMaxWalk(Number(e.target.value))}>
            {[5, 10, 15, 20].map((m) => (
              <option key={m} value={m}>行 {m} 分鐘內</option>
            ))}
          </select>
          <select aria-label="每位預算 Budget per head" className="input w-auto" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
            <option value={0}>每位不限 Any budget</option>
            {[50, 80, 120, 200].map((p) => (
              <option key={p} value={p}>每位 HK${p} 以內</option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} /> 而家營業 Open now
          </label>
        </div>

        {!point ? (
          <div className="card p-6 text-center text-sm text-slate-500">用你嘅位置或者揀地區，睇附近又平又好食嘅餐廳。Share a location or pick a district.</div>
        ) : loadingFood && !food ? (
          <div className="card p-6 text-center text-sm text-slate-500">搵緊附近餐廳… Finding places nearby</div>
        ) : food?.error ? (
          <div className="card p-6 text-center text-sm text-rose-700">{food.error}</div>
        ) : food ? (
          <>
            {food.source === "FIXTURE" ? (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"><b>示範數據 Demo data</b> — 餐廳名、評分同價錢都係虛構。</p>
            ) : null}
            {food.source === "OSM" ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                只有餐廳位置（OpenStreetMap），冇評分同價錢，所以唔會標「抵食」。設定 SERPAPI_KEY 就有 Google 地圖評分同價錢。
              </p>
            ) : null}
            {food.note ? <p className="text-xs text-amber-700">{food.note}</p> : null}
            {food.places.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {food.places.map((p) => (
                  <li key={p.id} className={`card p-4 ${p.goodValue ? "border-emerald-400" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-slate-500">{[p.cuisine, p.address].filter(Boolean).join(" · ")}</div>
                      </div>
                      {p.goodValue ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">抵食 Good value</span> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      <span>{p.rating != null ? `★ ${p.rating.toFixed(1)}${p.reviews ? `（${p.reviews.toLocaleString()}）` : ""}` : "未有評分"}</span>
                      <span>{p.priceBand ? `每位 ${p.priceBand}${p.priceApprox ? "（約）" : ""}` : "未有價錢"}</span>
                      <span>🚶 {p.walkMin} 分鐘（{p.metres < 950 ? `${Math.round(p.metres / 10) * 10} 米` : `${(p.metres / 1000).toFixed(1)} 公里`}）</span>
                      {p.openNow === true ? <span className="text-emerald-700">營業中</span> : p.openNow === false ? <span className="text-rose-700">休息中</span> : null}
                    </div>
                    <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand-700 underline">地圖 Map →</a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card p-6 text-center text-sm text-slate-500">呢個範圍搵唔到符合條件嘅餐廳 — 試下放寬步行時間或預算。</div>
            )}
            <p className="text-xs text-slate-400">
              「抵食」= 至少 20 則評價、經調整評分 4.0 或以上、每位中位價 HK$120 以內。評分已按評價數量調整，少評價唔會靠一兩個五星排頭。{food.attribution}
            </p>
          </>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">🛒 而家抵買 Worth buying now</h2>
        <p className="text-sm text-slate-500">
          只列有證據嘅：比自己過去價錢中位數平 15% 以上、比 3 間或以上連鎖店中位數平 20% 以上，或者減價周期顯示錯過要等好耐。Only items with evidence.
        </p>
        {deals.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {deals.map((d) => {
              const branch = d.retailer ? branches[d.retailer] : undefined;
              return (
                <li key={d.productId} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <a href={`/p/${d.slug}`} className="font-semibold text-brand-700 hover:underline">{d.title}</a>
                    <span className="whitespace-nowrap text-lg font-black tabular-nums">{money(d.priceCents)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{d.segment === "SUPERMARKET" ? `超市 · ${d.retailerName}` : "網購到手價 Online, landed"}</div>
                  <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                    {d.reasons.map((r) => (
                      <li key={r.kind}>✓ {r.text}</li>
                    ))}
                  </ul>
                  {d.retailer && point ? (
                    branch ? (
                      <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-slate-600 underline">
                        📍 最近{d.retailerName}：{branch.name} · {branch.distance} · 行 {branch.walkMinutes} 分鐘
                      </a>
                    ) : branch === null ? (
                      <p className="mt-2 text-xs text-slate-400">附近搵唔到{d.retailerName}分店紀錄</p>
                    ) : null
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-500">
            而家未有夠證據嘅抵買貨品。價格紀錄累積幾個星期之後，呢度會自動出現。No item has enough evidence yet — this fills in as price history builds up.
          </div>
        )}
      </section>
    </div>
  );
}
