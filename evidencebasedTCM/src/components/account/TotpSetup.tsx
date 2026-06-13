"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale: Locale;
  initiallyEnabled: boolean;
  email: string;
}

type Phase = "idle" | "setup" | "confirm" | "done" | "disable";

export function TotpSetup({ locale, initiallyEnabled, email }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/account/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin" }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok || !j.ok) {
      setError(j.error ?? T("無法開始", "Could not start"));
      return;
    }
    setSecret(j.secret);
    setOtpauthUri(j.otpauthUri);
    setPhase("setup");
  }

  async function confirm() {
    if (!secret) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/account/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable", secret, code: code.trim() }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok || !j.ok) {
      setError(j.error === "invalid_code" ? T("驗證碼不正確", "Invalid code") : (j.error ?? T("啟用失敗", "Failed")));
      return;
    }
    setRecoveryCodes(j.recoveryCodes as string[]);
    setEnabled(true);
    setPhase("done");
    router.refresh();
  }

  async function disable() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/account/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable", password }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok || !j.ok) {
      setError(j.error === "invalid_password" ? T("密碼不正確", "Invalid password") : (j.error ?? T("停用失敗", "Failed")));
      return;
    }
    setEnabled(false);
    setPhase("idle");
    setPassword("");
    router.refresh();
  }

  // Already enabled — show disable flow
  if (enabled && phase !== "done") {
    return (
      <div className="rounded-lg border border-green-400/40 bg-green-50/40 dark:bg-green-900/10 p-5">
        <h2 className="text-base font-semibold mb-2">
          ✅ {T("兩步驗證已啟用", "2FA is enabled")}
        </h2>
        <p className="text-sm text-muted mb-4">
          {T(
            "登入時將要求您輸入驗證器應用中的 6 位數碼。",
            "On sign-in you'll be prompted for the 6-digit code from your authenticator app.",
          )}
        </p>
        {phase !== "disable" ? (
          <button
            onClick={() => setPhase("disable")}
            className="text-sm rounded border border-border bg-background px-3 py-1.5 hover:bg-surface"
          >
            {T("停用 2FA…", "Disable 2FA…")}
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-muted">{T("輸入密碼以確認停用", "Enter password to confirm")}</label>
            <input
              type="password"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-xs text-red-700">❌ {error}</p>}
            <div className="flex gap-2">
              <button onClick={disable} disabled={busy} className="text-sm rounded bg-red-600 text-white px-3 py-1.5 disabled:opacity-50">
                {busy ? T("處理中…", "Working…") : T("確認停用", "Confirm disable")}
              </button>
              <button onClick={() => { setPhase("idle"); setPassword(""); setError(null); }} className="text-sm rounded border border-border bg-background px-3 py-1.5">
                {T("取消", "Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Done — show recovery codes once
  if (phase === "done" && recoveryCodes) {
    return (
      <div className="rounded-lg border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-900/10 p-5">
        <h2 className="text-base font-semibold mb-2">
          🎉 {T("2FA 啟用成功 — 請保存恢復代碼", "2FA enabled — save your recovery codes")}
        </h2>
        <p className="text-sm mb-3">
          {T(
            "若失去驗證器，可使用下方代碼登入（每碼僅可用一次）。請列印或存放在安全處 — 此頁離開後將無法再次查看。",
            "If you lose your authenticator, these codes let you sign in (each works once). Print or store somewhere safe — they won't be shown again.",
          )}
        </p>
        <pre className="rounded bg-background border border-border p-3 text-sm font-mono leading-loose select-all">
          {recoveryCodes.join("\n")}
        </pre>
        <button
          onClick={() => { setPhase("idle"); setRecoveryCodes(null); }}
          className="mt-3 text-sm rounded bg-primary text-white px-3 py-1.5"
        >
          {T("我已保存", "I've saved them")}
        </button>
      </div>
    );
  }

  // Not yet enabled
  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
      <h2 className="text-base font-semibold">
        {T("兩步驗證 (2FA — TOTP)", "Two-Factor Authentication (TOTP)")}
      </h2>

      {phase === "idle" && (
        <>
          <p className="text-sm text-muted">
            {T(
              "使用 Google Authenticator、Authy、1Password 等支援 TOTP 的驗證器應用。",
              "Use any TOTP-compatible authenticator: Google Authenticator, Authy, 1Password, etc.",
            )}
          </p>
          {error && <p className="text-sm text-red-700">❌ {error}</p>}
          <button
            onClick={begin}
            disabled={busy}
            className="rounded bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? T("產生中…", "Generating…") : T("開始啟用 2FA", "Begin enrollment")}
          </button>
        </>
      )}

      {phase === "setup" && secret && otpauthUri && (
        <>
          <ol className="list-decimal pl-5 text-sm space-y-2">
            <li>
              {T("在驗證器應用中選擇「掃描 QR 碼」或「手動輸入」。", "In your authenticator, choose 'Scan QR' or 'Enter setup key'.")}
            </li>
            <li>
              {T("手動輸入時，使用以下密鑰（base32）：", "If entering manually, use this base32 secret:")}
              <pre className="mt-1 rounded bg-background border border-border p-2 text-xs font-mono break-all select-all">
                {secret}
              </pre>
              <p className="text-[10px] text-muted mt-1">
                {T("帳戶：", "Account: ")}{email}{T("　發行者：EBTCM", " · Issuer: EBTCM")}
              </p>
            </li>
            <li>
              {T("或將以下 URI 貼到支援的應用中：", "Or paste this URI into a TOTP-capable app:")}
              <pre className="mt-1 rounded bg-background border border-border p-2 text-[10px] font-mono break-all select-all">{otpauthUri}</pre>
            </li>
            <li>
              {T("應用啟用後，輸入當前顯示的 6 位數碼：", "Once added, enter the current 6-digit code:")}
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="mt-1 w-32 rounded border border-border bg-background px-3 py-2 text-lg font-mono tracking-widest text-center"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </li>
          </ol>
          {error && <p className="text-sm text-red-700">❌ {error}</p>}
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={busy || code.length !== 6}
              className="rounded bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy ? T("驗證中…", "Verifying…") : T("確認啟用", "Confirm enable")}
            </button>
            <button
              onClick={() => { setPhase("idle"); setSecret(null); setCode(""); setError(null); }}
              className="rounded border border-border bg-background px-4 py-2 text-sm"
            >
              {T("取消", "Cancel")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
