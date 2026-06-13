import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import { pathologyLabel, mappingFrequencyLabel } from "@/lib/i18n/data-labels";
import { tcmEntityTitles } from "@/lib/i18n/entity-display";
import { AcupointFrequencyMap, type FrequencyEntry } from "@/components/shared/AcupointFrequencyMap";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { diseaseKeywords, textMatchesDisease } from "@/lib/research/disease-match";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConditionDetailPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;

  const condition = await prisma.conditionMapping.findUnique({
    where: { id },
    include: {
      patternMappings: {
        include: {
          pattern: {
            select: {
              id: true,
              pinyinName: true,
              chineseName: true,
              englishName: true,
              pathologyType: true,
              organSystem: true,
              tongue: true,
              pulse: true,
              keySymptoms: true,
              treatmentPrinciple: true,
            },
          },
        },
        orderBy: { frequency: "asc" },
      },
    },
  });

  if (!condition) notFound();

  const western = localizeDbText(condition.westernName, locale) ?? condition.westernName;

  // Aggregate acupoint frequencies across all patterns mapped to this condition
  const patternIds = condition.patternMappings.map((pm) => pm.pattern.id);
  const patternAcupoints = patternIds.length > 0
    ? await prisma.patternAcupoint.findMany({
        where: { patternId: { in: patternIds } },
        select: {
          acupoint: { select: { id: true, code: true, chineseName: true, pinyinName: true, meridian: true } },
        },
      })
    : [];
  const freqMap = new Map<string, FrequencyEntry>();
  for (const pa of patternAcupoints) {
    const a = pa.acupoint;
    const existing = freqMap.get(a.id);
    if (existing) existing.frequency += 1;
    else freqMap.set(a.id, {
      acupointId: a.id, code: a.code, chineseName: a.chineseName,
      pinyinName: a.pinyinName, meridian: a.meridian, frequency: 1,
    });
  }
  const frequencyEntries = Array.from(freqMap.values());

  // Match this condition to the research disease catalog by keyword
  const searchText = [condition.westernName, condition.description ?? ""].join(" ");
  const matchedDisease = DISEASE_CATALOG.find(d => textMatchesDisease(searchText, diseaseKeywords(d)));

  // If matched, pull a quick evidence count + trial count for the research callout
  const [researchEvidenceCount, researchTrialCount] = matchedDisease
    ? await Promise.all([
        prisma.evidenceEntry.count({
          where: {
            status: "PUBLISHED",
            OR: [
              { title: { contains: matchedDisease.keywordsEn[0], mode: "insensitive" } },
              ...matchedDisease.keywordsZh.map(k => ({ title: { contains: k } })),
            ],
          },
        }),
        prisma.clinicalTrial.count({ where: { diseaseId: matchedDisease.id } }),
      ])
    : [0, 0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/conditions" className="hover:text-primary">
          {t(messages, "nav.conditions")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{western}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{western}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {condition.icd10Code && (
            <Badge
              label={`${t(messages, "detail.codeIcd10")}: ${condition.icd10Code}`}
              color="bg-blue-100 text-blue-800"
              size="md"
            />
          )}
          {condition.icd11Code && (
            <Badge
              label={`${t(messages, "detail.codeIcd11")}: ${condition.icd11Code}`}
              color="bg-indigo-100 text-indigo-800"
              size="md"
            />
          )}
          {condition.snomedCode && (
            <Badge
              label={`${t(messages, "detail.codeSnomed")}: ${condition.snomedCode}`}
              color="bg-purple-100 text-purple-800"
              size="md"
            />
          )}
        </div>
        {condition.description && (
          <p className="mt-3 text-muted leading-relaxed">
            {localizeDbText(condition.description, locale)}
          </p>
        )}
      </div>

      {frequencyEntries.length > 0 && (
        <div className="mb-8">
          <AcupointFrequencyMap entries={frequencyEntries} locale={locale} limit={12} />
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">{t(messages, "detail.condition.diffTitle")}</h2>
        <p className="text-sm text-muted mb-6">{t(messages, "detail.condition.diffLead")}</p>

        {condition.patternMappings.length === 0 ? (
          <p className="text-sm text-muted">{t(messages, "detail.condition.noPatterns")}</p>
        ) : (
          <div className="space-y-4">
            {condition.patternMappings.map((mapping) => {
              const frequencyColor =
                mapping.frequency === "COMMON"
                  ? "bg-green-100 text-green-800"
                  : mapping.frequency === "OCCASIONAL"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800";
              const { primary, secondary } = tcmEntityTitles(mapping.pattern, locale);

              return (
                <Link
                  key={mapping.id}
                  href={`/patterns/${mapping.pattern.id}`}
                  className="block rounded-lg border border-border p-5 hover:border-primary-light hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{primary}</h3>
                      <p className="text-muted">{secondary}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge label={mappingFrequencyLabel(locale, mapping.frequency)} color={frequencyColor} />
                      <Badge label={pathologyLabel(locale, mapping.pattern.pathologyType)} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    {mapping.pattern.organSystem && (
                      <div>
                        <span className="font-medium">{t(messages, "detail.condition.organSystem")}:</span>
                        <span className="text-muted ml-1">
                          {localizeDbText(mapping.pattern.organSystem, locale)}
                        </span>
                      </div>
                    )}
                    {mapping.pattern.tongue && (
                      <div>
                        <span className="font-medium">{t(messages, "detail.condition.tongue")}:</span>
                        <span className="text-muted ml-1">
                          {localizeDbText(mapping.pattern.tongue, locale)}
                        </span>
                      </div>
                    )}
                    {mapping.pattern.pulse && (
                      <div>
                        <span className="font-medium">{t(messages, "detail.condition.pulse")}:</span>
                        <span className="text-muted ml-1">
                          {localizeDbText(mapping.pattern.pulse, locale)}
                        </span>
                      </div>
                    )}
                  </div>

                  {mapping.pattern.keySymptoms && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">{t(messages, "detail.condition.keySymptoms")}:</span>
                      <span className="text-muted ml-1 line-clamp-2">
                        {localizeDbText(mapping.pattern.keySymptoms, locale)}
                      </span>
                    </div>
                  )}

                  {mapping.pattern.treatmentPrinciple && (
                    <div className="mt-1 text-sm">
                      <span className="font-medium">{t(messages, "detail.condition.treatmentPrinciple")}:</span>
                      <span className="text-muted ml-1">
                        {localizeDbText(mapping.pattern.treatmentPrinciple, locale)}
                      </span>
                    </div>
                  )}

                  {mapping.notes && (
                    <p className="mt-2 text-xs text-muted italic">{localizeDbText(mapping.notes, locale)}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {matchedDisease && (
        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                🔬 {locale === "zh-Hant" ? "系統性研究證據" : "Systematic Research Evidence"}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                {locale === "zh-Hant"
                  ? `本症對應「${matchedDisease.nameZh}」研究模塊，收錄 ${researchEvidenceCount} 項研究、${researchTrialCount} 個已登記臨床試驗、網絡藥理靶點分析及配方重定向評分。`
                  : `This condition maps to the "${matchedDisease.nameEn}" research module — ${researchEvidenceCount} evidence entries, ${researchTrialCount} registered clinical trials, network pharmacology target analysis, and formula repurposing scores.`}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-blue-700">
                {researchEvidenceCount > 0 && (
                  <span>📄 {researchEvidenceCount} {locale === "zh-Hant" ? "篇研究" : "studies"}</span>
                )}
                {researchTrialCount > 0 && (
                  <span>🧪 {researchTrialCount} {locale === "zh-Hant" ? "臨床試驗" : "clinical trials"}</span>
                )}
                <span>🔬 {locale === "zh-Hant" ? "網絡藥理" : "Network pharmacology"}</span>
                <span>⭐ {locale === "zh-Hant" ? "可信度評分" : "Credibility scoring"}</span>
              </div>
            </div>
            <Link
              href={`/research/${matchedDisease.id}`}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {locale === "zh-Hant" ? "查看研究 →" : "View research →"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
