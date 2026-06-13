"use client";

import { useEffect, useMemo, useState } from "react";
import { BodyMap, type BodyMapPoint } from "@/components/acupuncture/BodyMap";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import {
  emptyPrescription,
  loadPrescription,
  savePrescription,
  type PrescriptionDraft,
  type SelectedAcupoint,
  type SelectedHerb,
} from "@/lib/clinical/storage";

interface HerbSrc {
  id: string;
  name: string;
  chineseName: string;
  category: string;
  dosageRange: string | null;
}

interface Props {
  herbs: HerbSrc[];
  acupoints: BodyMapPoint[];
  locale: "zh-Hant" | "en";
}

type Severity = "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL";

interface HerbDetail {
  id: string;
  pinyinName: string;
  chineseName: string;
  category: string;
  description: string | null;
  modernPharmacology: string | null;
  drugInteractions: Array<{
    id: string;
    drugName: string;
    drugClass: string | null;
    severity: Severity;
    clinicalEffect: string | null;
    management: string | null;
  }>;
  contraindications: Array<{
    id: string;
    condition: string;
    severity: Severity;
    description: string | null;
    pregnancyCategory: string | null;
  }>;
  herbInteractionsA: Array<{
    id: string;
    severity: Severity;
    interactionType: string;
    description: string | null;
    herbB: { id: string; pinyinName: string; chineseName: string };
  }>;
  herbInteractionsB: Array<{
    id: string;
    severity: Severity;
    interactionType: string;
    description: string | null;
    herbA: { id: string; pinyinName: string; chineseName: string };
  }>;
}

interface AcupointDetail {
  id: string;
  code: string;
  pinyinName: string;
  chineseName: string;
  meridian: string;
  location: string | null;
  depth: string | null;
  actions: string | null;
  indications: string | null;
  contraindications: string | null;
}

interface PairWarning {
  herbAId: string;
  herbAName: string;
  herbBId: string;
  herbBName: string;
  severity: Severity;
  interactionType: string;
  description: string | null;
}

interface ContraWarning {
  herbId: string;
  herbName: string;
  condition: string;
  severity: Severity;
  description: string | null;
  pregnancyCategory: string | null;
}

const SEVERITY_RANK: Record<Severity, number> = {
  MAJOR: 0,
  MODERATE: 1,
  MINOR: 2,
  THEORETICAL: 3,
};

const SEVERITY_COLORS: Record<Severity, string> = {
  MAJOR: "bg-red-100 text-red-800 border-red-300",
  MODERATE: "bg-orange-100 text-orange-800 border-orange-300",
  MINOR: "bg-yellow-100 text-yellow-800 border-yellow-300",
  THEORETICAL: "bg-gray-100 text-gray-700 border-gray-300",
};

function severityLabel(locale: "zh-Hant" | "en", s: Severity): string {
  if (locale === "zh-Hant") {
    return { MAJOR: "嚴重", MODERATE: "中度", MINOR: "輕度", THEORETICAL: "理論" }[s];
  }
  return { MAJOR: "Major", MODERATE: "Moderate", MINOR: "Minor", THEORETICAL: "Theoretical" }[s];
}

function classicalLabel(locale: "zh-Hant" | "en", t: string): string {
  if (locale !== "zh-Hant") return t.replace(/_/g, " ");
  return (
    {
      XIANG_FAN: "相反（禁用）",
      XIANG_WEI: "相畏",
      XIANG_XU: "相須",
      XIANG_SHA: "相殺",
      XIANG_WU: "相惡",
      XIANG_JI: "相忌",
    } as Record<string, string>
  )[t] ?? t;
}

export function PrescriptionBuilder({ herbs, acupoints, locale }: Props) {
  const [draft, setDraft] = useState<PrescriptionDraft>(emptyPrescription());
  const [herbQuery, setHerbQuery] = useState("");
  const [pointQuery, setPointQuery] = useState("");
  const [herbDetails, setHerbDetails] = useState<Record<string, HerbDetail>>({});
  const [acupointDetails, setAcupointDetails] = useState<Record<string, AcupointDetail>>({});
  const [selectedInfo, setSelectedInfo] = useState<
    { kind: "herb" | "acupoint"; id: string } | null
  >(null);

  useEffect(() => {
    // Hydrate from localStorage on mount — intentionally a one-time sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadPrescription());
  }, []);

  useEffect(() => {
    savePrescription(draft);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    const missing = draft.herbs.filter((h) => !herbDetails[h.id]);
    if (missing.length === 0) return;
    (async () => {
      const results = await Promise.all(
        missing.map(async (h) => {
          try {
            const res = await fetch(`/api/herbs/${h.id}`);
            if (!res.ok) return null;
            return (await res.json()) as HerbDetail;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setHerbDetails((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) next[r.id] = r;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.herbs, herbDetails]);

  useEffect(() => {
    let cancelled = false;
    const missing = draft.acupoints.filter((p) => !acupointDetails[p.id]);
    if (missing.length === 0) return;
    (async () => {
      const results = await Promise.all(
        missing.map(async (p) => {
          try {
            const res = await fetch(`/api/acupuncture/${p.id}`);
            if (!res.ok) return null;
            return (await res.json()) as AcupointDetail;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setAcupointDetails((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) next[r.id] = r;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.acupoints, acupointDetails]);

  const addHerb = (h: HerbSrc) => {
    if (draft.herbs.some((x) => x.id === h.id)) return;
    const entry: SelectedHerb = {
      id: h.id,
      name: h.name,
      chineseName: h.chineseName,
      dosage: h.dosageRange ?? "",
    };
    setDraft({ ...draft, herbs: [...draft.herbs, entry] });
  };
  const addPoint = (p: BodyMapPoint) => {
    if (draft.acupoints.some((x) => x.id === p.id)) return;
    const entry: SelectedAcupoint = {
      id: p.id,
      code: p.code,
      name: locale === "zh-Hant" ? p.chineseName : p.pinyinName,
      meridian: p.meridian,
    };
    setDraft({ ...draft, acupoints: [...draft.acupoints, entry] });
  };
  const removeHerb = (id: string) => {
    setDraft({ ...draft, herbs: draft.herbs.filter((h) => h.id !== id) });
    if (selectedInfo?.kind === "herb" && selectedInfo.id === id) setSelectedInfo(null);
  };
  const removePoint = (id: string) => {
    setDraft({ ...draft, acupoints: draft.acupoints.filter((p) => p.id !== id) });
    if (selectedInfo?.kind === "acupoint" && selectedInfo.id === id) setSelectedInfo(null);
  };
  const updateHerbDosage = (id: string, dosage: string) =>
    setDraft({
      ...draft,
      herbs: draft.herbs.map((h) => (h.id === id ? { ...h, dosage } : h)),
    });

  const visibleHerbs = herbs
    .filter(
      (h) =>
        h.name.toLowerCase().includes(herbQuery.toLowerCase()) ||
        h.chineseName.includes(herbQuery),
    )
    .slice(0, 40);
  const visiblePoints = acupoints
    .filter(
      (p) =>
        p.code.toLowerCase().includes(pointQuery.toLowerCase()) ||
        p.pinyinName.toLowerCase().includes(pointQuery.toLowerCase()) ||
        p.chineseName.includes(pointQuery),
    )
    .slice(0, 40);

  const selectedPointsForMap = acupoints.filter((p) =>
    draft.acupoints.some((x) => x.id === p.id),
  );

  // Derived warnings
  const { pairWarnings, contraWarnings } = useMemo(() => {
    const selectedIds = new Set(draft.herbs.map((h) => h.id));
    const seenPair = new Set<string>();
    const pairs: PairWarning[] = [];
    const contras: ContraWarning[] = [];
    for (const h of draft.herbs) {
      const detail = herbDetails[h.id];
      if (!detail) continue;
      for (const ix of detail.herbInteractionsA) {
        if (!selectedIds.has(ix.herbB.id)) continue;
        const key = [h.id, ix.herbB.id].sort().join(":");
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        pairs.push({
          herbAId: h.id,
          herbAName: h.name,
          herbBId: ix.herbB.id,
          herbBName:
            locale === "zh-Hant"
              ? localizeDbText(ix.herbB.chineseName, locale) ?? ix.herbB.pinyinName
              : ix.herbB.pinyinName,
          severity: ix.severity,
          interactionType: ix.interactionType,
          description: ix.description,
        });
      }
      for (const ix of detail.herbInteractionsB) {
        if (!selectedIds.has(ix.herbA.id)) continue;
        const key = [h.id, ix.herbA.id].sort().join(":");
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        pairs.push({
          herbAId: h.id,
          herbAName: h.name,
          herbBId: ix.herbA.id,
          herbBName:
            locale === "zh-Hant"
              ? localizeDbText(ix.herbA.chineseName, locale) ?? ix.herbA.pinyinName
              : ix.herbA.pinyinName,
          severity: ix.severity,
          interactionType: ix.interactionType,
          description: ix.description,
        });
      }
      for (const ci of detail.contraindications) {
        contras.push({
          herbId: h.id,
          herbName: h.name,
          condition: ci.condition,
          severity: ci.severity,
          description: ci.description,
          pregnancyCategory: ci.pregnancyCategory,
        });
      }
    }
    pairs.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    contras.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    return { pairWarnings: pairs, contraWarnings: contras };
  }, [draft.herbs, herbDetails, locale]);

  const totalWarnings = pairWarnings.length + contraWarnings.length;
  const worstSeverity: Severity | null = useMemo(() => {
    const all: Severity[] = [
      ...pairWarnings.map((p) => p.severity),
      ...contraWarnings.map((c) => c.severity),
    ];
    if (all.length === 0) return null;
    return all.sort((a, b) => SEVERITY_RANK[a] - SEVERITY_RANK[b])[0];
  }, [pairWarnings, contraWarnings]);

  const print = () => window.print();

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prescription-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeHerb =
    selectedInfo?.kind === "herb" ? herbDetails[selectedInfo.id] : undefined;
  const activeAcupoint =
    selectedInfo?.kind === "acupoint" ? acupointDetails[selectedInfo.id] : undefined;
  const activeLoading =
    selectedInfo !== null && !activeHerb && !activeAcupoint;

  const t = {
    clickHint:
      locale === "zh-Hant" ? "點擊以查看功效" : "Click for indications",
    warningsTitle: locale === "zh-Hant" ? "處方警示" : "Prescription warnings",
    noWarnings: locale === "zh-Hant" ? "目前無已知配伍禁忌" : "No known conflicts",
    pairHeading: locale === "zh-Hant" ? "中藥配伍" : "Herb-herb interaction",
    contraHeading: locale === "zh-Hant" ? "禁忌證" : "Contraindication",
    actions: locale === "zh-Hant" ? "功效" : "Actions",
    indications: locale === "zh-Hant" ? "主治" : "Indications",
    modernPharm: locale === "zh-Hant" ? "現代藥理" : "Modern pharmacology",
    contraindications: locale === "zh-Hant" ? "禁忌 / 注意" : "Contraindications",
    drugIx: locale === "zh-Hant" ? "西藥交互作用" : "Drug interactions",
    location: locale === "zh-Hant" ? "定位" : "Location",
    loading: locale === "zh-Hant" ? "載入中…" : "Loading…",
    close: locale === "zh-Hant" ? "關閉" : "Close",
  };

  return (
    <div>
      {totalWarnings > 0 && worstSeverity && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm print:hidden ${SEVERITY_COLORS[worstSeverity]}`}
        >
          <div className="flex items-center gap-2 font-semibold mb-1">
            <span aria-hidden>⚠</span>
            <span>
              {t.warningsTitle} ({totalWarnings})
            </span>
          </div>
          <ul className="space-y-1.5">
            {pairWarnings.map((w) => (
              <li key={`p-${w.herbAId}-${w.herbBId}`} className="text-xs leading-relaxed">
                <span
                  className={`mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold align-middle ${SEVERITY_COLORS[w.severity]}`}
                >
                  {severityLabel(locale, w.severity)}
                </span>
                <span className="font-medium">{t.pairHeading}:</span>{" "}
                {w.herbAName} ↔ {w.herbBName} ·{" "}
                <span className="italic">{classicalLabel(locale, w.interactionType)}</span>
                {w.description && (
                  <span className="block text-muted mt-0.5">
                    {localizeDbText(w.description, locale)}
                  </span>
                )}
              </li>
            ))}
            {contraWarnings.map((w, i) => (
              <li key={`c-${w.herbId}-${i}`} className="text-xs leading-relaxed">
                <span
                  className={`mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold align-middle ${SEVERITY_COLORS[w.severity]}`}
                >
                  {severityLabel(locale, w.severity)}
                </span>
                <span className="font-medium">{t.contraHeading}:</span> {w.herbName} —{" "}
                {localizeDbText(w.condition, locale)}
                {w.pregnancyCategory === "CONTRAINDICATED" && (
                  <span className="ml-1 text-red-700 font-semibold">
                    {locale === "zh-Hant" ? "(孕婦禁用)" : "(pregnancy contraindicated)"}
                  </span>
                )}
                {w.description && (
                  <span className="block text-muted mt-0.5">
                    {localizeDbText(w.description, locale)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] print:grid-cols-1">
        <div className="space-y-5">
          <label className="block">
            <span className="text-xs text-muted">
              {locale === "zh-Hant" ? "患者識別" : "Patient initials"}
            </span>
            <input
              type="text"
              value={draft.patientInitials}
              onChange={(e) => setDraft({ ...draft, patientInitials: e.target.value })}
              className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>

          <div>
            <h3 className="text-sm font-semibold mb-2">
              {locale === "zh-Hant" ? "中藥組成" : "Herbs"} ({draft.herbs.length})
              {draft.herbs.length > 0 && (
                <span className="ml-2 text-[10px] font-normal text-muted print:hidden">
                  {t.clickHint}
                </span>
              )}
            </h3>
            <input
              type="text"
              placeholder={locale === "zh-Hant" ? "搜尋中藥…" : "Search herbs..."}
              value={herbQuery}
              onChange={(e) => setHerbQuery(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm mb-2 print:hidden"
            />
            <div className="flex flex-wrap gap-1 mb-2 max-h-32 overflow-auto p-1 rounded border border-border bg-surface print:hidden">
              {visibleHerbs.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => addHerb(h)}
                  className="rounded-full px-2 py-0.5 text-xs border border-border text-muted hover:text-foreground"
                >
                  + {h.name}
                </button>
              ))}
            </div>
            <table className="w-full text-xs">
              <tbody>
                {draft.herbs.map((h) => {
                  const hasWarning =
                    pairWarnings.some((w) => w.herbAId === h.id || w.herbBId === h.id) ||
                    contraWarnings.some((w) => w.herbId === h.id);
                  const active =
                    selectedInfo?.kind === "herb" && selectedInfo.id === h.id;
                  return (
                    <tr
                      key={h.id}
                      className={`border-b border-border ${active ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-1.5 pr-2">
                        <button
                          type="button"
                          onClick={() => setSelectedInfo({ kind: "herb", id: h.id })}
                          className="text-left hover:text-primary hover:underline"
                        >
                          {hasWarning && (
                            <span className="mr-1 text-orange-600" aria-hidden>
                              ⚠
                            </span>
                          )}
                          {h.name}
                        </button>
                      </td>
                      <td className="py-1.5">
                        <input
                          type="text"
                          value={h.dosage ?? ""}
                          onChange={(e) => updateHerbDosage(h.id, e.target.value)}
                          className="w-24 rounded border border-border bg-surface px-1 py-0.5 text-xs print:border-0 print:bg-transparent"
                        />
                      </td>
                      <td className="text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => removeHerb(h.id)}
                          className="text-muted hover:text-red-600 text-xs"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {draft.herbs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-muted text-xs">
                      {locale === "zh-Hant" ? "尚未選擇中藥" : "No herbs selected"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">
              {locale === "zh-Hant" ? "針灸取穴" : "Acupoints"} ({draft.acupoints.length})
            </h3>
            <input
              type="text"
              placeholder={locale === "zh-Hant" ? "搜尋穴位…" : "Search points..."}
              value={pointQuery}
              onChange={(e) => setPointQuery(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm mb-2 print:hidden"
            />
            <div className="flex flex-wrap gap-1 mb-2 max-h-32 overflow-auto p-1 rounded border border-border bg-surface print:hidden">
              {visiblePoints.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPoint(p)}
                  className="rounded-full px-2 py-0.5 text-xs border border-border text-muted hover:text-foreground"
                >
                  + {p.code}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {draft.acupoints.map((p) => {
                const active =
                  selectedInfo?.kind === "acupoint" && selectedInfo.id === p.id;
                return (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${active ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedInfo({ kind: "acupoint", id: p.id })}
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      <span className="font-mono">{p.code}</span>
                      <span>{p.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removePoint(p.id)}
                      className="text-muted hover:text-red-600 print:hidden"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block">
              <span className="text-xs text-muted">
                {locale === "zh-Hant" ? "醫囑備註" : "Notes"}
              </span>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={print}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
            >
              {locale === "zh-Hant" ? "列印 / PDF" : "Print / PDF"}
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-primary/5"
            >
              {locale === "zh-Hant" ? "匯出 JSON" : "Export JSON"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(emptyPrescription());
                setSelectedInfo(null);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-red-50 text-red-700"
            >
              {locale === "zh-Hant" ? "清空" : "Clear"}
            </button>
          </div>
        </div>

        <div className="print:hidden space-y-4">
          {selectedInfo && (
            <div className="rounded-lg border border-border bg-surface p-4 text-sm">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">
                  {activeHerb
                    ? locale === "zh-Hant"
                      ? localizeDbText(activeHerb.chineseName, locale) ?? activeHerb.pinyinName
                      : activeHerb.pinyinName
                    : activeAcupoint
                      ? `${activeAcupoint.code} · ${locale === "zh-Hant" ? (localizeDbText(activeAcupoint.chineseName, locale) ?? activeAcupoint.pinyinName) : activeAcupoint.pinyinName}`
                      : t.loading}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedInfo(null)}
                  className="text-xs text-muted hover:text-foreground"
                >
                  {t.close} ✕
                </button>
              </div>

              {activeLoading && <p className="text-xs text-muted">{t.loading}</p>}

              {activeHerb && (
                <div className="space-y-3 text-xs leading-relaxed">
                  {activeHerb.description && (
                    <section>
                      <h5 className="font-semibold mb-0.5">{t.actions} / {t.indications}</h5>
                      <p className="text-muted whitespace-pre-line">
                        {localizeDbText(activeHerb.description, locale)}
                      </p>
                    </section>
                  )}
                  {activeHerb.modernPharmacology && (
                    <section>
                      <h5 className="font-semibold mb-0.5">{t.modernPharm}</h5>
                      <p className="text-muted whitespace-pre-line">
                        {localizeDbText(activeHerb.modernPharmacology, locale)}
                      </p>
                    </section>
                  )}
                  {activeHerb.contraindications.length > 0 && (
                    <section>
                      <h5 className="font-semibold mb-1">{t.contraindications}</h5>
                      <ul className="space-y-1">
                        {activeHerb.contraindications.map((c) => (
                          <li
                            key={c.id}
                            className={`rounded border px-2 py-1 ${SEVERITY_COLORS[c.severity]}`}
                          >
                            <span className="font-medium">
                              {localizeDbText(c.condition, locale)}
                            </span>
                            <span className="ml-2 text-[10px] font-semibold">
                              [{severityLabel(locale, c.severity)}]
                            </span>
                            {c.description && (
                              <div className="mt-0.5 opacity-80">
                                {localizeDbText(c.description, locale)}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {activeHerb.drugInteractions.length > 0 && (
                    <section>
                      <h5 className="font-semibold mb-1">{t.drugIx}</h5>
                      <ul className="space-y-1">
                        {activeHerb.drugInteractions.map((d) => (
                          <li
                            key={d.id}
                            className={`rounded border px-2 py-1 ${SEVERITY_COLORS[d.severity]}`}
                          >
                            <span className="font-medium">
                              {localizeDbText(d.drugName, locale)}
                            </span>
                            <span className="ml-2 text-[10px] font-semibold">
                              [{severityLabel(locale, d.severity)}]
                            </span>
                            {d.clinicalEffect && (
                              <div className="mt-0.5 opacity-80">
                                {localizeDbText(d.clinicalEffect, locale)}
                              </div>
                            )}
                            {d.management && (
                              <div className="mt-0.5 opacity-80 italic">
                                {localizeDbText(d.management, locale)}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {!activeHerb.description &&
                    !activeHerb.modernPharmacology &&
                    activeHerb.contraindications.length === 0 &&
                    activeHerb.drugInteractions.length === 0 && (
                      <p className="text-muted italic">
                        {locale === "zh-Hant" ? "尚無詳細資料。" : "No details available."}
                      </p>
                    )}
                </div>
              )}

              {activeAcupoint && (
                <div className="space-y-3 text-xs leading-relaxed">
                  {activeAcupoint.location && (
                    <section>
                      <h5 className="font-semibold mb-0.5">{t.location}</h5>
                      <p className="text-muted whitespace-pre-line">
                        {localizeDbText(activeAcupoint.location, locale)}
                      </p>
                    </section>
                  )}
                  {activeAcupoint.actions && (
                    <section>
                      <h5 className="font-semibold mb-0.5">{t.actions}</h5>
                      <p className="text-muted whitespace-pre-line">
                        {localizeDbText(activeAcupoint.actions, locale)}
                      </p>
                    </section>
                  )}
                  {activeAcupoint.indications && (
                    <section>
                      <h5 className="font-semibold mb-0.5">{t.indications}</h5>
                      <p className="text-muted whitespace-pre-line">
                        {localizeDbText(activeAcupoint.indications, locale)}
                      </p>
                    </section>
                  )}
                  {activeAcupoint.contraindications && (
                    <section className="rounded border border-red-300 bg-red-50 px-2 py-1.5 text-red-800">
                      <h5 className="font-semibold mb-0.5">{t.contraindications}</h5>
                      <p className="whitespace-pre-line">
                        {localizeDbText(activeAcupoint.contraindications, locale)}
                      </p>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          <BodyMap
            points={selectedPointsForMap}
            locale={locale}
            labels={{
              front: locale === "zh-Hant" ? "正面" : "Anterior",
              back: locale === "zh-Hant" ? "背面" : "Posterior",
              allMeridians: locale === "zh-Hant" ? "所有經絡" : "All meridians",
              clickHint: locale === "zh-Hant" ? "選取的穴位" : "Selected points",
              noMapping: locale === "zh-Hant" ? "此穴位尚未標定" : "Not mapped",
            }}
          />
        </div>
      </div>
    </div>
  );
}
