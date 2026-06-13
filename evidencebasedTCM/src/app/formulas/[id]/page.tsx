import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { DetailTabs } from "@/components/shared/DetailTabs";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Badge } from "@/components/shared/Badge";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import { tcmEntityTitles } from "@/lib/i18n/entity-display";
import { studyTypeLabel, evidenceLevelLabel, formulaRoleLabel } from "@/lib/i18n/data-labels";
import { CompositionWheel } from "@/components/formulas/CompositionWheel";
import { FormulaTreatmentFlow } from "@/components/formulas/FormulaTreatmentFlow";
import { SafetyBadges } from "@/components/safety/SafetyBadges";
import { buildFormulaRWE } from "@/lib/rwe/aggregate";
import { formulaNetworkProfile, targetSourceMap, geneChipClass, targetDruggabilityMap, druggabilityTitle } from "@/lib/research/network-pharmacology";

interface Props {
  params: Promise<{ id: string }>;
}

const ROLE_COLOR: Record<string, string> = {
  JUN: "bg-red-100 text-red-800 border-red-300",
  CHEN: "bg-amber-100 text-amber-800 border-amber-300",
  ZUO: "bg-blue-100 text-blue-800 border-blue-300",
  SHI: "bg-green-100 text-green-800 border-green-300",
};

export default async function FormulaDetailPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;

  const formula = await prisma.formula.findUnique({
    where: { id },
    include: {
      herbs: {
        include: {
          herb: {
            select: {
              id: true,
              pinyinName: true,
              chineseName: true,
              englishName: true,
              nature: true,
              category: true,
            },
          },
        },
        orderBy: { role: "asc" },
      },
      patternFormulas: {
        include: {
          pattern: {
            select: { id: true, pinyinName: true, chineseName: true, pathologyType: true },
          },
        },
      },
      evidenceLinks: {
        include: { evidence: true },
      },
    },
  });

  if (!formula) notFound();

  const headerTitles = tcmEntityTitles(formula, locale);
  const sourcePrefix = t(messages, "formulas.sourcePrefix");

  // Real-world evidence + network-pharmacology profile for this formula.
  const zh = locale === "zh-Hant";
  const rwe = await buildFormulaRWE(id);
  const net = await formulaNetworkProfile(id);
  const targetSrc = net.targets.length > 0 ? await targetSourceMap() : new Map();
  const drugMap = net.targets.length > 0 ? await targetDruggabilityMap() : new Map();
  const druggableHits = net.targets.filter((g) => drugMap.has(g)).length;

  const outcomesTab = (
    <div className="space-y-8">
      {/* Real-world evidence */}
      <div>
        <h3 className="text-lg font-semibold mb-1">{zh ? "真實世界療效" : "Real-World Outcomes"}</h3>
        {!rwe || rwe.stats.totalConsults === 0 ? (
          <p className="text-sm text-muted">
            {zh ? "尚無使用本方的門診療效資料。" : "No consultation outcomes recorded for this formula yet."}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted mb-3">
              {zh
                ? "彙整門診紀錄中以本方為基礎方的就診結果（0–10 症狀量表，前後配對）。"
                : "Aggregated from consultations using this formula as the base prescription (paired 0–10 symptom VAS)."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: zh ? "就診數 n" : "Visits n", value: rwe.stats.n },
                { label: zh ? "前 → 後" : "Before → After", value: rwe.stats.meanBefore != null ? `${rwe.stats.meanBefore}→${rwe.stats.meanAfter}` : "—" },
                { label: zh ? "改善 Δ" : "Improvement Δ", value: rwe.stats.meanDelta != null ? `▼ ${rwe.stats.meanDelta}` : "—" },
                { label: zh ? "有效率" : "Responder", value: rwe.stats.responderRate != null ? `${rwe.stats.responderRate}%` : "—" },
                { label: zh ? "不良反應" : "Adverse", value: `${rwe.stats.adverseRate}%` },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-lg font-bold tabular-nums">{c.value}</div>
                  <div className="text-[11px] text-muted mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
            {rwe.vitals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {rwe.vitals.map((v) => (
                  <span key={v.label}>
                    <span className="text-muted">{v.label}: </span>
                    <span className={v.meanDelta < 0 ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
                      {v.meanBaseline}→{v.meanLatest} {v.unit} ({v.meanDelta > 0 ? "+" : ""}{v.meanDelta})
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Link href="/research/rwe" className="text-xs text-primary hover:underline">
                {zh ? "查看完整真實世界證據儀表板 →" : "Open full RWE dashboard →"}
              </Link>
            </div>
            <p className="mt-2 text-[11px] text-amber-700">
              {zh
                ? "⚠ 目前為標記【示範】之合成資料，接入真實門診紀錄後即反映實際療效。"
                : "⚠ Currently synthetic demo data; reflects real outcomes once actual records accrue."}
            </p>
          </>
        )}
      </div>

      {/* Network pharmacology */}
      <div>
        <h3 className="text-lg font-semibold mb-1">{zh ? "網絡藥理 · 分子機制" : "Network Pharmacology · Mechanism"}</h3>
        {net.targets.length === 0 ? (
          <p className="text-sm text-muted">
            {zh ? "本方成分尚無分子靶點資料。" : "No molecular-target data for this formula's components yet."}
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted mb-1">
                {zh
                  ? `本方諸藥的活性成分共命中 ${net.targets.length} 個蛋白靶點：`
                  : `This formula's herbs hit ${net.targets.length} protein targets:`}
              </p>
              <div className="flex flex-wrap gap-1">
                {net.targets.map((g) => {
                  const d = drugMap.get(g);
                  return (
                    <span key={g} className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${geneChipClass(targetSrc.get(g))}`} title={druggabilityTitle(d, zh)}>
                      {g}{d && <span className="ml-0.5" aria-label="experimentally druggable">💊</span>}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-500/10" /> {zh ? "策展實證" : "curated"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded border border-dashed border-amber-400 bg-amber-500/10" /> {zh ? "AI 推斷（低信度，待驗證）" : "AI-inferred (low confidence)"}
                </span>
                {druggableHits > 0 && (
                  <span title={zh ? "具 BindingDB 實測配體結合數據" : "Has BindingDB measured-ligand data"}>
                    💊 {zh ? `${druggableHits}/${net.targets.length} 靶點有實驗結合數據` : `${druggableHits}/${net.targets.length} targets have experimental binding data`}
                  </span>
                )}
              </div>
            </div>

            {net.enrichedPathways.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">{zh ? "富集通路 (KEGG)" : "Enriched Pathways (KEGG)"}</h4>
                <ul className="space-y-1 text-xs">
                  {net.enrichedPathways.map((p) => (
                    <li key={p.code} className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-mono text-muted">{p.code}</span>
                      <span className="text-muted">· {p.hitGenes.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {net.diseaseAlignment.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">
                  {zh ? "疾病靶點對位 (潛在適應症)" : "Disease Target Alignment (candidate indications)"}
                </h4>
                <p className="text-[11px] text-muted mb-2">
                  {zh
                    ? "依本方靶點與各疾病基因集的重疊排序，重疊高者提示潛在治療方向，須臨床與文獻驗證。"
                    : "Ranked by overlap between this formula's targets and each disease's gene set — high overlap suggests a candidate direction, pending clinical/literature validation."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {net.diseaseAlignment.slice(0, 10).map((d) => (
                    <Link
                      key={d.diseaseId}
                      href={`/research/${d.diseaseId}`}
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs hover:border-primary-light"
                      title={d.sharedGenes.join(", ")}
                    >
                      <span className="font-medium">{d.diseaseName}</span>
                      <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        {d.overlap}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const compositionTab = (
    <div className="space-y-8">
      {formula.actions && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.formula.actions")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(formula.actions, locale)}
          </p>
        </div>
      )}

      {formula.indications && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.formula.indications")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(formula.indications, locale)}
          </p>
        </div>
      )}

      {formula.modifications && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.formula.modifications")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(formula.modifications, locale)}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.formula.composition")}</h3>
        {formula.herbs.length === 0 ? (
          <p className="text-sm text-muted">{t(messages, "detail.formula.noHerbs")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-semibold">{t(messages, "detail.formula.colHerb")}</th>
                  <th className="py-2 pr-4 text-left font-semibold">{t(messages, "detail.formula.colRole")}</th>
                  <th className="py-2 pr-4 text-left font-semibold">{t(messages, "detail.formula.colDosage")}</th>
                  <th className="py-2 text-left font-semibold">{t(messages, "detail.formula.colNotes")}</th>
                </tr>
              </thead>
              <tbody>
                {formula.herbs.map((fh) => {
                  const line = tcmEntityTitles(fh.herb, locale);
                  return (
                    <tr key={fh.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <Link href={`/herbs/${fh.herb.id}`} className="font-medium text-primary hover:underline">
                          {line.primary}
                        </Link>
                        <span className="text-muted ml-1">{line.secondary}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          label={formulaRoleLabel(locale, fh.role)}
                          color={ROLE_COLOR[fh.role] ?? "bg-gray-100 text-gray-800"}
                        />
                      </td>
                      <td className="py-2 pr-4 text-muted">{fh.dosage || t(messages, "common.dash")}</td>
                      <td className="py-2 text-muted">{localizeDbText(fh.notes, locale) || t(messages, "common.dash")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formula.patternFormulas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.formula.relatedPatterns")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {formula.patternFormulas.map((pf) => {
              const pt = tcmEntityTitles(pf.pattern, locale);
              return (
                <Link
                  key={pf.id}
                  href={`/patterns/${pf.pattern.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                >
                  <div>
                    <span className="font-medium">{pt.primary}</span>
                    <span className="text-sm text-muted ml-2">{pt.secondary}</span>
                  </div>
                  {pf.isPrimary && (
                    <Badge label={t(messages, "detail.primary")} color="bg-green-100 text-green-800" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const evidenceTab = (
    <div className="space-y-4">
      {formula.evidenceLinks.length === 0 ? (
        <p className="text-sm text-muted">{t(messages, "detail.formula.noEvidence")}</p>
      ) : (
        formula.evidenceLinks.map((link) => (
          <Link
            key={link.id}
            href={`/evidence/${link.evidence.id}`}
            className="block rounded-lg border border-border p-4 hover:border-primary-light transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{localizeDbText(link.evidence.title, locale)}</h4>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{studyTypeLabel(locale, link.evidence.studyType)}</span>
                  {link.evidence.year && <span>({link.evidence.year})</span>}
                  {link.evidence.journal && (
                    <span>
                      {t(messages, "common.dash")} {localizeDbText(link.evidence.journal, locale)}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {evidenceLevelLabel(locale, link.evidence.evidenceLevel)}
                </div>
              </div>
              <EvidenceBadge grade={link.evidence.evidenceGrade as "A" | "B" | "C" | "D"} locale={locale} />
            </div>
            {link.evidence.summary && (
              <p className="mt-2 text-sm text-muted line-clamp-2">
                {localizeDbText(link.evidence.summary, locale)}
              </p>
            )}
          </Link>
        ))
      )}
    </div>
  );

  const wheelTab = (
    <div className="space-y-4">
      <FormulaTreatmentFlow
        locale={locale}
        actions={localizeDbText(formula.actions, locale) ?? null}
        patterns={formula.patternFormulas.map((pf) => ({
          id: pf.pattern.id,
          chineseName: pf.pattern.chineseName,
          pinyinName: pf.pattern.pinyinName,
          pathologyType: pf.pattern.pathologyType,
          isPrimary: pf.isPrimary,
        }))}
        herbs={formula.herbs.map((fh) => ({
          id: fh.herb.id,
          role: fh.role,
          chineseName: fh.herb.chineseName,
          pinyinName: fh.herb.pinyinName,
        }))}
      />
      <CompositionWheel
        locale={locale}
        title={locale === "zh-Hant" ? "君臣佐使結構" : "Jun–Chen–Zuo–Shi Structure"}
        herbs={formula.herbs.map((fh) => ({
          id: fh.herb.id,
          role: fh.role,
          pinyinName: fh.herb.pinyinName,
          chineseName: fh.herb.chineseName,
          dosage: fh.dosage,
        }))}
      />
    </div>
  );

  const tabs = [
    {
      id: "composition",
      label: t(messages, "detail.formula.tabComposition"),
      content: compositionTab,
    },
    {
      id: "wheel",
      label: locale === "zh-Hant" ? "結構與治法" : "Structure & Strategy",
      content: wheelTab,
    },
    {
      id: "outcomes",
      label: zh ? "療效與機制" : "Outcomes & Mechanism",
      content: outcomesTab,
    },
    {
      id: "evidence",
      label: tf(messages, "detail.tabEvidenceCount", { count: formula.evidenceLinks.length }),
      content: evidenceTab,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/formulas" className="hover:text-primary">
          {t(messages, "nav.formulas")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{headerTitles.primary}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{headerTitles.primary}</h1>
        <p className="text-lg text-muted mt-1">{headerTitles.secondary}</p>
        {formula.sourceText && (
          <p className="text-sm text-muted italic mt-1">
            {sourcePrefix}: {localizeDbText(formula.sourceText, locale)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Badge
            label={localizeDbText(formula.category, locale) ?? formula.category}
            color="bg-violet-100 text-violet-800"
            size="md"
          />
          <SafetyBadges herbIds={formula.herbs.map((h) => h.herb.id)} locale={locale} />
          <Link
            href={`/prescription/print?formula=${formula.id}`}
            className="rounded-md border border-border bg-surface hover:bg-primary/5 hover:border-primary-light px-3 py-1 text-xs font-medium transition-colors"
            title={locale === "zh-Hant" ? "建構列印處方（Pro）" : "Build & print prescription (Pro)"}
          >
            🖨 {locale === "zh-Hant" ? "建構列印處方" : "Build Prescription"}
            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400">Pro</span>
          </Link>
        </div>
      </div>

      <DetailTabs tabs={tabs} />
    </div>
  );
}
