import Link from "next/link";
import { buildEvidenceMap, GRADE_ORDER, type DiseaseEvidenceMap } from "@/lib/research/evidence-map";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

const STUDY_LABEL: Record<string, { zh: string; en: string }> = {
  SYSTEMATIC_REVIEW: { zh: "系統評價", en: "Syst. Review" },
  META_ANALYSIS: { zh: "Meta 分析", en: "Meta-analysis" },
  RCT: { zh: "隨機對照", en: "RCT" },
  COHORT: { zh: "隊列", en: "Cohort" },
  CASE_CONTROL: { zh: "病例對照", en: "Case-control" },
  CASE_SERIES: { zh: "病例系列", en: "Case series" },
  CASE_REPORT: { zh: "病例報告", en: "Case report" },
  EXPERT_OPINION: { zh: "專家意見", en: "Expert" },
  TRADITIONAL_USE: { zh: "傳統應用", en: "Traditional" },
};

const GRADE_HEADER_CLASS: Record<string, string> = {
  A: "text-emerald-700",
  B: "text-lime-700",
  C: "text-amber-700",
  D: "text-muted",
};

function cellClass(grade: string, n: number): string {
  if (n === 0) return "bg-transparent text-muted/40";
  const base =
    grade === "A" ? "bg-emerald-500/15 text-emerald-800"
    : grade === "B" ? "bg-lime-500/15 text-lime-800"
    : grade === "C" ? "bg-amber-500/15 text-amber-800"
    : "bg-muted/15 text-foreground";
  return base;
}

function DiseaseCard({ d, S }: { d: DiseaseEvidenceMap; S: (zh: string, en: string) => string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/research/${d.diseaseId}`} className="font-semibold hover:text-primary">
          {d.diseaseName}
        </Link>
        <span className="text-xs text-muted tabular-nums">
          {d.total} {S("篇", "studies")}
          {d.recent30 > 0 && <span className="ml-1 text-emerald-700">(+{d.recent30})</span>}
        </span>
      </div>

      {d.total === 0 ? (
        <p className="mt-3 text-xs text-muted">{S("資料庫中尚無相關文獻。", "No matched evidence yet.")}</p>
      ) : (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-muted">
              <th className="py-1 text-left font-normal">{S("研究類型", "Study type")}</th>
              {GRADE_ORDER.map((g) => (
                <th key={g} className={`py-1 text-center font-semibold ${GRADE_HEADER_CLASS[g]}`}>{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.presentStudyTypes.map((s) => (
              <tr key={s}>
                <td className="py-1 pr-2">{S(STUDY_LABEL[s]?.zh ?? s, STUDY_LABEL[s]?.en ?? s)}</td>
                {GRADE_ORDER.map((g) => {
                  const n = d.matrix[s]?.[g] ?? 0;
                  return (
                    <td key={g} className="py-0.5 px-0.5 text-center">
                      <span className={`inline-block w-7 rounded py-0.5 tabular-nums ${cellClass(g, n)}`}>{n || ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {d.gaps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {d.gaps.map((gap) => (
            <span key={gap} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-700">
              ⚠ {gap}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function EvidenceMapPage() {
  const locale = await getLocale();
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);
  const data = await buildEvidenceMap();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/research" className="hover:text-primary">
          {S("創新治療研究", "Innovation Research")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{S("實證地圖", "Evidence Map")}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">{S("實證地圖與文獻監測", "Evidence Map & Literature Surveillance")}</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-3xl">
          {S(
            "每種疾病的證據分布（研究類型 × GRADE 分級），用以一眼辨識實證強弱與研究缺口。文獻監測管線（scripts/surveil-evidence.ts）定期從 PubMed 擷取近期研究、自動 GRADE 評級並連結至中藥/方劑/穴位。",
            "Evidence distribution per disease (study-type × GRADE) to spot strength and gaps at a glance. The surveillance pipeline (scripts/surveil-evidence.ts) periodically pulls recent PubMed studies, auto-GRADEs them, and links them to herbs/formulas/acupoints.",
          )}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: S("文獻總數", "Total evidence"), value: data.totalEvidence },
          { label: S("近 7 天新增", "Added (7d)"), value: data.added7 },
          { label: S("近 30 天新增", "Added (30d)"), value: data.added30 },
          { label: S("覆蓋疾病", "Diseases mapped"), value: data.diseases.length },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums">{c.value}</div>
            <div className="text-xs text-muted mt-1">{c.label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">{S("最新文獻", "Recently Added Evidence")}</h2>
        <div className="space-y-2">
          {data.recent.map((e) => (
            <Link
              key={e.id}
              href={`/evidence/${e.id}`}
              className="block rounded-lg border border-border bg-surface p-3 hover:border-primary-light"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium line-clamp-1">{e.title}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${GRADE_HEADER_CLASS[e.evidenceGrade]}`}>
                  {e.evidenceGrade}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {S(STUDY_LABEL[e.studyType]?.zh ?? e.studyType, STUDY_LABEL[e.studyType]?.en ?? e.studyType)}
                {e.year && ` · ${e.year}`}
                {e.journal && ` · ${e.journal}`}
                {e.pubmedId && ` · PMID:${e.pubmedId}`}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-1">{S("各疾病實證地圖", "Per-Disease Evidence Maps")}</h2>
        <p className="text-xs text-muted mb-3">
          {S(
            "綠＝高級別實證（A/B），紅標＝研究缺口。括號內 (+n) 為近 30 天新增。",
            "Green = higher-grade evidence (A/B); red badges = research gaps. (+n) = added in the last 30 days.",
          )}
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.diseases.map((d) => (
            <DiseaseCard key={d.diseaseId} d={d} S={S} />
          ))}
        </div>
      </section>

      <footer className="text-xs text-muted border-t border-border pt-4">
        {S(
          "疾病與文獻的關聯以關鍵詞比對推得（文獻未直接標註疾病），可能存在誤配；GRADE 分級由 AI 自動產生，須人工複核。",
          "Disease–evidence association is inferred by keyword matching (evidence is not disease-tagged) and may misclassify; GRADE ratings are AI-generated and need human review.",
        )}
      </footer>
    </div>
  );
}
