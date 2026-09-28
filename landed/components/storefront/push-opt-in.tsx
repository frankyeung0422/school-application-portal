"use client";

import { useEffect, useState } from "react";

function urlB64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "idle" | "busy" | "on" | "denied" | "error";

/** "Notify this phone": registers /sw.js and saves the push endpoint for this email's alerts. */
export function PushOptIn({ email, token, compact = false }: { email?: string; token?: string; compact?: boolean }) {
  const [state, setState] = useState<State>("idle");
  useEffect(() => {
    // Feature checks run after mount (no window during SSR); state is set from the async result.
    let live = true;
    void (async () => {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: State = ok ? (Notification.permission === "denied" ? "denied" : "idle") : "unsupported";
      if (ok && next === "idle") {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg && (await reg.pushManager.getSubscription())) next = "on";
      }
      if (live) setState(next);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (state === "unsupported") return null;

  async function enable() {
    setState("busy");
    try {
      const keyRes = await fetch("/api/push");
      if (!keyRes.ok) throw new Error("push not configured");
      const { key } = (await keyRes.json()) as { key: string };
      if ((await Notification.requestPermission()) !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) }));
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), email, token }),
      });
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "on") return <span className="text-xs text-emerald-700">📱 呢部機會收到通知 Push on</span>;
  if (state === "denied") return <span className="text-xs text-slate-500">瀏覽器已封鎖通知 — 可以喺設定重新開啟</span>;
  return (
    <button type="button" onClick={enable} disabled={state === "busy"} className={compact ? "text-xs text-brand-700 underline" : "btn-secondary py-1 text-xs"}>
      {state === "busy" ? "…" : state === "error" ? "再試 Retry push" : "📱 喺呢部機收通知 Notify this device"}
    </button>
  );
}
