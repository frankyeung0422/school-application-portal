"use client";

import { useState } from "react";
import { MAX_PHOTO_BYTES } from "@/lib/instore/validate";

/**
 * "I saw it for HK$X at Wellcome Mong Kok" — the only source of in-store prices
 * and the only way to cover chains that publish nothing (優之良品, 優品360, 759).
 * Nothing shows publicly until an admin approves it.
 */
export function ReportPrice({
  productId,
  retailers,
  defaultRetailer,
  compact,
}: {
  productId?: number;
  retailers: { code: string; name: string; publishes: boolean }[];
  defaultRetailer?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const photo = data.get("photo");
    if (photo instanceof File && photo.size > MAX_PHOTO_BYTES) {
      setMsg({ ok: false, text: "相片太大（上限 4MB）Photo too large (4MB max)" });
      return;
    }
    if (productId) data.set("productId", String(productId));
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/instore", { method: "POST", body: data });
    const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string; flagged?: string | null };
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: j.error ?? "出錯 Something went wrong" });
      return;
    }
    form.reset();
    setMsg({ ok: true, text: `${j.message}${j.flagged ? ` （${j.flagged}）` : ""}` });
  }

  if (compact && !open) {
    return (
      <button className="btn-secondary py-1 text-xs" onClick={() => setOpen(true)}>
        報門市價 Report an in-store price
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="rp-retailer">超市／店舖 Shop</label>
          <select id="rp-retailer" name="retailer" defaultValue={defaultRetailer ?? ""} required className="input">
            <option value="" disabled>請揀 Choose…</option>
            {retailers.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}{r.publishes ? "" : "（冇公開網上價）"}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="label" htmlFor="rp-price">價錢 HK$</label>
          <input id="rp-price" name="price" type="number" step="0.1" min="0.5" required className="input" />
        </div>
        <div className="w-36">
          <label className="label" htmlFor="rp-seen">幾時見到 Seen on</label>
          <input id="rp-seen" name="seenAt" type="date" max={today} defaultValue={today} className="input" />
        </div>
      </div>
      {productId ? null : (
        <div>
          <label className="label" htmlFor="rp-item">貨品名 Item</label>
          <input id="rp-item" name="itemName" required className="input" placeholder="例如：優之良品 芒果乾 100g" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="rp-branch">分店 Branch（可選）</label>
          <input id="rp-branch" name="branch" className="input" placeholder="旺角 / 太古 …" />
        </div>
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="rp-photo">價錢牌相 Photo of the tag（可選，最有說服力）</label>
          <input id="rp-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input py-1" />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        我哋會人手核實先公開，會顯示「用戶提供」同日期。Reports are checked by a person before they appear, and are always labelled as shopper-reported.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary py-1.5" disabled={busy}>{busy ? "提交中…" : "提交 Submit"}</button>
        {msg ? <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
