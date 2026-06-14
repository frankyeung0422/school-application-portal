import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { DetailTabs } from "@/components/shared/DetailTabs";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { TermPopover } from "@/components/i18n/TermPopover";
import { Badge } from "@/components/shared/Badge";
import { TongueDiagram } from "@/components/shared/TongueDiagram";
import { PulseWaveform } from "@/components/shared/PulseWaveform";
import { PathomechanismFlow } from "@/components/patterns/PathomechanismFlow";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import { tcmEntityTitles } from "@/lib/i18n/entity-display";
import {
  studyTypeLabel,
  evidenceLevelLabel,
  pathologyLabel,
  mappingFrequencyLabel,
} from "@/lib/i18n/data-labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PatternDetailPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;

  const pattern = await prisma.tcmPattern.findUnique({
    where: { id },
    include: {
      patternFormulas: {
        include: {
          formula: {
            select: { id: true, pinyinName: true, chineseName: true, englishName: true, category: true },
          },
        },
      },
      patternAcupoints: {
        include: {
          acupoint: {
            select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
          },
        },
      },
      conditionMappings: {
        include: {
          condition: {
            select: { id: true, westernName: true, icd10Code: true },
          },
        },
      },
      evidenceLinks: {
        include: { evidence: true },
      },
    },
  });

  if (!pattern) notFound();

  const header = tcmEntityTitles(pattern, locale);

  const overviewTab = (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {t(messages, "detail.pattern.pathologyType")}
          </h4>
          <p className="font-medium">{pathologyLabel(locale, pattern.pathologyType)}</p>
        </div>
        {pattern.organSystem && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.pattern.organSystem")}
            </h4>
            <p className="font-medium">{localizeDbText(pattern.organSystem, locale)}</p>
          </div>
        )}
        {pattern.tongue && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.pattern.tongue")}
            </h4>
            <p className="font-medium">{localizeDbText(pattern.tongue, locale)}</p>
          </div>
        )}
        {pattern.pulse && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.pattern.pulse")}
            </h4>
            <p className="font-medium">{localizeDbText(pattern.pulse, locale)}</p>
          </div>
        )}
      </div>

      {(pattern.tongue || pattern.pulse) && (
        <div className="grid gap-4 md:grid-cols-2">
          {pattern.tongue && (
            <TongueDiagram
              description={localizeDbText(pattern.tongue, locale)}
              locale={locale}
            />
          )}
          {pattern.pulse && (
            <PulseWaveform
              description={localizeDbText(pattern.pulse, locale)}
              locale={locale}
            />
          )}
        </div>
      )}

      {pattern.keySymptoms && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.pattern.keySymptoms")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(pattern.keySymptoms, locale)}
          </p>
        </div>
      )}

      {pattern.treatmentPrinciple && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.pattern.treatmentPrinciple")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(pattern.treatmentPrinciple, locale)}
          </p>
        </div>
      )}

      {pattern.contraindications && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h3 className="text-base font-semibold text-orange-900 mb-1">
            {locale === "zh-Hant" ? "⚠ 禁忌" : "⚠ Contraindications"}
          </h3>
          <p className="text-sm text-orange-800 leading-relaxed whitespace-pre-line">
            {pattern.contraindications}
          </p>
        </div>
      )}

      {pattern.patternFormulas.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.pattern.recommendedFormulas")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {pattern.patternFormulas.map((pf) => {
              const ft = tcmEntityTitles(pf.formula, locale);
              return (
                <Link
                  key={pf.id}
                  href={`/formulas/${pf.formula.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                >
                  <div>
                    <span className="font-medium">{ft.primary}</span>
                    <span className="text-sm text-muted ml-2">{ft.secondary}</span>
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

      {pattern.patternAcupoints.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.pattern.recommendedAcu")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {pattern.patternAcupoints.map((pa) => {
              const at = tcmEntityTitles(
                {
                  pinyinName: pa.acupoint.pinyinName,
                  chineseName: pa.acupoint.chineseName,
                  englishName: null,
                },
                locale
              );
              return (
                <Link
                  key={pa.id}
                  href={`/acupuncture/${pa.acupoint.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                      {pa.acupoint.code}
                    </span>
                    <span className="font-medium">{at.primary}</span>
                    <span className="text-sm text-muted ml-2">{at.secondary}</span>
                  </div>
                  {pa.stimulationMethod && (
                    <Badge label={localizeDbText(pa.stimulationMethod, locale) ?? pa.stimulationMethod} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {pattern.conditionMappings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.pattern.westernMappings")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {pattern.conditionMappings.map((cm) => (
              <Link
                key={cm.id}
                href={`/conditions/${cm.condition.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
              >
                <span className="font-medium">
                  {localizeDbText(cm.condition.westernName, locale) ?? cm.condition.westernName}
                </span>
                <div className="flex gap-2">
                  {cm.condition.icd10Code && (
                    <Badge
                      label={`${t(messages, "detail.codeIcd10")}: ${cm.condition.icd10Code}`}
                      color="bg-blue-100 text-blue-800"
                    />
                  )}
                  <Badge label={mappingFrequencyLabel(locale, cm.frequency)} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const evidenceTab = (
    <div className="space-y-4">
      {pattern.evidenceLinks.length === 0 ? (
        <p className="text-sm text-muted">{t(messages, "detail.pattern.noEvidence")}</p>
      ) : (
        pattern.evidenceLinks.map((link) => (
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

  const primaryFormula = (() => {
    const pf = pattern.patternFormulas.find((x) => x.isPrimary) ?? pattern.patternFormulas[0];
    return pf
      ? {
          id: pf.formula.id,
          chineseName: pf.formula.chineseName,
          pinyinName: pf.formula.pinyinName,
          englishName: pf.formula.englishName,
        }
      : null;
  })();

  const mechanismTab = (
    <PathomechanismFlow
      locale={locale}
      pathologyType={pattern.pathologyType}
      organSystem={localizeDbText(pattern.organSystem, locale) ?? pattern.organSystem}
      keySymptoms={localizeDbText(pattern.keySymptoms, locale) ?? pattern.keySymptoms}
      treatmentPrinciple={localizeDbText(pattern.treatmentPrinciple, locale) ?? pattern.treatmentPrinciple}
      primaryFormula={primaryFormula}
    />
  );

  const tabs = [
    { id: "overview", label: t(messages, "detail.tabOverview"), content: overviewTab },
    {
      id: "mechanism",
      label: locale === "zh-Hant" ? "病機" : "Pathomechanism",
      content: mechanismTab,
    },
    {
      id: "evidence",
      label: tf(messages, "detail.tabEvidenceCount", { count: pattern.evidenceLinks.length }),
      content: evidenceTab,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/patterns" className="hover:text-primary">
          {t(messages, "nav.patterns")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{header.primary}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          <TermPopover term={pattern.chineseName} locale={locale}>
            {header.primary}
          </TermPopover>
        </h1>
        <p className="text-lg text-muted mt-1">{header.secondary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            label={pathologyLabel(locale, pattern.pathologyType)}
            color="bg-purple-100 text-purple-800"
            size="md"
          />
          {pattern.organSystem && (
            <Badge
              label={localizeDbText(pattern.organSystem, locale) ?? pattern.organSystem}
              color="bg-emerald-100 text-emerald-800"
              size="md"
            />
          )}
          <Link
            href={`/patterns/${id}/protocol`}
            className="rounded-md border border-border bg-surface hover:bg-primary/5 hover:border-primary-light px-3 py-1 text-xs font-medium transition-colors"
          >
            📋 {locale === "zh-Hant" ? "臨床方案" : "Clinical Protocol"}
          </Link>
        </div>
      </div>

      <DetailTabs tabs={tabs} />
    </div>
  );
}
