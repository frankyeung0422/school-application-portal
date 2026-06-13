import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Badge } from "@/components/shared/Badge";
import { EvidencePyramid } from "@/components/shared/EvidencePyramid";
import { EVIDENCE_GRADE_CONFIG } from "@/lib/utils/evidence-grades";
import { CitationExport } from "@/components/evidence/CitationExport";
import { freshnessBadge } from "@/lib/evidence/citation";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import {
  studyTypeLabel,
  evidenceLevelLabel,
  gradeQualityLabel,
  riskOfBiasLabel,
  outcomeTypeLabel,
  effectDirectionLabel,
} from "@/lib/i18n/data-labels";
import { EvidenceAnnotationPanel } from "@/components/evidence/EvidenceAnnotationPanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EvidenceDetailPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;

  const entry = await prisma.evidenceEntry.findUnique({
    where: { id },
    include: {
      herbLinks: {
        include: { herb: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
      formulaLinks: {
        include: { formula: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
      acupointLinks: {
        include: { acupoint: { select: { id: true, code: true, pinyinName: true, chineseName: true } } },
      },
      patternLinks: {
        include: { pattern: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
    },
  });

  if (!entry) notFound();

  const gradeConfig = EVIDENCE_GRADE_CONFIG[entry.evidenceGrade as keyof typeof EVIDENCE_GRADE_CONFIG];
  const qualityWord = gradeQualityLabel(locale, entry.evidenceGrade);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/evidence" className="hover:text-primary">
          {t(messages, "nav.evidence")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground line-clamp-1">{localizeDbText(entry.title, locale)}</span>
      </nav>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{localizeDbText(entry.title, locale)}</h1>
          <EvidenceBadge grade={entry.evidenceGrade as "A" | "B" | "C" | "D"} showLabel size="lg" locale={locale} />
        </div>
        {entry.authors && (
          <p className="mt-2 text-sm text-muted">{localizeDbText(entry.authors, locale)}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
          {entry.journal && <span>{localizeDbText(entry.journal, locale)}</span>}
          {entry.year && <span>({entry.year})</span>}
          {entry.doi && (
            <a
              href={`https://doi.org/${entry.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t(messages, "detail.evidence.doiLink")}: {entry.doi}
            </a>
          )}
          {entry.pubmedId && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${entry.pubmedId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t(messages, "detail.evidence.pubmedLink")}: {entry.pubmedId}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {t(messages, "detail.evidence.studyType")}
          </h4>
          <p className="font-medium">{studyTypeLabel(locale, entry.studyType)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {t(messages, "detail.evidence.evidenceLevel")}
          </h4>
          <p className="font-medium">{evidenceLevelLabel(locale, entry.evidenceLevel)}</p>
        </div>
        <div className={`rounded-lg border-2 p-4 ${gradeConfig?.color || "border-gray-300 bg-gray-50"}`}>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-1">
            {t(messages, "detail.evidence.evidenceGrade")}
          </h4>
          <p className="font-medium">
            {tf(messages, "detail.evidence.gradeSummary", {
              grade: entry.evidenceGrade,
              quality: qualityWord,
            })}
          </p>
        </div>
        {entry.sampleSize != null && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.evidence.sampleSize")}
            </h4>
            <p className="font-medium">{tf(messages, "detail.evidence.sampleN", { n: entry.sampleSize })}</p>
          </div>
        )}
        {entry.riskOfBias && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.evidence.riskOfBias")}
            </h4>
            <Badge
              label={riskOfBiasLabel(locale, entry.riskOfBias)}
              color={
                entry.riskOfBias === "LOW"
                  ? "bg-green-100 text-green-800"
                  : entry.riskOfBias === "HIGH"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }
              size="md"
            />
          </div>
        )}
        {entry.qualityScore != null && (
          <div className="rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {t(messages, "detail.evidence.qualityScore")}
            </h4>
            <p className="font-medium">
              {entry.qualityScore}
              {entry.qualityTool && ` (${localizeDbText(entry.qualityTool, locale)})`}
            </p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <EvidencePyramid
          highlight={entry.evidenceGrade as "A" | "B" | "C" | "D"}
          locale={locale}
          variant="full"
        />
      </div>

      <div className="space-y-8">
        {entry.abstract && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.abstract")}</h3>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {localizeDbText(entry.abstract, locale)}
            </p>
          </div>
        )}

        {entry.summary && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.summary")}</h3>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {localizeDbText(entry.summary, locale)}
            </p>
          </div>
        )}

        {entry.population && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.population")}</h3>
            <p className="text-sm text-muted leading-relaxed">{localizeDbText(entry.population, locale)}</p>
          </div>
        )}

        {entry.intervention && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.intervention")}</h3>
            <p className="text-sm text-muted leading-relaxed">{localizeDbText(entry.intervention, locale)}</p>
          </div>
        )}

        {entry.comparator && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.comparator")}</h3>
            <p className="text-sm text-muted leading-relaxed">{localizeDbText(entry.comparator, locale)}</p>
          </div>
        )}

        {entry.primaryOutcome && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.primaryOutcome")}</h3>
            <p className="text-sm text-muted leading-relaxed">{localizeDbText(entry.primaryOutcome, locale)}</p>
          </div>
        )}

        {entry.resultsSummary && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t(messages, "detail.evidence.results")}</h3>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {localizeDbText(entry.resultsSummary, locale)}
            </p>
          </div>
        )}

        {entry.herbLinks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.evidence.linkedHerbs")}</h3>
            <div className="flex flex-wrap gap-2">
              {entry.herbLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/herbs/${link.herb.id}`}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light transition-colors"
                >
                  <span className="font-medium">{link.herb.pinyinName}</span>
                  <span className="text-muted ml-1">{localizeDbText(link.herb.chineseName, locale)}</span>
                  <Badge
                    label={`${outcomeTypeLabel(locale, link.outcomeType)} · ${effectDirectionLabel(locale, link.effectDirection)}`}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {entry.formulaLinks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.evidence.linkedFormulas")}</h3>
            <div className="flex flex-wrap gap-2">
              {entry.formulaLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/formulas/${link.formula.id}`}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light transition-colors"
                >
                  <span className="font-medium">{link.formula.pinyinName}</span>
                  <span className="text-muted ml-1">{localizeDbText(link.formula.chineseName, locale)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {entry.acupointLinks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.evidence.linkedAcu")}</h3>
            <div className="flex flex-wrap gap-2">
              {entry.acupointLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/acupuncture/${link.acupoint.id}`}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light transition-colors"
                >
                  <span className="font-mono text-xs mr-1">{link.acupoint.code}</span>
                  <span className="font-medium">{link.acupoint.pinyinName}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-3">
            {locale === "zh-Hant" ? "引用匯出" : "Citation Export"}
            {entry.year && (
              <span className="ml-2 text-xs font-normal text-muted">
                · {locale === "zh-Hant" ? "文獻年齡" : "Age"}: {freshnessBadge(entry.year).label}
              </span>
            )}
          </h3>
          <CitationExport
            source={{
              id: entry.id,
              title: entry.title,
              authors: entry.authors,
              journal: entry.journal,
              year: entry.year,
              doi: entry.doi,
              pubmedId: entry.pubmedId,
              studyType: entry.studyType,
            }}
          />
        </div>

        {entry.patternLinks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t(messages, "detail.evidence.linkedPatterns")}</h3>
            <div className="flex flex-wrap gap-2">
              {entry.patternLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/patterns/${link.pattern.id}`}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:border-primary-light transition-colors"
                >
                  <span className="font-medium">{link.pattern.pinyinName}</span>
                  <span className="text-muted ml-1">{localizeDbText(link.pattern.chineseName, locale)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <EvidenceAnnotationPanel evidenceId={entry.id} />
      </div>
    </div>
  );
}
