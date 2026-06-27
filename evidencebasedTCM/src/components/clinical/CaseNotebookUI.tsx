"use client";

import { useEffect, useRef, useState } from "react";
import { loadCases, saveCases, newCase, type CaseNotebook } from "@/lib/clinical/storage";

interface Props {
  locale: "zh-Hant" | "en";
  userId: string | null;
  initialCases: CaseNotebook[];
}

export function CaseNotebookUI({ locale, userId, initialCases }: Props) {
  const isZh = locale === "zh-Hant";
  const serverMode = !!userId;

  const [cases, setCases] = useState<CaseNotebook[]>(() =>
    serverMode ? initialCases : loadCases()
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => (serverMode ? initialCases : loadCases())[0]?.id ?? null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep localStorage in sync for anonymous users
  useEffect(() => {
    if (!serverMode) saveCases(cases);
  }, [cases, serverMode]);

  const active = cases.find((c) => c.id === activeId) ?? null;

  const create = async () => {
    if (serverMode) {
      try {
        const res = await fetch("/api/case-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const created = (await res.json()) as CaseNotebook;
          setCases((prev) => [created, ...prev]);
          setActiveId(created.id);
        }
      } catch { /* network error — silently ignore */ }
    } else {
      const c = newCase();
      setCases((prev) => [c, ...prev]);
      setActiveId(c.id);
    }
  };

  const update = (patch: Partial<CaseNotebook>) => {
    if (!active) return;
    const updated = { ...active, ...patch, updatedAt: new Date().toISOString() };
    setCases((prev) => prev.map((c) => (c.id === active.id ? updated : c)));

    if (serverMode) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await fetch(`/api/case-notes/${active.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      }, 800);
    }
  };

  const remove = async (id: string) => {
    if (serverMode) {
      try {
        await fetch(`/api/case-notes/${id}`, { method: "DELETE" });
      } catch { /* ignore */ }
    }
    const next = cases.filter((c) => c.id !== id);
    setCases(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  return (
    <div className="space-y-3">
      {!serverMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {isZh
            ? "目前僅儲存於瀏覽器。"
            : "Data stored in this browser only."}{" "}
          <a href="/login" className="underline font-medium">
            {isZh ? "登入以同步至帳戶" : "Log in to sync across devices"}
          </a>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-border bg-surface p-3">
          <button
            type="button"
            onClick={create}
            className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-white hover:bg-primary-dark mb-3"
          >
            + {isZh ? "新增病例" : "New case"}
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
                    {c.patientInitials || (isZh ? "未命名" : "Untitled")}
                  </div>
                  <div className="text-xs text-muted truncate">{c.chiefComplaint || "—"}</div>
                  <div className="text-xs text-muted">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              </li>
            ))}
            {cases.length === 0 && (
              <li className="text-xs text-muted text-center py-4">
                {isZh ? "尚無病例" : "No cases"}
              </li>
            )}
          </ul>
        </aside>

        {active ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-muted">
                  {isZh ? "患者識別" : "Patient initials"}
                </span>
                <input
                  type="text"
                  value={active.patientInitials}
                  onChange={(e) => update({ patientInitials: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
                />
              </label>
              <div className="text-xs text-muted self-end pb-1.5">
                {isZh ? "建立" : "Created"}: {new Date(active.createdAt).toLocaleString()}
                {serverMode && (
                  <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                    ✓ {isZh ? "已同步" : "Synced"}
                  </span>
                )}
              </div>
            </div>
            <label className="block">
              <span className="text-xs text-muted">{isZh ? "主訴" : "Chief complaint"}</span>
              <textarea
                value={active.chiefComplaint}
                onChange={(e) => update({ chiefComplaint: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">
                {isZh ? "辨證結論" : "Diagnosis / pattern"}
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
                {isZh ? "治療方案與追蹤" : "Plan & follow-up"}
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
                {isZh ? "列印" : "Print"}
              </button>
              <button
                type="button"
                onClick={() => remove(active.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 ml-auto"
              >
                {isZh ? "刪除" : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted text-sm">
            {isZh ? "請新增或選擇一筆病例。" : "Create or select a case."}
          </div>
        )}
      </div>
    </div>
  );
}
