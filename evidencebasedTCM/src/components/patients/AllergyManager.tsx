"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/types";

interface Allergy {
  id: string;
  type: "DRUG" | "FOOD" | "ENVIRONMENTAL" | "HERB" | "OTHER";
  allergen: string;
  reaction: string | null;
  severity: "MILD" | "MODERATE" | "SEVERE" | "ANAPHYLAXIS" | "UNKNOWN";
  notes: string | null;
}

interface Props {
  locale: Locale;
  patientId: string;
}

const SEV_CLS: Record<string, string> = {
  ANAPHYLAXIS: "bg-red-200 text-red-900",
  SEVERE: "bg-red-100 text-red-800",
  MODERATE: "bg-orange-100 text-orange-800",
  MILD: "bg-yellow-100 text-yellow-800",
  UNKNOWN: "bg-gray-100 text-gray-700",
};
const TYPE_LABEL: Record<string, { zh: string; en: string }> = {
  DRUG: { zh: "藥物", en: "Drug" },
  FOOD: { zh: "食物", en: "Food" },
  ENVIRONMENTAL: { zh: "環境", en: "Env" },
  HERB: { zh: "中藥", en: "Herb" },
  OTHER: { zh: "其他", en: "Other" },
};

export function AllergyManager({ locale, patientId }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [list, setList] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [allergen, setAllergen] = useState("");
  const [type, setType] = useState<Allergy["type"]>("DRUG");
  const [severity, setSeverity] = useState<Allergy["severity"]>("UNKNOWN");
  const [reaction, setReaction] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/allergies`);
    const j = await res.json();
    if (j.ok) setList(j.allergies as Allergy[]);
    setLoading(false);
  }

  async function add() {
    if (allergen.trim().length === 0) return;
    setAdding(true);
    const res = await fetch(`/api/patients/${patientId}/allergies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allergen: allergen.trim(), type, severity, reaction: reaction.trim() || null }),
    });
    if (res.ok) {
      setAllergen("");
      setReaction("");
      await load();
      router.refresh();
    }
    setAdding(false);
  }

  async function remove(id: string) {
    if (!confirm(T("移除此過敏記錄？", "Remove this allergy?"))) return;
    await fetch(`/api/patients/${patientId}/allergies?allergyId=${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  const inputCls = "rounded border border-border bg-background px-2 py-1 text-xs";

  return (
    <div>
      {loading ? (
        <p className="text-xs text-muted">{T("載入中…", "Loading…")}</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-muted mb-3">{T("尚無過敏記錄", "No allergies recorded")}</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {list.map((a) => {
            const lbl = TYPE_LABEL[a.type];
            return (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted w-12">{isZh ? lbl.zh : lbl.en}</span>
                <span className="font-medium">{a.allergen}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${SEV_CLS[a.severity]}`}>
                  {a.severity}
                </span>
                {a.reaction && <span className="text-xs text-muted">→ {a.reaction}</span>}
                <button onClick={() => remove(a.id)} className="ml-auto text-xs text-muted hover:text-red-500">✕</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        <select value={type} onChange={(e) => setType(e.target.value as Allergy["type"])} className={inputCls}>
          <option value="DRUG">{T("藥物", "Drug")}</option>
          <option value="FOOD">{T("食物", "Food")}</option>
          <option value="HERB">{T("中藥", "Herb")}</option>
          <option value="ENVIRONMENTAL">{T("環境", "Environmental")}</option>
          <option value="OTHER">{T("其他", "Other")}</option>
        </select>
        <input
          className={`${inputCls} flex-1 min-w-[8rem]`}
          placeholder={T("過敏原 (如：penicillin)", "Allergen (e.g. penicillin)")}
          value={allergen}
          onChange={(e) => setAllergen(e.target.value)}
        />
        <input
          className={`${inputCls} min-w-[6rem]`}
          placeholder={T("反應 (選填)", "Reaction (opt)")}
          value={reaction}
          onChange={(e) => setReaction(e.target.value)}
        />
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Allergy["severity"])} className={inputCls}>
          <option value="UNKNOWN">{T("嚴重度", "Severity")}</option>
          <option value="MILD">{T("輕度", "Mild")}</option>
          <option value="MODERATE">{T("中度", "Moderate")}</option>
          <option value="SEVERE">{T("嚴重", "Severe")}</option>
          <option value="ANAPHYLAXIS">{T("過敏性休克", "Anaphylaxis")}</option>
        </select>
        <button onClick={add} disabled={adding || allergen.trim().length === 0} className="text-xs rounded bg-primary text-white px-2 py-1 disabled:opacity-50">
          {T("+ 加入", "+ Add")}
        </button>
      </div>
    </div>
  );
}
