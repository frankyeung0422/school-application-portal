"use client";

import { useCallback, useRef, useState } from "react";

// Hover (or tap) a price to see the nearest branch of that chain.
//
// Location is only requested after an explicit click — never on hover alone —
// is kept in sessionStorage for the visit, and is sent to our own API only to
// find shops. Nothing about a visitor's position is stored server-side.

const POS_KEY = "landed.pos.v1";

interface Store {
  name: string;
  address: string | null;
  distance: string;
  walkMinutes: number;
  mapsUrl: string;
}

interface NearResponse {
  stores: Store[];
  known: number;
  attribution: string;
  error?: string;
}

function cachedPosition(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem(POS_KEY);
    return raw ? (JSON.parse(raw) as { lat: number; lng: number }) : null;
  } catch {
    return null;
  }
}

export function NearestStore({ retailer, retailerName, children }: { retailer: string; retailerName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [state, setState] = useState<"idle" | "locating" | "loading" | "done" | "denied" | "error">("idle");
  const [data, setData] = useState<NearResponse | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (pos: { lat: number; lng: number }) => {
      setState("loading");
      try {
        const res = await fetch(`/api/stores/near?lat=${pos.lat}&lng=${pos.lng}&retailer=${encodeURIComponent(retailer)}`);
        const j = (await res.json()) as NearResponse;
        setData(j);
        setState(res.ok ? "done" : "error");
      } catch {
        setState("error");
      }
    },
    [retailer],
  );

  function locate() {
    if (!navigator.geolocation) return setState("error");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: Number(p.coords.latitude.toFixed(5)), lng: Number(p.coords.longitude.toFixed(5)) };
        try {
          sessionStorage.setItem(POS_KEY, JSON.stringify(pos));
        } catch {
          // private mode — we just ask again next time
        }
        void load(pos);
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
    // Already allowed us once this visit? Then hovering can answer straight away.
    if (state === "idle") {
      const pos = cachedPosition();
      if (pos) void load(pos);
    }
  };
  const hide = () => {
    if (pinned) return;
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        className="cursor-help text-left underline decoration-dotted underline-offset-4"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setPinned((p) => !p);
          setOpen(true);
          if (state === "idle" && !cachedPosition()) locate();
        }}
      >
        {children}
      </button>
      {open ? (
        <span className="absolute left-0 top-full z-30 mt-1 block w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
          <span className="block font-semibold text-slate-900">{retailerName} 最近分店</span>
          {state === "idle" ? (
            <>
              <span className="mt-1 block text-slate-500">用你嘅位置搵最近嘅分店。Uses your location, only for this lookup.</span>
              <button type="button" className="btn-primary mt-2 w-full py-1 text-xs" onClick={locate}>
                搵最近分店 Find nearest
              </button>
            </>
          ) : state === "locating" ? (
            <span className="mt-1 block text-slate-500">定位中… Locating</span>
          ) : state === "loading" ? (
            <span className="mt-1 block text-slate-500">搵緊… Searching</span>
          ) : state === "denied" ? (
            <span className="mt-1 block text-amber-700">
              冇定位權限。Location permission denied —{" "}
              <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(retailerName)}`}>
                喺 Google 地圖搵
              </a>
            </span>
          ) : state === "error" ? (
            <span className="mt-1 block text-rose-600">搵唔到位置 Could not get your location.</span>
          ) : data && data.stores.length ? (
            <>
              {data.stores.map((s) => (
                <a key={s.mapsUrl} href={s.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg bg-slate-50 p-2 hover:bg-slate-100">
                  <span className="block font-medium text-slate-900">{s.name}</span>
                  {s.address ? <span className="block text-slate-500">{s.address}</span> : null}
                  <span className="block text-brand-700">{s.distance} · 步行約 {s.walkMinutes} 分鐘 →</span>
                </a>
              ))}
              <span className="mt-2 block text-[10px] leading-tight text-slate-400">{data.attribution}</span>
            </>
          ) : (
            <span className="mt-1 block text-slate-500">
              附近 20 公里內未有呢間連鎖店嘅位置資料。No branch of this chain on file nearby.
            </span>
          )}
        </span>
      ) : null}
    </span>
  );
}
