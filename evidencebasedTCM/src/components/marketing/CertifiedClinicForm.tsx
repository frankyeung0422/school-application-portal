"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

export function CertifiedClinicForm({ locale }: { locale: Locale }) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [clinicName, setClinicName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [practitionerCount, setPractitionerCount] = useState(1);
  const [district, setDistrict] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [existing, setExisting] = useState(false);
  const [ebtcmEmail, setEbtcmEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicName.trim() || !contactName.trim() || !email.trim()) {
      setError(T("請填寫所有必填欄位", "Please fill all required fields"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/certified-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName,
          contactName,
          email,
          phone: phone || null,
          practitionerCount,
          district: district || null,
          specialties: specialties || null,
          existingEbtcmAccount: existing,
          ebtcmAccountEmail: existing && ebtcmEmail ? ebtcmEmail : null,
          notes: notes || null,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? T("提交失敗", "Submission failed"));
        setBusy(false);
        return;
      }
      setSubmittedId(j.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
      setBusy(false);
    }
  }

  if (submittedId) {
    return (
      <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/15 p-6 text-center">
        <div className="text-3xl mb-2">🏅</div>
        <h3 className="text-xl font-bold mb-2">
          {T("申請已送出！", "Application received!")}
        </h3>
        <p className="text-sm text-muted mb-3 leading-relaxed">
          {T(
            "我們在 3 個工作日內回覆。請留意您的電郵收件箱。",
            "We'll reply within 3 business days. Watch for our email.",
          )}
        </p>
        <p className="text-xs text-muted">
          {T("申請編號", "Application ID")}: <span className="font-mono">{submittedId.slice(0, 12)}</span>
        </p>
      </div>
    );
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  const labelCls = "block text-xs font-medium text-muted mb-1";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{T("診所名稱 *", "Clinic name *")}</label>
          <input className={inputCls} value={clinicName} onChange={(e) => setClinicName(e.target.value)} required maxLength={200} />
        </div>
        <div>
          <label className={labelCls}>{T("聯絡人姓名 *", "Contact person *")}</label>
          <input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} required maxLength={120} />
        </div>
        <div>
          <label className={labelCls}>{T("聯絡電郵 *", "Email *")}</label>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
        </div>
        <div>
          <label className={labelCls}>{T("聯絡電話", "Phone")}</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </div>
        <div>
          <label className={labelCls}>{T("執業醫師人數", "Number of practitioners")}</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            max={200}
            value={practitionerCount}
            onChange={(e) => setPractitionerCount(Number(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className={labelCls}>{T("地區 (例：中環 / 觀塘)", "District (e.g. Central / Kwun Tong)")}</label>
          <input className={inputCls} value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={100} />
        </div>
      </div>

      <div>
        <label className={labelCls}>{T("專長領域 (選填，用逗號分隔)", "Specialties (optional, comma-separated)")}</label>
        <input
          className={inputCls}
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          placeholder={T("例：內科、婦科、針灸、骨傷", "e.g. internal med, gynecology, acupuncture, ortho")}
          maxLength={500}
        />
      </div>

      <div>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={existing}
            onChange={(e) => setExisting(e.target.checked)}
            className="w-4 h-4"
          />
          {T("我們已經是 EBTCM 訂戶（額外 15% 折扣）", "We're already EBTCM subscribers (extra 15% off)")}
        </label>
      </div>

      {existing && (
        <div>
          <label className={labelCls}>{T("EBTCM 帳號電郵", "EBTCM account email")}</label>
          <input className={inputCls} type="email" value={ebtcmEmail} onChange={(e) => setEbtcmEmail(e.target.value)} maxLength={200} />
        </div>
      )}

      <div>
        <label className={labelCls}>{T("其他備註 (選填)", "Additional notes (optional)")}</label>
        <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </div>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-50/60 px-3 py-2 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white py-3 font-semibold disabled:opacity-50"
      >
        {busy ? T("提交中…", "Submitting…") : T("提交認證申請", "Submit Application")}
      </button>

      <p className="text-[10px] text-muted text-center leading-relaxed">
        {T(
          "提交申請即表示同意接收後續 EBTCM 認證流程相關電郵。提交後 3 個工作日內收到首次回覆。",
          "By submitting you agree to receive EBTCM certification process emails. First reply within 3 business days.",
        )}
      </p>
    </form>
  );
}
