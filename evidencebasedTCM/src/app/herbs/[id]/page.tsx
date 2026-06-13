import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { HerbProperties } from "@/components/herbs/HerbProperties";
import { SafetyBadges } from "@/components/safety/SafetyBadges";
import { HerbRadar } from "@/components/herbs/HerbRadar";
import { HerbPrincipleBridge } from "@/components/herbs/HerbPrincipleBridge";
import { DosageCalculator } from "@/components/herbs/DosageCalculator";
import { DetailTabs } from "@/components/shared/DetailTabs";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Badge } from "@/components/shared/Badge";
import { HERB_FLAVOR_CONFIG, HERB_NATURE_CONFIG } from "@/lib/utils/tcm-constants";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";
import { tcmEntityTitles } from "@/lib/i18n/entity-display";
import {
  herbCategoryLabel,
  herbFlavorLabel,
  herbNatureLabel,
  meridianLabel,
  studyTypeLabel,
  evidenceLevelLabel,
  interactionSeverityLabel,
  formulaRoleLabel,
  pregnancyCategoryLabel,
} from "@/lib/i18n/data-labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HerbDetailPage({ params }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { id } = await params;

  const herb = await prisma.herb.findUnique({
    where: { id },
    include: {
      activeCompounds: true,
      formulaHerbs: {
        include: {
          formula: {
            select: {
              id: true,
              pinyinName: true,
              chineseName: true,
              englishName: true,
              category: true,
              patternFormulas: {
                where: { isPrimary: true },
                select: {
                  isPrimary: true,
                  pattern: {
                    select: {
                      id: true,
                      chineseName: true,
                      pinyinName: true,
                      englishName: true,
                      pathologyType: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      evidenceLinks: {
        include: { evidence: true },
      },
      drugInteractions: { orderBy: { severity: "asc" } },
      contraindications: true,
      herbInteractionsA: {
        include: { herbB: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
      herbInteractionsB: {
        include: { herbA: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
    },
  });

  if (!herb) notFound();

  const { primary: titlePrimary, secondary: titleSecondary } = tcmEntityTitles(herb, locale);
  const natureConfig = HERB_NATURE_CONFIG[herb.nature as keyof typeof HERB_NATURE_CONFIG];
  const flavorBadges = herb.flavor.map((f) => {
    const config = HERB_FLAVOR_CONFIG[f.toLowerCase()];
    return {
      label: herbFlavorLabel(locale, f),
      color: config?.color ?? "bg-gray-100 text-gray-800",
    };
  });

  const propLabels = {
    nature: t(messages, "herbDetail.fieldNature"),
    flavor: t(messages, "herbDetail.fieldFlavor"),
    meridian: t(messages, "herbDetail.fieldMeridian"),
    dosage: t(messages, "herbDetail.fieldDosage"),
  };

  const overviewTab = (
    <div className="space-y-8">
      <HerbProperties
        natureLabel={herbNatureLabel(locale, herb.nature)}
        natureColor={natureConfig?.color ?? "bg-gray-100 text-gray-800"}
        flavorBadges={flavorBadges}
        meridianLabels={herb.meridianTropism.map((m) => meridianLabel(locale, m))}
        dosageRange={herb.dosageRange}
        labels={propLabels}
      />

      {herb.description && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "herbDetail.description")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(herb.description, locale)}
          </p>
        </div>
      )}

      {herb.modernPharmacology && (
        <div>
          <h3 className="text-lg font-semibold mb-2">{t(messages, "herbDetail.modernPharm")}</h3>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
            {localizeDbText(herb.modernPharmacology, locale)}
          </p>
        </div>
      )}

      {herb.activeCompounds.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "herbDetail.activeCompounds")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-semibold">{t(messages, "herbDetail.compound")}</th>
                  <th className="py-2 pr-4 text-left font-semibold">{t(messages, "herbDetail.cas")}</th>
                  <th className="py-2 text-left font-semibold">{t(messages, "herbDetail.mechanism")}</th>
                </tr>
              </thead>
              <tbody>
                {herb.activeCompounds.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{localizeDbText(c.compoundName, locale)}</td>
                    <td className="py-2 pr-4 text-muted">{c.casNumber || "—"}</td>
                    <td className="py-2 text-muted">{localizeDbText(c.mechanismOfAction, locale) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {herb.formulaHerbs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "herbDetail.inFormulas")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {herb.formulaHerbs.map((fh) => {
              const { primary, secondary } = tcmEntityTitles(fh.formula, locale);
              return (
                <Link
                  key={fh.id}
                  href={`/formulas/${fh.formula.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                >
                  <div>
                    <span className="font-medium">{primary}</span>
                    <span className="text-sm text-muted ml-2">{secondary}</span>
                  </div>
                  <Badge
                    label={formulaRoleLabel(locale, fh.role)}
                    color={
                      {
                        JUN: "bg-red-100 text-red-800 border-red-300",
                        CHEN: "bg-amber-100 text-amber-800 border-amber-300",
                        ZUO: "bg-blue-100 text-blue-800 border-blue-300",
                        SHI: "bg-green-100 text-green-800 border-green-300",
                      }[fh.role] ?? "bg-gray-100 text-gray-800"
                    }
                  />
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
      {herb.evidenceLinks.length === 0 ? (
        <p className="text-sm text-muted">{t(messages, "herbDetail.noEvidence")}</p>
      ) : (
        herb.evidenceLinks.map((link) => (
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

  const safetyTab = (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">{t(messages, "herbDetail.drugInteractions")}</h3>
        {herb.drugInteractions.length === 0 ? (
          <p className="text-sm text-muted">{t(messages, "herbDetail.noDrugIx")}</p>
        ) : (
          <div className="space-y-3">
            {herb.drugInteractions.map((di) => {
              const sevLabel = interactionSeverityLabel(locale, di.severity);
              const sevColor =
                {
                  MAJOR: "bg-red-100 text-red-800 border-red-300",
                  MODERATE: "bg-orange-100 text-orange-800 border-orange-300",
                  MINOR: "bg-yellow-100 text-yellow-800 border-yellow-300",
                  THEORETICAL: "bg-gray-100 text-gray-800 border-gray-300",
                }[di.severity] ?? "bg-gray-100 text-gray-800";
              return (
                <div key={di.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium">{localizeDbText(di.drugName, locale)}</span>
                      {di.drugClass && (
                        <span className="text-sm text-muted ml-2">
                          ({localizeDbText(di.drugClass, locale)})
                        </span>
                      )}
                    </div>
                    <Badge label={sevLabel} color={sevColor} size="md" />
                  </div>
                  {di.clinicalEffect && (
                    <p className="mt-2 text-sm text-muted">{localizeDbText(di.clinicalEffect, locale)}</p>
                  )}
                  {di.management && (
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{t(messages, "herbDetail.management")}:</span>{" "}
                      {localizeDbText(di.management, locale)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(herb.herbInteractionsA.length > 0 || herb.herbInteractionsB.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "herbDetail.herbHerbIx")}</h3>
          <div className="space-y-3">
            {herb.herbInteractionsA.map((hi) => {
              const line = tcmEntityTitles(hi.herbB, locale);
              return (
                <div key={hi.id} className="rounded-lg border border-border p-4">
                  <Link href={`/herbs/${hi.herbB.id}`} className="font-medium text-primary hover:underline">
                    {line.primary} {line.secondary}
                  </Link>
                  {hi.description && (
                    <p className="mt-1 text-sm text-muted">{localizeDbText(hi.description, locale)}</p>
                  )}
                </div>
              );
            })}
            {herb.herbInteractionsB.map((hi) => {
              const line = tcmEntityTitles(hi.herbA, locale);
              return (
                <div key={hi.id} className="rounded-lg border border-border p-4">
                  <Link href={`/herbs/${hi.herbA.id}`} className="font-medium text-primary hover:underline">
                    {line.primary} {line.secondary}
                  </Link>
                  {hi.description && (
                    <p className="mt-1 text-sm text-muted">{localizeDbText(hi.description, locale)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {herb.contraindications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t(messages, "herbDetail.contraindications")}</h3>
          <div className="space-y-3">
            {herb.contraindications.map((ci) => {
              const sevLabel = interactionSeverityLabel(locale, ci.severity);
              const sevColor =
                {
                  MAJOR: "bg-red-100 text-red-800",
                  MODERATE: "bg-orange-100 text-orange-800",
                  MINOR: "bg-yellow-100 text-yellow-800",
                  THEORETICAL: "bg-gray-100 text-gray-800",
                }[ci.severity] ?? "bg-gray-100 text-gray-800";
              return (
                <div key={ci.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{localizeDbText(ci.condition, locale)}</span>
                    <Badge label={sevLabel} color={sevColor} />
                    {ci.pregnancyCategory && (
                      <Badge
                        label={`${t(messages, "herbDetail.pregnancyBadge")}: ${pregnancyCategoryLabel(locale, ci.pregnancyCategory)}`}
                        color={
                          ci.pregnancyCategory === "CONTRAINDICATED"
                            ? "bg-red-100 text-red-800"
                            : ci.pregnancyCategory === "CAUTION"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      />
                    )}
                  </div>
                  {ci.description && (
                    <p className="mt-1 text-sm text-muted">{localizeDbText(ci.description, locale)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Flatten + dedupe primary patterns reached via this herb's formulas.
  const bridgePatterns = (() => {
    const map = new Map<
      string,
      {
        id: string;
        chineseName: string;
        pinyinName: string;
        englishName: string | null;
        pathologyType: string;
        isPrimary: boolean;
      }
    >();
    for (const fh of herb.formulaHerbs) {
      for (const pf of fh.formula.patternFormulas ?? []) {
        const p = pf.pattern;
        if (p && !map.has(p.id)) {
          map.set(p.id, { ...p, isPrimary: pf.isPrimary });
        }
      }
    }
    return Array.from(map.values());
  })();

  const visualizationTab = (
    <div className="space-y-4">
      <HerbPrincipleBridge
        locale={locale}
        nature={herb.nature}
        flavors={herb.flavor}
        meridians={herb.meridianTropism}
        category={herb.category}
        patterns={bridgePatterns}
        compounds={herb.activeCompounds.map((c) => ({
          compoundName: localizeDbText(c.compoundName, locale) ?? c.compoundName,
          mechanismOfAction: localizeDbText(c.mechanismOfAction, locale) ?? null,
        }))}
      />
      <div className="grid gap-4 md:grid-cols-2">
      <HerbRadar
        nature={herb.nature}
        flavors={herb.flavor}
        meridians={herb.meridianTropism}
        title={locale === "zh-Hant" ? "性味歸經雷達圖" : "Nature / Flavor / Meridian Radar"}
      />
      <DosageCalculator
        herbName={titlePrimary}
        dosageRange={herb.dosageRange}
        labels={{
          title: locale === "zh-Hant" ? "劑量計算" : "Dosage Calculator",
          adultWeight: locale === "zh-Hant" ? "成人體重 (kg)" : "Adult weight (kg)",
          pediatricWeight: locale === "zh-Hant" ? "小兒體重 (kg)" : "Pediatric weight (kg)",
          decoction: locale === "zh-Hant" ? "湯劑" : "Decoction",
          powder: locale === "zh-Hant" ? "散劑" : "Powder",
          frequency: locale === "zh-Hant" ? "分服" : "Frequency",
          recommended: locale === "zh-Hant" ? "建議範圍" : "Reference range",
          daily: locale === "zh-Hant" ? "每日" : "Daily",
          pediatricNote:
            locale === "zh-Hant"
              ? "小兒劑量依 Clark 比例（體重/70kg）估算，臨床請依年齡、體質微調。"
              : "Pediatric scaling via Clark's rule (weight/70kg); adjust by age & constitution.",
          safetyNote:
            locale === "zh-Hant"
              ? "此計算為參考，妊娠、肝腎功能不良者請個別調整。"
              : "Reference only — adjust for pregnancy, hepatic/renal impairment.",
        }}
      />
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", label: t(messages, "herbDetail.tabOverview"), content: overviewTab },
    {
      id: "visualization",
      label: locale === "zh-Hant" ? "圖表/劑量" : "Visual & Dosage",
      content: visualizationTab,
    },
    {
      id: "evidence",
      label: `${t(messages, "herbDetail.tabEvidence")} (${herb.evidenceLinks.length})`,
      content: evidenceTab,
    },
    {
      id: "safety",
      label: `${t(messages, "herbDetail.tabSafety")} (${herb.drugInteractions.length + herb.contraindications.length})`,
      content: safetyTab,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/herbs" className="hover:text-primary">
          {t(messages, "herbDetail.breadcrumb")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{titlePrimary}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{titlePrimary}</h1>
        <p className="text-lg text-muted mt-1">{titleSecondary}</p>
        {herb.latinName && (
          <p className="text-sm text-muted italic">{herb.latinName}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            label={herbCategoryLabel(locale, herb.category)}
            color="bg-emerald-100 text-emerald-800"
            size="md"
          />
          <SafetyBadges herbId={herb.id} locale={locale} />
        </div>
      </div>

      <DetailTabs tabs={tabs} />
    </div>
  );
}
