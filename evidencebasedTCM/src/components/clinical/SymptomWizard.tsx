"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const SYMPTOM_GROUPS: Record<string, string[]> = {
  寒熱: ["惡寒", "發熱", "畏寒", "潮熱", "低熱", "午後潮熱"],
  頭面: ["頭痛", "頭暈", "眩暈", "耳鳴", "目赤", "面紅"],
  情志: ["煩躁", "抑鬱", "易怒", "失眠", "健忘", "心悸"],
  消化: ["納差", "腹脹", "腹痛", "泄瀉", "便秘", "惡心", "嘔吐", "口苦"],
  氣血津液: ["氣短", "乏力", "自汗", "盜汗", "口乾", "口渴", "消瘦"],
  胸肺: ["咳嗽", "喘息", "咳痰", "胸悶", "胸痛"],
  婦科: ["月經不調", "痛經", "帶下", "閉經", "崩漏"],
  其他: ["水腫", "肢冷", "四肢麻木", "腰膝酸軟", "尿頻", "尿急"],
};
const TONGUE_FEATS = ["淡", "紅", "絳", "紫", "苔白", "苔黃", "苔膩", "苔少", "胖大", "瘦薄", "齒痕", "裂紋"];
const PULSE_FEATS = ["浮", "沉", "遲", "數", "滑", "澀", "弦", "緊", "細", "弱", "虛", "實"];

const ROLE_COLORS: Record<string, string> = {
  JUN: "bg-red-100 text-red-800",
  CHEN: "bg-amber-100 text-amber-800",
  ZUO: "bg-blue-100 text-blue-800",
  SHI: "bg-green-100 text-green-800",
};
const ROLE_LABELS: Record<string, string> = { JUN: "君", CHEN: "臣", ZUO: "佐", SHI: "使" };

interface FormulaHerb {
  id: string;
  name: string;
  chineseName: string;
  pinyinName: string;
  role: string;
  dosage: string | null;
  nature: string;
  dosageRange: string | null;
}

interface FormulaSuggestion {
  id: string;
  name: string;
  chineseName: string;
  pinyinName: string;
  source: string | null;
  actions: string | null;
  isPrimary: boolean;
  herbs: FormulaHerb[];
}

interface AcupointSuggestion {
  id: string;
  code: string;
  name: string;
  meridian: string;
}

interface ConditionSuggestion {
  id: string;
  westernName: string;
  chineseName: string | null;
  icd11Code: string | null;
  frequency: "COMMON" | "OCCASIONAL" | "RARE";
}

interface PatternSummary {
  id: string;
  name: string;
  pathologyType: string;
  keySymptoms: string;
  tongue: string;
  pulse: string;
  treatmentPrinciple: string;
  formulas: FormulaSuggestion[];
  acupoints: AcupointSuggestion[];
  conditions?: ConditionSuggestion[];
}

interface Props {
  patterns: PatternSummary[];
  locale: "zh-Hant" | "en";
}

export function SymptomWizard({ patterns, locale }: Props) {
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [tongue, setTongue] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState<Set<string>>(new Set());
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const ranked = useMemo(() => {
    const allQueries = [...symptoms, ...tongue, ...pulse];
    if (allQueries.length === 0) return [];
    return patterns
      .map((p) => {
        const hay = `${p.keySymptoms} ${p.tongue} ${p.pulse}`;
        let score = 0;
        for (const s of symptoms) if (p.keySymptoms.includes(s)) score += 2;
        for (const t of tongue) if (p.tongue.includes(t)) score += 1.5;
        for (const pl of pulse) if (p.pulse.includes(pl)) score += 1.5;
        const matched = allQueries.filter((q) => hay.includes(q));
        return { ...p, score, matched };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [symptoms, tongue, pulse, patterns]);

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
        active
          ? "bg-primary text-white border-primary"
          : "border-border text-muted hover:text-foreground hover:border-primary-light"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      {/* Left: Symptom selection */}
      <div className="space-y-5">
        {Object.entries(SYMPTOM_GROUPS).map(([group, items]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold mb-2">{group}</h3>
            <div className="flex flex-wrap gap-1.5">
              {items.map((s) => (
                <Chip key={s} active={symptoms.has(s)} onClick={() => toggle(symptoms, setSymptoms)(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold mb-2">舌象</h3>
          <div className="flex flex-wrap gap-1.5">
            {TONGUE_FEATS.map((s) => (
              <Chip key={s} active={tongue.has(s)} onClick={() => toggle(tongue, setTongue)(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">脈象</h3>
          <div className="flex flex-wrap gap-1.5">
            {PULSE_FEATS.map((s) => (
              <Chip key={s} active={pulse.has(s)} onClick={() => toggle(pulse, setPulse)(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSymptoms(new Set());
            setTongue(new Set());
            setPulse(new Set());
            setExpandedPattern(null);
          }}
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-primary/5"
        >
          {S("清空", "Reset")}
        </button>
      </div>

      {/* Right: Results with formula suggestions */}
      <div className="lg:sticky lg:top-20 self-start space-y-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-3">
            {S("候選證型與方劑建議", "Candidate Patterns & Formula Suggestions")} ({ranked.length})
          </h3>
          {ranked.length === 0 ? (
            <p className="text-xs text-muted">
              {S("請選擇症狀與舌脈開始辨證。", "Select symptoms and tongue/pulse to begin.")}
            </p>
          ) : (
            <ol className="space-y-3">
              {ranked.map((p, i) => {
                const maxScore = ranked[0].score;
                const pct = Math.round((p.score / maxScore) * 100);
                const isExpanded = expandedPattern === p.id;

                return (
                  <li key={p.id} className="rounded-md border border-border overflow-hidden">
                    {/* Pattern header */}
                    <button
                      type="button"
                      onClick={() => setExpandedPattern(isExpanded ? null : p.id)}
                      className="w-full text-left p-3 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {i + 1}. {p.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted">{pct}%</span>
                          <span className="text-xs text-muted">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-border rounded overflow-hidden mb-2">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-muted">
                        {p.matched.slice(0, 6).map((m, j) => (
                          <span key={j} className="inline-block mr-1 rounded bg-primary/10 text-primary px-1">
                            {m}
                          </span>
                        ))}
                      </div>
                      {p.treatmentPrinciple && (
                        <p className="mt-1 text-xs text-muted italic">
                          {S("治則", "Principle")}: {p.treatmentPrinciple}
                        </p>
                      )}
                      {p.formulas.length > 0 && (
                        <p className="mt-1 text-xs text-primary">
                          {S(`推薦 ${p.formulas.length} 首方劑`, `${p.formulas.length} formula(s) recommended`)}
                          {p.acupoints.length > 0 && S(` · ${p.acupoints.length} 個穴位`, ` · ${p.acupoints.length} acupoints`)}
                        </p>
                      )}
                    </button>

                    {/* Expanded: formulas + herbs + acupoints */}
                    {isExpanded && (
                      <div className="border-t border-border p-3 bg-surface space-y-4">
                        {/* Recommended formulas */}
                        {p.formulas.length > 0 ? (
                          p.formulas.map((f) => (
                            <div key={f.id} className="rounded-lg border border-border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <Link href={`/formulas/${f.id}`} className="font-semibold text-sm hover:text-primary">
                                  {f.isPrimary && (
                                    <span className="text-xs bg-primary text-white rounded px-1 py-0.5 mr-1.5">
                                      {S("首選", "1st")}
                                    </span>
                                  )}
                                  {f.chineseName}
                                  <span className="ml-1 text-muted font-normal">{f.pinyinName}</span>
                                </Link>
                              </div>
                              {f.source && (
                                <p className="text-xs text-muted mb-1">
                                  {S("出處", "Source")}: {f.source}
                                </p>
                              )}
                              {f.actions && (
                                <p className="text-xs text-muted mb-2 line-clamp-2">{f.actions}</p>
                              )}

                              {/* Herb composition table */}
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="text-left py-1 pr-2 text-muted font-medium w-10">{S("角色", "Role")}</th>
                                    <th className="text-left py-1 pr-2 text-muted font-medium">{S("藥物", "Herb")}</th>
                                    <th className="text-left py-1 pr-2 text-muted font-medium w-14">{S("性味", "Nature")}</th>
                                    <th className="text-right py-1 text-muted font-medium w-16">{S("劑量", "Dosage")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.herbs.map((h) => (
                                    <tr key={h.id} className="border-b border-border/50">
                                      <td className="py-1.5 pr-2">
                                        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[h.role] ?? ""}`}>
                                          {ROLE_LABELS[h.role] ?? h.role}
                                        </span>
                                      </td>
                                      <td className="py-1.5 pr-2">
                                        <Link href={`/herbs/${h.id}`} className="hover:text-primary">
                                          <span className="font-medium">{h.chineseName}</span>
                                          <span className="text-muted ml-1">{h.pinyinName}</span>
                                        </Link>
                                      </td>
                                      <td className="py-1.5 pr-2 text-muted">
                                        {h.nature === "WARM" ? "溫" : h.nature === "HOT" ? "熱" : h.nature === "COOL" ? "涼" : h.nature === "COLD" ? "寒" : "平"}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        <span className="font-mono font-semibold text-primary">
                                          {h.dosage ?? h.dosageRange ?? "—"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Decoction instructions */}
                              <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">
                                {S(
                                  "煎服法：水煎服，每日1劑，分早晚2次溫服。先煎加水500ml煎至200ml，二煎加水400ml煎至150ml，混勻分服。",
                                  "Decoction: 1 daily dose, split AM/PM. First decoction: 500ml → 200ml; second: 400ml → 150ml. Mix and serve warm.",
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted">
                            {S("此證型尚未建立推薦方劑。", "No formulas linked to this pattern yet.")}
                          </p>
                        )}

                        {/* Recommended acupoints */}
                        {p.acupoints.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold mb-1.5">
                              {S("建議取穴", "Recommended Acupoints")}
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {p.acupoints.map((a) => (
                                <Link
                                  key={a.id}
                                  href={`/acupuncture/${a.id}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs text-teal-800 hover:border-teal-400"
                                >
                                  <span className="font-mono font-semibold">{a.code}</span>
                                  <span>{a.name}</span>
                                  <span className="text-teal-600">· {a.meridian}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Possible Western conditions (dual-system differential) */}
                        {p.conditions && p.conditions.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold mb-1.5">
                              🎯 {S("可能對應西醫病症", "Possible Western Conditions")}
                              <span className="text-xs text-muted font-normal ml-1">
                                ({S("基於證型 ↔ 病症映射", "based on pattern ↔ condition mapping")})
                              </span>
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {p.conditions.map((c) => {
                                const freqColor =
                                  c.frequency === "COMMON" ? "border-orange-300 bg-orange-50 text-orange-800" :
                                  c.frequency === "OCCASIONAL" ? "border-yellow-300 bg-yellow-50 text-yellow-800" :
                                  "border-gray-300 bg-gray-50 text-gray-700";
                                return (
                                  <Link
                                    key={c.id}
                                    href={`/conditions/${c.id}`}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs hover:opacity-80 ${freqColor}`}
                                  >
                                    <span className="font-medium">{c.chineseName ?? c.westernName}</span>
                                    {c.chineseName && c.westernName !== c.chineseName && (
                                      <span className="opacity-70">· {c.westernName}</span>
                                    )}
                                    {c.icd11Code && <span className="opacity-60">· {c.icd11Code}</span>}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <Link
                          href={`/patterns/${p.id}`}
                          className="inline-block text-xs text-primary hover:underline"
                        >
                          {S("查看完整證型 →", "View full pattern →")}
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
