"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { searchDrugs, type DrugRecord } from "@/lib/safety/rxnorm-subset";
import type { Locale } from "@/lib/i18n/types";

interface Medication {
  id: string;
  drugGeneric: string;
  displayName: string;
  drugClass: string | null;
  dose: string | null;
  route: string | null;
  prn: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

interface Props {
  locale: Locale;
  patientId: string;
}

export function MedicationManager({ locale, patientId }: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [list, setList] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const [drugQuery, setDrugQuery] = useState("");
  const [chosen, setChosen] = useState<DrugRecord | null>(null);
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("PO");
  const [prn, setPrn] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const suggestions = useMemo(() => searchDrugs(drugQuery, 8), [drugQuery]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/medications`);
    const j = await res.json();
    if (j.ok) setList(j.medications as Medication[]);
    setLoading(false);
  }

  async function add() {
    if (!chosen) return;
    const res = await fetch(`/api/patients/${patientId}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drugGeneric: chosen.generic,
        displayName: chosen.display,
        drugClass: chosen.className,
        dose, route, prn,
        startDate: startDate || null,
        endDate: endDate || null,
      }),
    });
    if (res.ok) {
      setChosen(null);
      setDrugQuery("");
      setDose("");
      setStartDate("");
      setEndDate("");
      setPrn(false);
      await load();
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm(T("移除此用藥？", "Remove this medication?"))) return;
    await fetch(`/api/patients/${patientId}/medications?medicationId=${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  const inputCls = "rounded border border-border bg-background px-2 py-1 text-xs";

  return (
    <div>
      {loading ? (
        <p className="text-xs text-muted">{T("載入中…", "Loading…")}</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-muted mb-3">{T("尚無用藥記錄", "No medications recorded")}</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {list.map((m) => {
            const active = !m.endDate;
            return (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span className={`text-[10px] w-12 ${active ? "text-green-700" : "text-muted"}`}>
                  {active ? T("使用中", "Active") : T("已停", "Past")}
                </span>
                <span className="font-medium">{m.displayName}</span>
                {m.drugClass && <span className="text-[10px] text-muted">{m.drugClass}</span>}
                {m.dose && <span className="text-xs">{m.dose}</span>}
                {m.route && <span className="text-[10px] text-muted">{m.route}</span>}
                {m.prn && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">PRN</span>}
                <button onClick={() => remove(m.id)} className="ml-auto text-xs text-muted hover:text-red-500">✕</button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative">
        {chosen ? (
          <div className="rounded-md border border-border bg-background p-2 flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium text-sm">{chosen.display}</span>
            <span className="text-[10px] text-muted">{chosen.className}</span>
            <button onClick={() => setChosen(null)} className="text-xs text-muted hover:text-red-500">✕</button>
          </div>
        ) : (
          <>
            <input
              className={`${inputCls} w-full text-sm`}
              placeholder={T("搜尋藥物 (generic / brand / 中文)", "Search drug (generic / brand / Chinese)")}
              value={drugQuery}
              onChange={(e) => setDrugQuery(e.target.value)}
            />
            {drugQuery.trim().length > 0 && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                {suggestions.map((d) => (
                  <li key={d.generic}>
                    <button
                      onClick={() => { setChosen(d); setDrugQuery(""); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-surface text-sm"
                    >
                      <span className="font-medium">{d.display}</span>{" "}
                      <span className="text-xs text-muted">· {d.className}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {chosen && (
        <div className="flex flex-wrap gap-1.5 items-center mt-2">
          <input className={inputCls} placeholder={T("劑量 (如 5mg daily)", "Dose (e.g. 5mg daily)")} value={dose} onChange={(e) => setDose(e.target.value)} />
          <select value={route} onChange={(e) => setRoute(e.target.value)} className={inputCls}>
            <option value="PO">PO</option>
            <option value="SC">SC</option>
            <option value="IV">IV</option>
            <option value="IM">IM</option>
            <option value="Topical">{T("外用", "Topical")}</option>
            <option value="Inhaled">{T("吸入", "Inhaled")}</option>
          </select>
          <label className="text-xs inline-flex items-center gap-1">
            <input type="checkbox" checked={prn} onChange={(e) => setPrn(e.target.checked)} />
            PRN
          </label>
          <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title={T("開始", "Start")} />
          <input className={inputCls} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title={T("結束 (留空 = 仍在服)", "End (blank = active)")} />
          <button onClick={add} className="text-xs rounded bg-primary text-white px-2 py-1">{T("+ 加入用藥", "+ Add")}</button>
        </div>
      )}
    </div>
  );
}
