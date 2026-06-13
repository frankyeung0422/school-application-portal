"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale: Locale;
  patientId: string;
}

export function ReferPatientButton({ locale, patientId }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [open, setOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!toEmail.trim()) {
      setError(T("請輸入對方電郵", "Email required"));
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/patients/${patientId}/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: toEmail.trim(), days, reason: reason.trim() || null }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok || !j.ok) {
      const err = j.error;
      setError(
        err === "user_not_found" ? T("查無此使用者", "User not found") :
        err === "user_not_practitioner" ? T("對方不是醫師", "User is not a practitioner") :
        err === "cannot_refer_self" ? T("不可轉介給自己", "Cannot refer to yourself") :
        (err ?? T("轉介失敗", "Failed")),
      );
      return;
    }
    setOpen(false);
    setToEmail("");
    setReason("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-surface"
      >
        ↪ {T("轉介", "Refer")}
      </button>
    );
  }

  const inputCls = "w-full rounded border border-border bg-background px-2 py-1.5 text-sm";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">↪ {T("轉介病人", "Refer Patient")}</h2>
        <p className="text-xs text-muted mb-3">
          {T(
            "對方在接受後將獲得限期唯讀存取權限。所有存取行為將記錄於審計日誌。",
            "On accept, the recipient gets time-boxed read-only access. All access is recorded in the audit log.",
          )}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1">{T("對方註冊電郵 *", "Recipient email *")}</label>
            <input
              className={inputCls}
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="practitioner@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{T("存取天數 (1-90)", "Access duration (1-90 days)")}</label>
            <input
              className={inputCls}
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 14)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{T("轉介原因 (選填)", "Reason (optional)")}</label>
            <textarea
              className={inputCls}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={T("如：需專科會診、二診意見", "e.g. specialty consult, second opinion")}
            />
          </div>
          {error && <p className="text-xs text-red-700">❌ {error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded border border-border bg-background px-3 py-1.5 text-sm"
          >
            {T("取消", "Cancel")}
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded bg-primary text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {busy ? T("送出中…", "Sending…") : T("送出轉介", "Send referral")}
          </button>
        </div>
      </div>
    </div>
  );
}
