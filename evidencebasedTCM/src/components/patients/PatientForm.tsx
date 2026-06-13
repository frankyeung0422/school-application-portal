"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

export interface PatientFormInitial {
  id?: string;
  name?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";
  dateOfBirth?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  occupation?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  westernMeds?: string | null;
  notes?: string | null;
}

interface Props {
  locale: Locale;
  mode: "create" | "edit";
  initial?: PatientFormInitial;
}

export function PatientForm({ locale, mode, initial }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [name, setName] = useState(initial?.name ?? "");
  const [gender, setGender] = useState<PatientFormInitial["gender"]>(initial?.gender ?? "UNDISCLOSED");
  const [dob, setDob] = useState(initial?.dateOfBirth?.slice(0, 10) ?? "");
  const [phone, setPhone] = useState(initial?.contactPhone ?? "");
  const [email, setEmail] = useState(initial?.contactEmail ?? "");
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [allergies, setAllergies] = useState(initial?.allergies ?? "");
  const [chronic, setChronic] = useState(initial?.chronicConditions ?? "");
  const [westernMeds, setWesternMeds] = useState(initial?.westernMeds ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(T("姓名為必填", "Name is required"));
      return;
    }
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/patients" : `/api/patients/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          gender,
          dateOfBirth: dob.length > 0 ? dob : null,
          contactPhone: phone,
          contactEmail: email,
          occupation,
          allergies,
          chronicConditions: chronic,
          westernMeds,
          notes,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? T("儲存失敗", "Save failed"));
        setSaving(false);
        return;
      }
      const id = j.id ?? initial?.id;
      router.push(`/patients/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
      setSaving(false);
    }
  }

  const label = "block text-xs font-medium text-muted mb-1";
  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  const textarea = `${input} font-mono text-xs`;

  return (
    <form onSubmit={onSubmit} className="space-y-5 bg-surface border border-border rounded-lg p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{T("姓名 *", "Name *")}</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </div>
        <div>
          <label className={label}>{T("性別", "Gender")}</label>
          <select className={input} value={gender} onChange={(e) => setGender(e.target.value as PatientFormInitial["gender"])}>
            <option value="UNDISCLOSED">{T("未填", "Not stated")}</option>
            <option value="MALE">{T("男", "Male")}</option>
            <option value="FEMALE">{T("女", "Female")}</option>
            <option value="OTHER">{T("其他", "Other")}</option>
          </select>
        </div>
        <div>
          <label className={label}>{T("出生日期", "Date of Birth")}</label>
          <input className={input} type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <label className={label}>{T("聯絡電話", "Phone")}</label>
          <input className={input} value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </div>
        <div>
          <label className={label}>{T("電郵", "Email")}</label>
          <input className={input} type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className={label}>{T("職業", "Occupation")}</label>
          <input className={input} value={occupation ?? ""} onChange={(e) => setOccupation(e.target.value)} maxLength={80} />
        </div>
      </div>

      <div>
        <label className={label}>
          {T("過敏史 (如：青黴素、海鮮)", "Allergies (e.g. penicillin, shellfish)")}
        </label>
        <textarea className={textarea} rows={2} value={allergies ?? ""} onChange={(e) => setAllergies(e.target.value)} />
      </div>

      <div>
        <label className={label}>
          {T("慢性病史 (如：高血壓、糖尿病)", "Chronic conditions (e.g. hypertension, T2DM)")}
        </label>
        <textarea className={textarea} rows={2} value={chronic ?? ""} onChange={(e) => setChronic(e.target.value)} />
      </div>

      <div>
        <label className={label}>
          {T("目前服用西藥 (逗號分隔，會自動比對中藥交互作用)", "Current Western meds (comma-separated; checked against herb-drug interactions)")}
        </label>
        <textarea
          className={textarea}
          rows={2}
          value={westernMeds ?? ""}
          onChange={(e) => setWesternMeds(e.target.value)}
          placeholder={T("warfarin, metformin, amlodipine", "warfarin, metformin, amlodipine")}
        />
      </div>

      <div>
        <label className={label}>{T("備註", "Notes")}</label>
        <textarea className={textarea} rows={3} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-50/60 dark:bg-red-900/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          ❌ {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary text-white px-5 py-2 text-sm font-medium hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? T("儲存中…", "Saving…") : T("儲存", "Save")}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-surface"
        >
          {T("取消", "Cancel")}
        </button>
      </div>
    </form>
  );
}
