"use client";

import { useEffect, useState } from "react";
import { loadCases, saveCases, newCase, type CaseNotebook } from "@/lib/clinical/storage";

export function CaseNotebookUI({ locale }: { locale: "zh-Hant" | "en" }) {
  const [cases, setCases] = useState<CaseNotebook[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadCases();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCases(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
  }, []);

  const active = cases.find((c) => c.id === activeId) ?? null;

  const persist = (next: CaseNotebook[]) => {
    setCases(next);
    saveCases(next);
  };

  const create = () => {
    const c = newCase();
    const next = [c, ...cases];
    persist(next);
    setActiveId(c.id);
  };

  const update = (patch: Partial<CaseNotebook>) => {
    if (!active) return;
    const next = cases.map((c) =>
      c.id === active.id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    );
    persist(next);
  };

  const remove = (id: string) => {
    const next = cases.filter((c) => c.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border border-border bg-surface p-3">
        <button
          type="button"
          onClick={create}
          className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-white hover:bg-primary-dark mb-3"
        >
          + {locale === "zh-Hant" ? "新增病例" : "New case"}
        </button>
        <ul className="space-y-1">
          {cases.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors ${
                  activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-border/50"
                }`}
              >
                <div className="font-medium">
                  {c.patientInitials || (locale === "zh-Hant" ? "未命名" : "Untitled")}
                </div>
                <div className="text-[10px] text-muted truncate">
                  {c.chiefComplaint || "—"}
                </div>
                <div className="text-[10px] text-muted">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </div>
              </button>
            </li>
          ))}
          {cases.length === 0 && (
            <li className="text-xs text-muted text-center py-4">
              {locale === "zh-Hant" ? "尚無病例" : "No cases"}
            </li>
          )}
        </ul>
      </aside>

      {active ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted">
                {locale === "zh-Hant" ? "患者識別" : "Patient initials"}
              </span>
              <input
                type="text"
                value={active.patientInitials}
                onChange={(e) => update({ patientInitials: e.target.value })}
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
              />
            </label>
            <div className="text-xs text-muted self-end pb-1.5">
              {locale === "zh-Hant" ? "建立" : "Created"}: {new Date(active.createdAt).toLocaleString()}
            </div>
          </div>
          <label className="block">
            <span className="text-xs text-muted">
              {locale === "zh-Hant" ? "主訴" : "Chief complaint"}
            </span>
            <textarea
              value={active.chiefComplaint}
              onChange={(e) => update({ chiefComplaint: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">
              {locale === "zh-Hant" ? "辨證結論" : "Diagnosis / pattern"}
            </span>
            <textarea
              value={active.diagnosis}
              onChange={(e) => update({ diagnosis: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">
              {locale === "zh-Hant" ? "治療方案與追蹤" : "Plan & follow-up"}
            </span>
            <textarea
              value={active.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={8}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-primary/5"
            >
              {locale === "zh-Hant" ? "列印" : "Print"}
            </button>
            <button
              type="button"
              onClick={() => remove(active.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 ml-auto"
            >
              {locale === "zh-Hant" ? "刪除" : "Delete"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted text-sm">
          {locale === "zh-Hant" ? "請新增或選擇一筆病例。" : "Create or select a case."}
        </div>
      )}
    </div>
  );
}
