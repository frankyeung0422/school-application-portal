"use client";

import { useMemo, useState } from "react";

interface DrugInteraction {
  drugName: string;
  drugClass: string | null;
  severity: string;
  clinicalEffect: string | null;
  management: string | null;
}
interface Contraindication {
  condition: string;
  severity: string;
  description: string | null;
  pregnancyCategory: string | null;
}
interface HerbPair {
  partnerId: string;
  partnerName: string;
  type: string;
  severity: string;
}
export interface HerbItem {
  id: string;
  name: string;
  drugInteractions: DrugInteraction[];
  contraindications: Contraindication[];
  herbPairs: HerbPair[];
}

interface Props {
  herbs: HerbItem[];
  locale: "zh-Hant" | "en";
}

const SEVERITY_COLOR: Record<string, string> = {
  CONTRAINDICATED: "bg-red-100 text-red-800 border-red-300",
  MAJOR: "bg-red-50 text-red-700 border-red-200",
  MODERATE: "bg-amber-50 text-amber-800 border-amber-200",
  MINOR: "bg-blue-50 text-blue-700 border-blue-200",
};

export function SafetyChecker({ herbs, locale }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drugs, setDrugs] = useState("");
  const [pregnancy, setPregnancy] = useState(false);
  const [query, setQuery] = useState("");

  const visible = herbs
    .filter((h) => h.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);
  const selectedHerbs = herbs.filter((h) => selected.has(h.id));

  const warnings = useMemo(() => {
    const list: { severity: string; type: string; message: string }[] = [];
    // Pairwise herb interactions
    for (const h of selectedHerbs) {
      for (const p of h.herbPairs) {
        if (selected.has(p.partnerId)) {
          list.push({
            severity: p.severity,
            type: locale === "zh-Hant" ? "中藥配伍" : "Herb-herb",
            message: `${h.name} × ${p.partnerName} · ${p.type}`,
          });
        }
      }
    }
    // Drug interactions (user-entered drug names)
    const drugList = drugs
      .split(/[,;、\n]/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    for (const h of selectedHerbs) {
      for (const di of h.drugInteractions) {
        if (drugList.some((d) => di.drugName.toLowerCase().includes(d) || (di.drugClass ?? "").toLowerCase().includes(d))) {
          list.push({
            severity: di.severity,
            type: locale === "zh-Hant" ? "中西藥" : "Herb-drug",
            message: `${h.name} × ${di.drugName}${di.clinicalEffect ? " — " + di.clinicalEffect : ""}`,
          });
        }
      }
    }
    // Pregnancy contraindications
    if (pregnancy) {
      for (const h of selectedHerbs) {
        for (const c of h.contraindications) {
          if (c.pregnancyCategory === "CONTRAINDICATED" || c.pregnancyCategory === "CAUTION") {
            list.push({
              severity: c.pregnancyCategory === "CONTRAINDICATED" ? "CONTRAINDICATED" : "MAJOR",
              type: locale === "zh-Hant" ? "妊娠" : "Pregnancy",
              message: `${h.name} · ${c.condition}`,
            });
          }
        }
      }
    }
    // Sort by severity
    const order: Record<string, number> = { CONTRAINDICATED: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
    return list.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  }, [selectedHerbs, selected, drugs, pregnancy, locale]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">
            {locale === "zh-Hant" ? "選擇中藥" : "Select herbs"} ({selected.size})
          </h3>
          <input
            type="text"
            placeholder={locale === "zh-Hant" ? "搜尋中藥…" : "Search herbs..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm mb-2"
          />
          <div className="flex flex-wrap gap-1.5 max-h-64 overflow-auto p-2 border border-border rounded bg-surface">
            {visible.map((h) => {
              const on = selected.has(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    const next = new Set(selected);
                    if (on) next.delete(h.id);
                    else next.add(h.id);
                    setSelected(next);
                  }}
                  className={`rounded-full px-2 py-0.5 text-xs border ${
                    on ? "bg-primary text-white border-primary" : "border-border text-muted"
                  }`}
                >
                  {h.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">
            {locale === "zh-Hant" ? "目前服用西藥" : "Current Western medications"}
          </h3>
          <textarea
            value={drugs}
            onChange={(e) => setDrugs(e.target.value)}
            rows={3}
            placeholder={locale === "zh-Hant" ? "以逗號分隔，如：warfarin, aspirin" : "Comma-separated, e.g. warfarin, aspirin"}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pregnancy}
            onChange={(e) => setPregnancy(e.target.checked)}
          />
          <span>{locale === "zh-Hant" ? "病人妊娠" : "Patient is pregnant"}</span>
        </label>
      </div>

      <div className="lg:sticky lg:top-20 self-start">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-3">
            {locale === "zh-Hant" ? "警示" : "Warnings"} ({warnings.length})
          </h3>
          {warnings.length === 0 ? (
            <p className="text-xs text-muted">
              {selected.size === 0
                ? locale === "zh-Hant"
                  ? "請先選擇中藥。"
                  : "Select herbs to start."
                : locale === "zh-Hant"
                  ? "目前未偵測到警示。"
                  : "No warnings detected."}
            </p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className={`rounded-md border p-2 text-xs ${SEVERITY_COLOR[w.severity] ?? "border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs px-1 rounded bg-white/60">{w.severity}</span>
                    <span className="text-xs uppercase tracking-wider">{w.type}</span>
                  </div>
                  <div>{w.message}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
