"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

export function ClinicCreateForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(T("診所名稱為必填", "Clinic name is required"));
      return;
    }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/clinics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), address: address.trim() || null, phone: phone.trim() || null }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      setError(j.error ?? T("建立失敗", "Failed"));
      setSaving(false);
      return;
    }
    router.push(`/clinic/${j.id}`);
    router.refresh();
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-5 space-y-3">
      <div>
        <label className="block text-xs text-muted mb-1">{T("診所名稱 *", "Clinic name *")}</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted mb-1">{T("地址", "Address")}</label>
          <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{T("電話", "Phone")}</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </div>
      </div>
      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-50/60 px-3 py-2 text-sm text-red-700">
          ❌ {error}
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? T("建立中…", "Creating…") : T("建立診所", "Create clinic")}
      </button>
    </form>
  );
}
