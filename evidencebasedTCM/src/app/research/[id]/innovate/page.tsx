import { notFound } from "next/navigation";
import Link from "next/link";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { craftInnovativeFormulas } from "@/lib/research/formula-architect";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const ROLE_COLORS: Record<string, string> = {
  JUN: "bg-red-100 text-red-800 border-red-300",
  CHEN: "bg-amber-100 text-amber-800 border-amber-300",
  ZUO: "bg-blue-100 text-blue-800 border-blue-300",
  SHI: "bg-green-100 text-green-800 border-green-300",
};
const ROLE_LABELS: Record<string, string> = { JUN: "君", CHEN: "臣", ZUO: "佐", SHI: "使" };

export default async function InnovatePage({ params }: Props) {
  const locale = await getLocale();
  const { id } = await params;
  const disease = DISEASE_CATALOG.find((d) => d.id === id);
  if (!disease) notFound();

  const report = await craftInnovativeFormulas(disease);
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const renderFormula = (f: typeof report.primaryFormula, title: string) => (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">{f.chineseName}</h3>
        <span className="text-xs text-muted">{f.name}</span>
      </div>
      <p className="text-sm mb-4">{f.rationale}</p>

      <div className="mb-4 rounded-lg bg-primary/5 p-3">
        <h4 className="text-xs font-semibold text-muted uppercase mb-1">{S("治則", "Treatment Principle")}</h4>
        <p className="text-sm font-medium">{f.treatmentPrinciple}</p>
      </div>

      <h4 className="text-sm font-semibold mb-2">{S("組成 · 君臣佐使", "Composition · Jun-Chen-Zuo-Shi")}</h4>
      <div className="space-y-2 mb-4">
        {(["JUN", "CHEN", "ZUO", "SHI"] as const).map((role) => {
          const herbsInRole = f.herbs.filter((h) => h.role === role);
          if (herbsInRole.length === 0) return null;
          return (
            <div key={role} className={`rounded-lg border p-3 ${ROLE_COLORS[role]}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg font-bold">{ROLE_LABELS[role]}</span>
                <span className="text-xs font-medium uppercase">{role}</span>
              </div>
              {herbsInRole.map((h) => (
                <div key={h.id} className="mb-1.5">
                  <div className="flex items-center justify-between">
                    <Link href={`/herbs/${h.id}`} className="font-medium text-sm hover:underline">
                      {h.chineseName} ({h.pinyinName})
                    </Link>
                    <span className="font-mono text-xs">{h.roleDosage}</span>
                  </div>
                  <p className="text-xs text-muted/70 italic">{h.roleRationale}</p>
                  <div className="flex gap-1 mt-0.5">
                    <span className="text-xs rounded bg-white/60 px-1">{h.nature}</span>
                    {h.flavor.map((fl) => (
                      <span key={fl} className="text-xs rounded bg-white/60 px-1">{fl}</span>
                    ))}
                    <span className="text-xs text-muted ml-auto">
                      {S("分", "Score")}: {h.score} (action:{h.scoreBreakdown.actionMatch} ev:{h.scoreBreakdown.evidenceWeight} meridian:{h.scoreBreakdown.meridianFit} cat:{h.scoreBreakdown.categoryFit})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-xs mb-4">
        <div className="rounded-md border border-border p-2">
          <h5 className="font-semibold mb-1">{S("寒熱平衡", "Nature Balance")}</h5>
          <div className="flex gap-2">
            <span className="text-red-700">{S("溫熱", "Warm")}: {f.natureBalance.warm}</span>
            <span className="text-blue-700">{S("寒涼", "Cool")}: {f.natureBalance.cool}</span>
            <span className="text-gray-600">{S("平", "Neutral")}: {f.natureBalance.neutral}</span>
          </div>
        </div>
        <div className="rounded-md border border-border p-2">
          <h5 className="font-semibold mb-1">{S("五味", "Flavors")}</h5>
          {Object.entries(f.flavorProfile).map(([fl, n]) => (
            <span key={fl} className="mr-2">{fl}: {n}</span>
          ))}
        </div>
        <div className="rounded-md border border-border p-2">
          <h5 className="font-semibold mb-1">{S("歸經覆蓋", "Meridian Coverage")}</h5>
          <p className="text-muted">{f.meridianCoverage.join(", ")}</p>
        </div>
      </div>

      <h4 className="text-sm font-semibold mb-2">{S("隨證加減", "Modifications")}</h4>
      <div className="space-y-1.5 mb-4">
        {f.modifications.map((m, i) => (
          <div key={i} className="rounded-md border border-border p-2 text-xs">
            <span className="font-semibold">{m.condition}：</span>
            {m.add.length > 0 && <span className="text-green-700">+{m.add.join(", ")}</span>}
            {m.remove.length > 0 && <span className="text-red-700 ml-2">−{m.remove.join(", ")}</span>}
            <span className="text-muted ml-2">({m.rationale})</span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 text-xs">
        <div className="rounded-md bg-primary/5 p-2">
          <h5 className="font-semibold mb-1">{S("煎服法", "Dosage")}</h5>
          <p className="text-muted">{f.dosageInstructions}</p>
        </div>
        <div className="rounded-md bg-primary/5 p-2">
          <h5 className="font-semibold mb-1">{S("療程", "Course")}</h5>
          <p className="text-muted">{f.courseDuration}</p>
        </div>
      </div>

      {f.safetyWarnings.length > 0 && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          <h5 className="font-semibold mb-1">{S("安全警示", "Safety Warnings")}</h5>
          <ul className="list-disc pl-4">
            {f.safetyWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/research" className="hover:text-primary">{S("創新治療研究", "Innovation Research")}</Link>
        <span className="mx-2">/</span>
        <Link href={`/research/${id}`} className="hover:text-primary">{S(disease.nameZh, disease.nameEn)}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{S("AI 組方創新", "AI Formula Innovation")}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">
          {S("AI 醫學思維 · 創新組方", "AI Medical Mind · Formula Innovation")}
        </h1>
        <p className="text-lg text-muted mt-1">
          {S(disease.nameZh, disease.nameEn)} · {disease.tcmTermsZh.join("、")}
        </p>
      </header>

      {/* Disease Analysis */}
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-xl font-bold mb-3 text-primary">
          {S("病機深度分析", "Deep Pathology Analysis")}
        </h2>
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <h4 className="font-semibold">{S("核心病機", "Primary Pathology")}</h4>
            <p className="text-primary font-medium">{report.analysis.primaryPathology}</p>
          </div>
          <div>
            <h4 className="font-semibold">{S("次要病機", "Secondary")}</h4>
            <p>{report.analysis.secondaryPathologies.join(", ") || "—"}</p>
          </div>
          <div>
            <h4 className="font-semibold">{S("涉及臟腑", "Organs Affected")}</h4>
            <p>{report.analysis.affectedOrgans.join(", ")}</p>
          </div>
          <div>
            <h4 className="font-semibold">{S("治法", "Treatment Principles")}</h4>
            <p>{report.analysis.treatmentPrinciples.join("、")}</p>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <h4 className="font-semibold">{S("治療策略", "Strategy")}</h4>
          <p className="text-muted">{report.analysis.therapeuticStrategy}</p>
        </div>
      </section>

      {/* Primary Formula */}
      <section>
        <h2 className="text-xl font-bold mb-3">{S("主方 · AI 創新處方", "Primary · AI Novel Formula")}</h2>
        {renderFormula(report.primaryFormula, "primary")}
      </section>

      {/* Alternate Formulas */}
      {report.alternateFormulas.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">{S("備選方 · 針對兼證", "Alternate Formulas")}</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {report.alternateFormulas.map((f, i) => (
              <div key={i}>{renderFormula(f, `alt-${i}`)}</div>
            ))}
          </div>
        </section>
      )}

      {/* Multi-phase Protocol */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold mb-4">{S("三階段聯合治療方案", "Multi-Phase Protocol")}</h2>
        <h3 className="text-sm font-semibold mb-3">{report.combinationProtocol.name}</h3>
        <div className="space-y-4">
          {report.combinationProtocol.phases.map((phase, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{phase.phase}</h4>
                <span className="text-xs font-mono text-muted">{phase.duration}</span>
              </div>
              <p className="text-sm mb-2">{phase.focus}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-primary/10 px-2 py-0.5">{S("方", "Rx")}: {phase.formula.chineseName}</span>
                {phase.acupoints.length > 0 && (
                  <span className="rounded bg-teal-50 text-teal-800 px-2 py-0.5">
                    {S("取穴", "Points")}: {phase.acupoints.join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs">
          <div>
            <h4 className="font-semibold mb-1">{S("生活整合", "Lifestyle")}</h4>
            <ul className="list-disc pl-4 space-y-0.5 text-muted">
              {report.combinationProtocol.lifestyleIntegration.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">{S("監測時間線", "Monitoring Timeline")}</h4>
            <ul className="list-disc pl-4 space-y-0.5 text-muted">
              {report.combinationProtocol.monitoringPlan.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Innovation Insights */}
      <section>
        <h2 className="text-xl font-bold mb-3">{S("創新洞見", "Innovation Insights")}</h2>
        <div className="space-y-2">
          {report.innovativeInsights.map((ins, i) => (
            <div key={i} className="rounded-lg border border-border p-3 text-sm">
              <span className="inline-block w-6 h-6 rounded-full bg-primary/10 text-primary text-center text-xs leading-6 mr-2 font-bold">
                {i + 1}
              </span>
              {ins}
            </div>
          ))}
        </div>
      </section>

      {/* Mechanism Hypotheses */}
      <section>
        <h2 className="text-xl font-bold mb-3">{S("機制假說", "Mechanism Hypotheses")}</h2>
        <div className="space-y-2">
          {report.mechanismHypotheses.map((h, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <span className="text-primary font-mono text-xs mr-2">H{i + 1}</span>
              {h}
            </div>
          ))}
        </div>
      </section>

      <footer className="text-xs text-muted border-t border-border pt-4 space-y-1">
        <p>
          {S(
            "本報告由 AI 醫學思維引擎自動生成，基於 EBTCM 實證資料庫中的 250 條臨床證據與 50 味中藥的配伍邏輯。",
            "Generated by the AI Medical Mind engine using 250 evidence entries and 50 herbs' compatibility logic from the EBTCM database.",
          )}
        </p>
        <p>
          {S(
            "創新處方僅供研究參考，正式臨床應用須經過嚴格的臨床前評估與倫理審查。",
            "Novel formulas are for research reference only — clinical application requires rigorous preclinical evaluation and ethics review.",
          )}
        </p>
      </footer>
    </div>
  );
}
