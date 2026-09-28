"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/components/analytics-beacon";
import { PushOptIn } from "./push-opt-in";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const money = (cents: number | null | undefined) => (cents == null ? "—" : `HK$${(cents / 100).toLocaleString("en-HK", { maximumFractionDigits: 2 })}`);

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as T & { error?: string };
  return { ok: res.ok, data };
}

export function SearchPoller({ jobId, platforms }: { jobId: number; platforms: string[] }) {
  const router = useRouter();
  const [state, setState] = useState<{ status: string; cluster: string | null; failures: string[] }>({ status: "PENDING", cluster: null, failures: [] });

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok || stop) return;
      const j = (await res.json()) as {
        status: string;
        result: { platforms?: { platform: string; ok: boolean; failure?: string; listings: number }[] } | null;
        cluster: { status: string } | null;
      };
      const failures = (j.result?.platforms ?? []).filter((p) => !p.ok).map((p) => `${p.platform}: ${p.failure}`);
      setState({ status: j.status, cluster: j.cluster?.status ?? null, failures });
      const finished = j.status === "FAILED" || (j.status === "DONE" && (!j.cluster || j.cluster.status === "DONE" || j.cluster.status === "FAILED"));
      if (finished) {
        router.refresh();
        return;
      }
      setTimeout(tick, 3000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [jobId, router]);

  const done = state.status === "DONE" && (!state.cluster || state.cluster === "DONE");
  return (
    <div className="card flex flex-col gap-1 p-4 text-sm" aria-live="polite">
      <div className="font-medium">
        {done ? "✓ 搜尋完成 Search complete" : state.status === "FAILED" ? "搜尋失敗 Search failed" : "⏳ 正在比較各平台價格… Checking sources"}
      </div>
      <div className="text-slate-500">
        來源 Sources: {platforms.join(" · ")} — 狀態 {state.status}
        {state.cluster ? ` → 配對 matching ${state.cluster}` : ""}
      </div>
      {state.failures.length ? <div className="text-amber-700">未能讀取 Unavailable: {state.failures.join("; ")}</div> : null}
      {state.status === "PENDING" ? (
        <div className="text-xs text-slate-400">工作排隊中 — 需要 worker 運行 (npm run worker)</div>
      ) : null}
    </div>
  );
}

/** Paste a link from an ad or a group chat; we price that exact listing. */
export function PasteLink({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-1"
      onSubmit={async (e) => {
        e.preventDefault();
        const url = String(new FormData(e.currentTarget).get("url") ?? "");
        setBusy(true);
        setError(null);
        const r = await postJson<{ slug: string | null; jobId: number | null }>("/api/paste", { url });
        if (!r.ok) {
          setBusy(false);
          setError(r.data.error ?? "讀唔到呢條連結");
          return;
        }
        if (r.data.slug) {
          router.push(`/p/${r.data.slug}?pasted=1`);
          return;
        }
        // The worker fetches the listing; poll until it has a product page.
        setError(null);
        const jobId = r.data.jobId!;
        for (let i = 0; i < 40; i++) {
          await new Promise((res) => setTimeout(res, 2000));
          const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
          if (!res.ok) continue;
          const j = (await res.json()) as { status: string; result?: { slug?: string } | null; error?: string };
          if (j.status === "DONE" && j.result?.slug) {
            router.push(`/p/${j.result.slug}?pasted=1`);
            return;
          }
          if (j.status === "FAILED") {
            setBusy(false);
            setError("讀唔到呢個產品，可能已落架或者需要登入 — could not read that listing.");
            return;
          }
        }
        setBusy(false);
        setError("等太耐喇，worker 可能未行緊 — timed out; is the worker running?");
      }}
    >
      <div className="flex gap-2">
        <input
          name="url"
          required
          placeholder="貼上產品連結（Amazon / eBay / 速賣通 / 淘寶 …）"
          className={dark ? "min-w-0 flex-1 rounded-xl border-0 px-4 py-2.5 text-slate-900 outline-none ring-2 ring-white/20" : "input"}
        />
        <button className={dark ? "rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" : "btn-secondary"} disabled={busy}>
          {busy ? "讀緊…" : "格價 Compare"}
        </button>
      </div>
      {error ? <p className={`text-xs ${dark ? "text-amber-100" : "text-rose-600"}`} role="alert">{error}</p> : null}
    </form>
  );
}

export function PassportChart({ points }: { points: { day: string; cents: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-slate-500">價格紀錄未夠 Not enough history to chart yet.</p>;
  const data = points.map((p) => ({ day: p.day.slice(5), hkd: p.cents / 100 }));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `$${v}`} domain={["auto", "auto"]} />
          <Tooltip formatter={(v) => [`HK$${Number(v).toFixed(2)}`, "最平到手價"]} />
          <Line type="monotone" dataKey="hkd" stroke="#059669" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WatchForm({ productId, defaultEmail, promo = false }: { productId: number; defaultEmail?: string; promo?: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState<{ email: string; token: string } | null>(null);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = Object.fromEntries(new FormData(e.currentTarget).entries());
        const r = await postJson<{ ok: boolean; email?: string; pushToken?: string }>("/api/watch", { ...f, productId });
        setBusy(false);
        if (r.ok) trackEvent("watch");
        if (r.ok && r.data.email && r.data.pushToken) setPush({ email: r.data.email, token: r.data.pushToken });
        setMsg(
          r.ok
            ? { ok: true, text: promo ? "✓ 有優惠或者減價都會通知你 We'll tell you when it's on offer or drops" : "✓ 減價會通知你 We'll tell you when it drops" }
            : { ok: false, text: r.data.error ?? "出錯" },
        );
      }}
    >
      <div className="flex flex-wrap gap-2">
        <input name="email" type="email" required defaultValue={defaultEmail} placeholder="電郵 Email" className="input min-w-0 flex-1" />
        <input name="target" type="number" min="1" step="1" placeholder="目標價 HK$ (可選)" className="input w-40" />
        <button className="btn-primary" disabled={busy}>🔔 {promo ? "有優惠通知我" : "減價通知我"}</button>
      </div>
      {promo ? (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="promo" defaultChecked /> 任何一間超市有「買2件」等優惠都通知我 Also tell me when any chain puts it on offer
        </label>
      ) : null}
      {msg ? <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p> : null}
      {push ? <PushOptIn email={push.email} token={push.token} /> : null}
    </form>
  );
}

interface QuoteView {
  quoteId: string;
  qty: number;
  totalHkdCents: number;
  unitPriceHkdCents: number;
  expiresAt: string;
  beatsBuyerRouteByCents: number | null;
  buyerRouteCents: number | null;
  fxBufferPct: number;
}

export function BuyBox({
  productId,
  signedIn,
  slug,
  indicativeCents,
  buyerRouteCents,
}: {
  productId: number;
  signedIn: boolean;
  slug: string;
  indicativeCents: number | null;
  buyerRouteCents: number | null;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!quote) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [quote]);

  const secondsLeft = quote ? Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - now) / 1000)) : 0;

  async function getQuote() {
    setBusy(true);
    setError(null);
    const r = await postJson<QuoteView>("/api/quote", { productId, qty });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "報價失敗");
    setQuote(r.data);
  }

  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!quote) return;
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/p/${slug}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const r = await postJson<{ redirectUrl: string }>("/api/checkout", { ...f, quoteId: quote.quoteId });
    if (!r.ok) {
      setBusy(false);
      return setError(r.data.error ?? "結帳失敗");
    }
    window.location.href = r.data.redirectUrl;
  }

  return (
    <div className="card space-y-3 border-brand-500 p-5">
      <div className="font-semibold">我哋代買代送 Buy it through us</div>
      {indicativeCents != null && !quote ? (
        <div>
          <span className="text-3xl font-black tabular-nums text-brand-700">{money(indicativeCents)}</span>
          {buyerRouteCents != null && buyerRouteCents > indicativeCents ? (
            <span className="ml-2 text-sm text-slate-600">
              自己買要 <span className="line-through">{money(buyerRouteCents)}</span>，平 {money(buyerRouteCents - indicativeCents)}
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-slate-500">我哋向已核實供應商落單、集運到港，價錢已包所有費用；報價鎖定 15 分鐘。</p>
      {!quote ? (
        <div className="flex items-center gap-2">
          <label className="text-sm" htmlFor="qty">數量</label>
          <input id="qty" type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input w-20" />
          <button className="btn-primary" onClick={getQuote} disabled={busy}>{busy ? "計緊…" : "攞報價 Get quote"}</button>
        </div>
      ) : secondsLeft === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-amber-700">報價已過期 Quote expired.</p>
          <button className="btn-secondary" onClick={() => setQuote(null)}>重新報價 Re-quote</button>
        </div>
      ) : (
        <form onSubmit={checkout} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tabular-nums text-brand-700">{money(quote.totalHkdCents)}</span>
            <span className="text-xs text-slate-500">× {quote.qty} · 有效 {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>
          </div>
          {quote.beatsBuyerRouteByCents != null ? (
            <p className="text-xs text-slate-600">
              比你自己用信用卡買（{money(quote.buyerRouteCents)}）{quote.beatsBuyerRouteByCents >= 0 ? `平 ${money(quote.beatsBuyerRouteByCents)}` : `貴 ${money(-quote.beatsBuyerRouteByCents)}`}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">包含匯率緩衝 {(quote.fxBufferPct * 100).toFixed(1)}%（已披露）· Includes a disclosed {(quote.fxBufferPct * 100).toFixed(1)}% FX buffer.</p>
          <input name="name" required placeholder="收件人 Name" className="input" />
          <input name="phone" required placeholder="電話 Phone" className="input" />
          <textarea name="address" required minLength={8} placeholder="香港送貨地址 HK delivery address" className="input" rows={2} />
          <button className="btn-primary w-full" disabled={busy}>{signedIn ? "付款 Pay" : "登入後付款 Sign in to pay"}</button>
        </form>
      )}
      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
    </div>
  );
}

export function PoolJoin({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm" htmlFor="pool-qty">數量</label>
        <input id="pool-qty" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input w-20" />
        <button
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            if (!signedIn) return router.push(`/login?next=${encodeURIComponent(`/pools/${slug}`)}`);
            setBusy(true);
            setError(null);
            const r = await postJson<{ redirectUrl: string }>("/api/pools/commit", { slug, qty });
            if (!r.ok) {
              setBusy(false);
              return setError(r.data.error ?? "加入失敗");
            }
            window.location.href = r.data.redirectUrl;
          }}
        >
          {signedIn ? "加入拼單（暫不扣款）Join — no charge yet" : "登入後加入 Sign in to join"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
    </div>
  );
}

/** Link a Telegram chat so price drops arrive where people actually read them. */
export function TelegramLink({ linked }: { linked: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [bot, setBot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (linked) return <p className="text-sm text-emerald-700">✓ 已連結 Telegram，減價會即時通知你。Telegram linked.</p>;

  return (
    <div className="space-y-2 text-sm">
      {code ? (
        <>
          <p>
            喺 Telegram send 呢個碼俾 {bot ? <b>@{bot}</b> : "我哋個 bot"}：<b className="tabular-nums">{code}</b>
          </p>
          {bot ? (
            <a className="btn-primary py-1" href={`https://t.me/${bot}?start=${code}`} target="_blank" rel="noreferrer">
              打開 Telegram
            </a>
          ) : null}
        </>
      ) : (
        <button
          className="btn-secondary py-1"
          onClick={async () => {
            const r = await postJson<{ code: string; bot: string | null }>("/api/telegram/link", {});
            if (!r.ok) return setError(r.data.error ?? "出錯");
            setCode(r.data.code);
            setBot(r.data.bot);
          }}
        >
          用 Telegram 收減價通知 Get alerts on Telegram
        </button>
      )}
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
    </div>
  );
}

/** Share a price into a WhatsApp group — the way Hong Kong actually shares deals. */
export function ShareButtons({ title, url, price }: { title: string; url: string; price: string }) {
  const text = `${title}\n到手價 ${price}\n${url}`;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <a className="btn-secondary py-1" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        分享到 WhatsApp
      </a>
      <a className="btn-secondary py-1" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title} — 到手價 ${price}`)}`} target="_blank" rel="noreferrer">
        分享到 Telegram
      </a>
      <button
        className="btn-secondary py-1"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            // clipboard blocked — the share links above still work
          }
        }}
      >
        複製連結 Copy
      </button>
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      登出 Sign out
    </button>
  );
}
