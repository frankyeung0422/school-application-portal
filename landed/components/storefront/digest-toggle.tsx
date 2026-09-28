"use client";

import Link from "next/link";
import { useState } from "react";

export function DigestToggle({ initial, telegramLinked }: { initial: boolean; telegramLinked: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    // Send the current list too: turning the digest on should also save the basket to the account.
    let lines: unknown[] = [];
    try {
      lines = JSON.parse(localStorage.getItem("landed.basket.v1") ?? "[]") as unknown[];
    } catch {
      // private mode
    }
    const res = await fetch("/api/basket/saved", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, digestOptIn: !on }),
    }).catch(() => null);
    if (res?.ok) setOn(!on);
    setBusy(false);
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button onClick={toggle} disabled={busy} className={on ? "btn-secondary" : "btn-primary"}>
        {on ? "✓ 已訂閱 · 取消" : "訂閱 Subscribe"}
      </button>
      {on && !telegramLinked ? (
        <Link href="/account" className="text-xs text-brand-700 underline">連接 Telegram 收得快啲 →</Link>
      ) : null}
    </div>
  );
}
