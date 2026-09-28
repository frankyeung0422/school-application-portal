"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Only same-site relative paths are followed after login — no open redirect. */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { error?: string; isAdmin?: boolean };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "出錯 Something went wrong");
      return;
    }
    router.push(safeNext(next, data.isAdmin ? "/admin" : "/account"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-6">
      {mode === "register" ? (
        <div>
          <label className="label" htmlFor="name">稱呼 Name</label>
          <input id="name" name="name" className="input" autoComplete="name" />
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="email">電郵 Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">密碼 Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          className="input"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>
      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "處理中…" : mode === "login" ? "登入 Sign in" : "註冊 Create account"}
      </button>
    </form>
  );
}
