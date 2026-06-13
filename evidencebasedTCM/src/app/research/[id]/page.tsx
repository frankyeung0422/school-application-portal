import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { buildProposal } from "@/lib/research/synthesize";
import { repurposingCandidates, targetSourceMap, geneChipClass, targetDruggabilityMap, druggabilityTitle } from "@/lib/research/network-pharmacology";
import { scoreCredibility } from "@/lib/research/credibility";
import { buildDiseaseMetaAnalysis } from "@/lib/research/meta-analysis";
import { CredibilityBadge } from "@/components/research/CredibilityBadge";
import { ForestPlot } from "@/components/research/ForestPlot";
import { getLocale } from "@/lib/i18n/locale-server";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ResearchDetailPage({ params }: Props) {
  const locale = await getLocale();
  const { id } = await params;
  const disease = DISEASE_CATALOG.find((d) => d.id === id);
  if (!disease) notFound();

  const proposal = await buildProposal(disease);
  const network = await repurposingCandidates(id);
  const meta = await buildDiseaseMetaAnalysis(id);

  // Registered clinical trials (TCM-relevant) from ClinicalTrials.gov.
  const trialsRaw = await prisma.clinicalTrial.findMany({ where: { diseaseId: id }, take: 30 });
  const STATUS_RANK: Record<string, number> = { RECRUITING: 5, ENROLLING_BY_INVITATION: 4, ACTIVE_NOT_RECRUITING: 3, NOT_YET_RECRUITING: 2, COMPLETED: 1 };
  const trials = trialsRaw
    .sort((a, b) => (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0) || (b.completionDate ?? "").localeCompare(a.completionDate ?? ""))
    .slice(0, 12);
  const recruitingCount = trialsRaw.filter((t) => t.status === "RECRUITING" || t.status === "NOT_YET_RECRUITING" || t.status === "ENROLLING_BY_INVITATION").length;

  // Herbs / formulas that already have evidence links for this disease (from the
  // proposal's evidence mining). Network candidates outside these sets are
  // surfaced as "novel" — target overlap suggests them, but no curated/evidence
  // link exists yet, so they need validation.
  const evidenceHerbIds = new Set(proposal.herbs.map((h) => h.id));
  const evidenceFormulaIds = new Set(proposal.formulas.map((f) => f.id));
  const hasNetworkData = network.diseaseGenes.length > 0 && network.herbs.length > 0;
  const targetSrc = hasNetworkData ? await targetSourceMap() : new Map();
  const drugMap = hasNetworkData ? await targetDruggabilityMap() : new Map();

  // Evidence grade counts per herb (from the proposal's evidence mining) feed
  // the credibility score for each network candidate.
  const proposalHerbById = new Map(proposal.herbs.map((h) => [h.id, h]));
  const credibilityFor = (herbId: string, overlap: number, sharedGenes: string[]) => {
    const ev = proposalHerbById.get(herbId);
    const llmOnly = sharedGenes.length
      ? sharedGenes.filter((g) => targetSrc.get(g) === "LLM").length / sharedGenes.length
      : 0;
    return scoreCredibility({
      gradeA: ev?.gradeA ?? 0,
      gradeB: ev?.gradeB ?? 0,
      totalEvidence: ev?.totalEvidence ?? 0,
      targetOverlap: overlap,
      diseaseGeneCount: network.diseaseGenes.length,
      llmOnlyShare: llmOnly,
    });
  };

  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/research" className="hover:text-primary">
          {S("創新治療研究", "Innovation Research")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{locale === "zh-Hant" ? disease.nameZh : disease.nameEn}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">
          {locale === "zh-Hant" ? disease.nameZh : disease.nameEn}
        </h1>
        <p className="text-sm text-muted mt-1">
          {locale === "zh-Hant" ? disease.nameEn : disease.nameZh} · ICD-11 {disease.icd11}
        </p>
        <p className="mt-2 text-sm">
          <span className="text-muted">{S("中醫病名", "TCM terms")}: </span>
          <span className="font-medium">{disease.tcmTermsZh.join("、")}</span>
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-xl font-bold mb-2 text-primary">
          {S("自動合成治療建議", "Auto-Synthesized Treatment Proposal")}
        </h2>
        <p className="text-sm font-semibold mb-3">{proposal.synthesis.headline}</p>
        <p className="text-sm leading-relaxed">{proposal.synthesis.rationale}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold mb-2">{S("治療方案", "Regimen")}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {proposal.synthesis.regimen.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{S("生活調養", "Lifestyle")}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {proposal.synthesis.lifestyle.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{S("追蹤指標", "Monitoring")}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {proposal.synthesis.monitoring.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-red-700">{S("風險與禁忌", "Risks & Contraindications")}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {proposal.synthesis.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">{S("相關中醫證型", "Associated TCM Patterns")}</h2>
        {proposal.patterns.length === 0 ? (
          <p className="text-sm text-muted">{S("資料庫中尚未建立對應證型。", "No matching patterns in the database yet.")}</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {proposal.patterns.map((p) => (
              <Link
                key={p.id}
                href={`/patterns/${p.id}`}
                className="rounded-lg border border-border bg-surface p-3 hover:border-primary-light transition-colors"
              >
                <div className="font-medium">{p.chineseName}</div>
                <div className="text-xs text-muted">{p.pathologyType}</div>
                {p.treatmentPrinciple && (
                  <div className="mt-1 text-xs italic text-muted line-clamp-2">{p.treatmentPrinciple}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <h2 className="text-xl font-bold mb-1 text-emerald-700">
          {S("網絡藥理分析", "Network Pharmacology")}
        </h2>
        <p className="text-sm text-muted mb-4">
          {S(
            `以「中藥→成分→蛋白靶點→通路」知識圖譜，對照 ${network.diseaseGenes.length} 個 ${disease.nameZh} 疾病基因，計算靶點重疊並挖掘可重定位的中藥與方劑。`,
            `Mapping the herb→compound→target→pathway graph against ${network.diseaseGenes.length} ${disease.nameEn} disease genes to score target overlap and surface repurposing candidates.`,
          )}
        </p>

        {!hasNetworkData ? (
          <p className="text-sm text-muted">
            {S(
              "此疾病的靶點圖譜資料尚未建立，或藥庫中暫無命中其疾病基因的中藥。可執行 scripts/import-disease-genes.ts 與 import-compound-targets.ts 補充資料。",
              "No target-graph data for this disease yet, or no herbs in the library hit its disease genes. Run the network-pharmacology ingestion scripts to populate it.",
            )}
          </p>
        ) : (
          <div className="space-y-6">
            {/* Enriched pathways */}
            <div>
              <h3 className="text-sm font-semibold mb-2">{S("富集通路 (KEGG)", "Enriched Pathways (KEGG)")}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {network.enrichedPathways.map((p) => (
                  <div key={p.code} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs font-mono text-muted">{p.code}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.hitGenes.map((g) => (
                        <span key={g} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-mono text-emerald-700">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repurposing herbs */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {S("靶點重疊中藥 (重定位候選)", "Herbs by Target Overlap (repurposing)")}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-500/10" /> {S("策展", "curated")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded border border-dashed border-amber-400 bg-amber-500/10" /> {S("AI 推斷", "AI-inferred")}
                  </span>
                  <span className="inline-flex items-center gap-1">💊 {S("BindingDB 實測結合", "BindingDB binding")}</span>
                </div>
              </div>
              <ol className="space-y-2">
                {network.herbs.map((h, i) => {
                  const novel = !evidenceHerbIds.has(h.herbId);
                  return (
                    <li key={h.herbId} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/herbs/${h.herbId}`} className="font-medium hover:text-primary">
                          {i + 1}. {h.chineseName} · {h.pinyinName}
                        </Link>
                        <span className="flex items-center gap-2">
                          {(() => {
                            const c = credibilityFor(h.herbId, h.overlap, h.sharedGenes);
                            return <CredibilityBadge tier={c.tier} score={c.score} locale={locale} title={c.rationale} />;
                          })()}
                          {novel && <span className="text-[10px] text-amber-700">{S("新候選", "novel")}</span>}
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {h.overlap} {S("靶點", "targets")}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {h.sharedGenes.map((g) => {
                          const d = drugMap.get(g);
                          return (
                            <span key={g} className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${geneChipClass(targetSrc.get(g))}`} title={druggabilityTitle(d, locale === "zh-Hant")}>
                              {g}{d && <span className="ml-0.5">💊</span>}
                            </span>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Repurposing formulas */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {S("靶點重疊方劑 (多成分協同)", "Formulas by Target Overlap (multi-component synergy)")}
              </h3>
              <ol className="space-y-2">
                {network.formulas.map((f, i) => {
                  const novel = !evidenceFormulaIds.has(f.formulaId);
                  return (
                    <li key={f.formulaId} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/formulas/${f.formulaId}`} className="font-medium hover:text-primary">
                          {i + 1}. {f.chineseName} · {f.pinyinName}
                        </Link>
                        <span className="flex items-center gap-2">
                          {novel && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              {S("新候選·待驗證", "novel · validate")}
                            </span>
                          )}
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {f.overlap} {S("靶點", "targets")}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {S("命中藥物", "Contributing herbs")}: {f.contributingHerbs.map((c) => `${c.chineseName}(${c.overlap})`).join("、")}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <p className="text-xs text-muted">
              {S(
                "「新候選」表示該中藥/方劑與本病的分子靶點重疊明顯，但資料庫尚無直接臨床實證連結，屬假設性發現，須經文獻與實驗驗證。",
                "“Novel” means strong molecular-target overlap but no direct clinical-evidence link in the database yet — a hypothesis-grade finding requiring literature and experimental validation.",
              )}
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold mb-3">{S("推薦方劑", "Recommended Formulas")}</h2>
          {proposal.formulas.length === 0 ? (
            <p className="text-sm text-muted">{S("無實證支持方劑。", "No evidence-linked formulas yet.")}</p>
          ) : (
            <ol className="space-y-2">
              {proposal.formulas.map((f, i) => (
                <li key={f.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/formulas/${f.id}`} className="font-medium hover:text-primary">
                      {i + 1}. {f.chineseName} · {f.name}
                    </Link>
                    <span className="text-xs text-muted">
                      A:{f.gradeA} · B:{f.gradeB} · {f.totalEvidence}
                    </span>
                  </div>
                  {f.source && <div className="text-xs text-muted mt-0.5">{f.source}</div>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">{S("核心中藥", "Key Herbs")}</h2>
          {proposal.herbs.length === 0 ? (
            <p className="text-sm text-muted">{S("無實證支持中藥。", "No evidence-linked herbs yet.")}</p>
          ) : (
            <ol className="space-y-2">
              {proposal.herbs.map((h, i) => (
                <li key={h.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/herbs/${h.id}`} className="font-medium hover:text-primary">
                      {i + 1}. {h.chineseName} · {h.name}
                    </Link>
                    <span className="text-xs text-muted">
                      A:{h.gradeA} · B:{h.gradeB} · {h.totalEvidence}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">{h.category}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3">{S("針灸方案", "Acupuncture Protocol")}</h2>
        {proposal.acupoints.length === 0 ? (
          <p className="text-sm text-muted">{S("無實證支持穴位。", "No evidence-linked points yet.")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {proposal.acupoints.map((a) => (
              <Link
                key={a.id}
                href={`/acupuncture/${a.id}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-primary-light"
              >
                <span className="font-mono font-semibold mr-1">{a.code}</span>
                <span>{a.name}</span>
                <span className="ml-2 text-muted">· {a.meridian}</span>
                <span className="ml-1 text-muted">({a.totalEvidence})</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {meta && meta.groups.length > 0 && (
        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">{S("量化證據合併（Meta 分析）", "Quantitative Evidence Pooling (Meta-analysis)")}</h2>
            <span className="text-xs text-muted">{S(`${meta.totalWithEffect} 項含效應量`, `${meta.totalWithEffect} with effect sizes`)}</span>
          </div>
          <p className="text-xs text-muted mb-3">
            {S(
              "以隨機效應模型合併摘要中可擷取的主要效應量（比值類於對數尺度），僅作指示性綜合，非正式系統評價。",
              "Random-effects pooling of abstract-level primary effect sizes (ratio measures on the log scale). Indicative synthesis only — not a registered systematic review.",
            )}
          </p>
          <div className="space-y-3">
            {meta.groups.map((g) => (
              <ForestPlot key={g.pooled.metric} group={g} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-3">{S("支撐文獻", "Supporting Evidence")}</h2>
        <div className="space-y-2">
          {proposal.evidence.map((e) => (
            <Link
              key={e.id}
              href={`/evidence/${e.id}`}
              className="block rounded-lg border border-border p-3 bg-surface hover:border-primary-light"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{e.title}</h4>
                  <div className="mt-1 text-xs text-muted">
                    {e.studyType}
                    {e.year && ` · ${e.year}`}
                    {e.journal && ` · ${e.journal}`}
                    {e.pubmedId && ` · PMID:${e.pubmedId}`}
                  </div>
                </div>
                <EvidenceBadge grade={e.evidenceGrade as "A" | "B" | "C" | "D"} locale={locale} />
              </div>
            </Link>
          ))}
          {proposal.evidence.length === 0 && (
            <p className="text-sm text-muted">
              {S("資料庫中尚無直接相關文獻 — 請使用下方外部搜尋深入研究。", "No direct evidence in database yet — use external links below.")}
            </p>
          )}
        </div>
      </section>

      {trialsRaw.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">{S("登記中臨床試驗", "Registered Clinical Trials")}</h2>
            <span className="text-xs text-muted">
              {S(`共 ${trialsRaw.length} 項`, `${trialsRaw.length} total`)}
              {recruitingCount > 0 && <span className="ml-1 text-emerald-700">· {S(`${recruitingCount} 招募中`, `${recruitingCount} recruiting`)}</span>}
              <span className="ml-1">· ClinicalTrials.gov</span>
            </span>
          </div>
          <div className="space-y-2">
            {trials.map((t) => {
              const recruiting = t.status === "RECRUITING" || t.status === "NOT_YET_RECRUITING" || t.status === "ENROLLING_BY_INVITATION";
              return (
                <a
                  key={t.id}
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-border bg-surface p-3 hover:border-primary-light"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{t.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${recruiting ? "bg-emerald-500/15 text-emerald-700" : "bg-muted/15 text-muted"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="font-mono">{t.nctId}</span>
                    {t.phase && t.phase !== "NA" && <span>{t.phase.replace(/PHASE/g, "Phase ")}</span>}
                    {t.enrollment != null && <span>{S(`n=${t.enrollment}`, `n=${t.enrollment}`)}</span>}
                    {t.interventions.length > 0 && <span>· {t.interventions.slice(0, 2).join(", ")}</span>}
                    {t.leadSponsor && <span>· {t.leadSponsor}</span>}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold mb-3">{S("深度外部搜尋", "External Deep Search")}</h2>
        <p className="text-sm text-muted mb-3">
          {S(
            "以下連結以本疾病關鍵詞預設查詢，點擊可於官方來源即時取得最新研究。",
            "Links prefilled with disease keywords — click to pull the latest research from authoritative sources.",
          )}
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <a href={proposal.externalQueries.pubmed} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light">
            PubMed · TCM + {disease.keywordsEn[0]}
          </a>
          <a href={proposal.externalQueries.cochrane} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light">
            Cochrane Library · {disease.keywordsEn[0]}
          </a>
          <a href={proposal.externalQueries.who} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light">
            WHO Traditional Medicine · {disease.keywordsEn[0]}
          </a>
          <a href={proposal.externalQueries.chinaCNKI} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light">
            CNKI 中國知網 · {disease.tcmTermsZh[0]}
          </a>
        </div>
      </section>

      <section className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
        <h2 className="text-xl font-bold mb-2 text-primary">
          {S("AI 醫學思維 · 創新組方", "AI Medical Mind · Formula Innovation")}
        </h2>
        <p className="text-sm text-muted mb-4">
          {S(
            "讓 AI 深度分析病機，自動選藥配伍，創建全新處方（君臣佐使結構）與三階段治療方案。",
            "Let the AI deeply analyze pathology, auto-select herbs, and craft novel formulas with Jun-Chen-Zuo-Shi structure and a multi-phase protocol.",
          )}
        </p>
        <Link
          href={`/research/${id}/innovate`}
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          {S("啟動 AI 組方引擎", "Launch AI Formula Architect")}
        </Link>
      </section>

      <footer className="text-xs text-muted border-t border-border pt-4">
        {S(
          "本報告為系統自動合成，僅供臨床參考。正式處方仍須依醫師個別辨證與病人實際情況調整。",
          "This report is an auto-generated synthesis for clinical reference. Formal prescription requires individualized pattern differentiation by a licensed practitioner.",
        )}
      </footer>
    </div>
  );
}
