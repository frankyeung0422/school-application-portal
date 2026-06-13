"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale: Locale;
  source: string;
}

export function SubscribeForm({ locale, source }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError(T("請輸入電郵", "Email is required"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/cheatsheet/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          profession: profession || null,
          locale,
          source,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error === "invalid_email" ? T("電郵格式不正確", "Invalid email") : (j.error ?? T("提交失敗", "Failed")));
        setBusy(false);
        return;
      }
      // Immediately go to the printable preview.
      router.push(j.downloadUrl ?? "/cheatsheet/herb-drug-2026/preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-base";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-muted mb-1">
          {T("電郵地址 *", "Email address *")}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@clinic.example"
        />
      </div>

      <div>
        <label htmlFor="profession" className="block text-xs font-medium text-muted mb-1">
          {T("專業背景 (選填)", "Profession (optional)")}
        </label>
        <select
          id="profession"
          className={inputCls}
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
        >
          <option value="">{T("— 不指定 —", "— Prefer not to say —")}</option>
          <option value="TCM Practitioner">{T("中醫師 (TCM Practitioner)", "TCM Practitioner")}</option>
          <option value="MD">{T("西醫 (Medical Doctor)", "Medical Doctor")}</option>
          <option value="Pharmacist">{T("藥劑師 (Pharmacist)", "Pharmacist")}</option>
          <option value="Student">{T("學生 (Student)", "Student")}</option>
          <option value="Other">{T("其他", "Other")}</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-50/60 dark:bg-red-900/10 px-3 py-2 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary text-white py-3 text-base font-semibold hover:bg-primary-light disabled:opacity-50"
      >
        {busy
          ? T("處理中…", "Processing…")
          : T("📄 立即取得 PDF", "📄 Get the PDF now")}
      </button>

      <p className="text-[10px] text-muted text-center leading-relaxed">
        {T(
          "提交即表示同意接收 EBTCM 的證據摘要新聞信。可隨時取消訂閱。我們不會分享您的電郵。",
          "By submitting you agree to receive the EBTCM evidence digest. Unsubscribe anytime. We never share your email.",
        )}
      </p>
    </form>
  );
}
