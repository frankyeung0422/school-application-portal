"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BasketComparison } from "@/lib/supermarket/basket";

const KEY = "landed.basket.v1";
const money = (c: number | null | undefined) => (c == null ? "—" : `HK$${(c / 100).toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export interface BasketItem {
  productId: number;
  title: string;
  qty: number;
}

function load(): BasketItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as BasketItem[];
  } catch {
    return [];
  }
}

function save(items: BasketItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("landed-basket"));
  } catch {
    // private mode: basket just won't persist
  }
}

// Signed in, the list is also kept on the account (/api/basket/saved) so it
// follows the shopper to another device and feeds the weekly digest.
let accountSync: Promise<boolean> | null = null;

function pushToAccount(items: BasketItem[]) {
  void fetch("/api/basket/saved", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: items.map(({ productId, qty }) => ({ productId, qty })) }),
  }).catch(() => {});
}

/** Once per page load: merge the account's list into this browser's (larger qty wins), then save the union back. */
function syncWithAccount(): Promise<boolean> {
  accountSync ??= fetch("/api/basket/saved")
    .then(async (res) => {
      if (!res.ok) return false;
      const saved = (await res.json()) as { signedIn: boolean; lines: BasketItem[] };
      if (!saved.signedIn) return false;
      const local = load();
      const merged = new Map(local.map((i) => [i.productId, i]));
      for (const s of saved.lines) {
        const l = merged.get(s.productId);
        merged.set(s.productId, l ? { ...l, qty: Math.max(l.qty, s.qty) } : s);
      }
      const next = [...merged.values()];
      save(next);
      if (next.length !== saved.lines.length || next.some((i) => saved.lines.find((s) => s.productId === i.productId)?.qty !== i.qty)) pushToAccount(next);
      return true;
    })
    .catch(() => false);
  return accountSync;
}

export function useBasket() {
  const [items, setItems] = useState<BasketItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(load());
    sync();
    void syncWithAccount();
    window.addEventListener("landed-basket", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("landed-basket", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const update = useCallback((next: BasketItem[]) => {
    const kept = next.filter((i) => i.qty > 0);
    save(kept);
    void syncWithAccount().then((signedIn) => signedIn && pushToAccount(kept));
  }, []);
  return { items, update };
}

export function AddToBasket({ productId, title, qty = 1 }: { productId: number; title: string; qty?: number }) {
  const { items, update } = useBasket();
  const inBasket = items.find((i) => i.productId === productId);
  return (
    <button
      className={inBasket ? "btn-secondary py-1 text-xs" : "btn-primary py-1 text-xs"}
      onClick={(e) => {
        e.preventDefault();
        if (inBasket) update(items.map((i) => (i.productId === productId ? { ...i, qty: i.qty + qty } : i)));
        else update([...items, { productId, title, qty }]);
      }}
    >
      {inBasket ? `已加 ${inBasket.qty} · 再加` : "加入清單 Add"}
    </button>
  );
}

export function BasketBadge() {
  const { items } = useBasket();
  const n = items.reduce((s, i) => s + i.qty, 0);
  return (
    <Link href="/basket" className="hover:text-slate-900">
      購物清單{n ? <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{n}</span> : null}
    </Link>
  );
}

interface CompareResponse {
  comparison: BasketComparison;
  products: { id: number; title: string; titleEn: string | null; slug: string }[];
  deliveryKnown: string[];
}

export function BasketPage({ retailerNames }: { retailerNames: Record<string, string> }) {
  const { items, update } = useBasket();
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) return; // the empty state renders without data
    let cancelled = false;
    fetch("/api/basket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: items.map((i) => ({ productId: i.productId, qty: i.qty })), includeDelivery }),
    })
      .then(async (r) => {
        const j = (await r.json()) as CompareResponse & { error?: string };
        if (cancelled) return;
        if (!r.ok) setError(j.error ?? "出錯");
        else {
          setError(null);
          setData(j);
        }
      })
      .catch(() => !cancelled && setError("網絡錯誤 Network error"));
    return () => {
      cancelled = true;
    };
  }, [items, includeDelivery]);

  const name = (r: string) => retailerNames[r] ?? r;
  const titleOf = (id: number) => items.find((i) => i.productId === id)?.title ?? `#${id}`;
  const c = data?.comparison;

  if (!items.length) {
    return (
      <div className="card p-8 text-center">
        <div className="font-semibold">購物清單係空嘅 Your list is empty</div>
        <p className="mt-2 text-sm text-slate-500">
          喺 <Link href="/supermarket" className="text-brand-700 underline">超市格價</Link> 撳「加入清單」，我哋會計邊間超市買晒最平。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        {c?.bestSingle ? (
          <div className="card border-2 border-brand-500 p-5">
            <div className="text-sm text-slate-500">一間買晒最平 Cheapest single shop</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-black">{name(c.bestSingle.retailer)}</span>
              <span className="text-3xl font-black tabular-nums text-brand-700">{money(c.bestSingle.totalCents)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              已計優惠慳 {money(c.bestSingle.promoSavingCents)}
              {includeDelivery ? ` · 運費 ${money(c.bestSingle.deliveryCents)}` : ""}
            </div>
          </div>
        ) : c ? (
          <div className="card p-5 text-sm">冇一間超市有齊你張清單上所有貨品 — 睇下右邊分開買嘅方案。No single shop stocks everything.</div>
        ) : null}

        {c ? (
          <div className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-sm text-slate-500">分開買最平 Cheapest split</div>
                <div className="text-2xl font-black tabular-nums">{money(c.split.totalCents)}</div>
              </div>
              <div className="text-sm">
                要去 {c.split.stores.length} 間：{c.split.stores.map(name).join("、")}
                {c.splitSavesCents != null ? (
                  <div className={c.splitSavesCents > 0 ? "font-semibold text-emerald-700" : "text-slate-500"}>
                    {c.splitSavesCents > 0 ? `比一間買平 ${money(c.splitSavesCents)}` : "唔值得分開買"}
                  </div>
                ) : null}
              </div>
            </div>
            <table className="table mt-3">
              <tbody>
                {c.split.lines.map((l) => (
                  <tr key={l.productId}>
                    <td>{titleOf(l.productId)} × {l.qty}</td>
                    <td className="whitespace-nowrap">{name(l.retailer)}</td>
                    <td className="text-right tabular-nums">{money(l.costCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {c.split.unavailable.length ? <p className="mt-2 text-xs text-amber-700">冇貨：{c.split.unavailable.map((u) => u.title).join("、")}</p> : null}
          </div>
        ) : null}

        {c ? (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>超市</th><th className="text-right">總數</th><th className="text-right">優惠慳</th><th>冇貨</th></tr>
              </thead>
              <tbody>
                {c.stores.map((s) => (
                  <tr key={s.retailer} className={s.retailer === c.bestSingle?.retailer ? "bg-emerald-50" : ""}>
                    <td>{name(s.retailer)}</td>
                    <td className="text-right tabular-nums">{s.missing.length ? <span className="text-slate-400">{money(s.totalCents)}*</span> : money(s.totalCents)}</td>
                    <td className="text-right tabular-nums">{money(s.promoSavingCents)}</td>
                    <td className="text-xs text-slate-500">{s.missing.length ? `${s.missing.length} 項` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 pb-3 text-xs text-slate-500">* 缺貨嘅超市總數唔包未有貨嘅項目。Totals marked * exclude items that shop doesn&apos;t stock.</p>
          </div>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>

      <div className="card h-fit space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="font-semibold">清單 My list</span>
          <button className="text-xs text-slate-500 underline" onClick={() => update([])}>清空 Clear</button>
        </div>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.productId} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate" title={i.title}>{i.title}</span>
              <button className="btn-secondary px-2 py-0.5" onClick={() => update(items.map((x) => (x.productId === i.productId ? { ...x, qty: x.qty - 1 } : x)))} aria-label="minus">−</button>
              <span className="w-6 text-center tabular-nums">{i.qty}</span>
              <button className="btn-secondary px-2 py-0.5" onClick={() => update(items.map((x) => (x.productId === i.productId ? { ...x, qty: x.qty + 1 } : x)))} aria-label="plus">+</button>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeDelivery} onChange={(e) => setIncludeDelivery(e.target.checked)} />
          計埋網購運費 Include delivery fees
        </label>
        {includeDelivery && data && data.deliveryKnown.length === 0 ? (
          <p className="text-xs text-amber-700">未設定任何超市運費 — 管理員可喺設定輸入。No delivery terms configured yet.</p>
        ) : null}
        <p className="text-xs text-slate-500">優惠唔會疊加：每件貨只用最抵嗰個優惠。Promotions are not stacked — the best single deal per item applies.</p>
      </div>
    </div>
  );
}
