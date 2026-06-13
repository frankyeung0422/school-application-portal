import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const query = params.q || "";

  if (!query) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">{t(messages, "search.titleEmpty")}</h1>
        <p className="text-muted">{t(messages, "search.noQuery")}</p>
      </div>
    );
  }

  const textFilter = { contains: query, mode: "insensitive" as const };

  const [herbs, formulas, acupoints, patterns, conditions, evidence] = await Promise.all([
    prisma.herb.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { pinyinName: textFilter },
          { chineseName: { contains: query } },
          { englishName: textFilter },
          { latinName: textFilter },
        ],
      },
      take: 10,
      select: { id: true, pinyinName: true, chineseName: true, englishName: true, category: true, nature: true },
    }),
    prisma.formula.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { pinyinName: textFilter },
          { chineseName: { contains: query } },
          { englishName: textFilter },
        ],
      },
      take: 10,
      select: { id: true, pinyinName: true, chineseName: true, englishName: true, category: true },
    }),
    prisma.acupuncturePoint.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { code: textFilter },
          { pinyinName: textFilter },
          { chineseName: { contains: query } },
          { englishName: textFilter },
        ],
      },
      take: 10,
      select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
    }),
    prisma.tcmPattern.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { pinyinName: textFilter },
          { chineseName: { contains: query } },
          { englishName: textFilter },
        ],
      },
      take: 10,
      select: { id: true, pinyinName: true, chineseName: true, pathologyType: true },
    }),
    prisma.conditionMapping.findMany({
      where: {
        OR: [
          { westernName: textFilter },
          { icd10Code: textFilter },
        ],
      },
      take: 10,
      select: { id: true, westernName: true, icd10Code: true },
    }),
    prisma.evidenceEntry.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: textFilter },
          { authors: textFilter },
          { journal: textFilter },
        ],
      },
      take: 10,
      select: { id: true, title: true, studyType: true, evidenceGrade: true, year: true },
    }),
  ]);

  const totalResults = herbs.length + formulas.length + acupoints.length +
    patterns.length + conditions.length + evidence.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{tf(messages, "search.title", { q: query })}</h1>
        <p className="mt-2 text-muted">
          {tf(messages, "search.foundSummary", { count: totalResults, q: query })}
        </p>
      </div>

      {totalResults === 0 ? (
        <EmptyState
          title={t(messages, "search.emptyTitle")}
          description={t(messages, "search.emptyDesc")}
        />
      ) : (
        <div className="space-y-8">
          {/* Herbs */}
          {herbs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {t(messages, "search.sectionHerbs")}{" "}
                <Badge label={`${herbs.length}`} color="bg-emerald-100 text-emerald-800" />
              </h2>
              <div className="space-y-2">
                {herbs.map((herb) => (
                  <Link
                    key={herb.id}
                    href={`/herbs/${herb.id}`}
                    className="block rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                  >
                    <span className="font-medium">{herb.pinyinName}</span>
                    <span className="text-muted ml-2">{herb.chineseName}</span>
                    {herb.englishName && <span className="text-muted ml-2">({herb.englishName})</span>}
                    <Badge label={herb.category} size="sm" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Formulas */}
          {formulas.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {t(messages, "search.sectionFormulas")}{" "}
                <Badge label={`${formulas.length}`} color="bg-violet-100 text-violet-800" />
              </h2>
              <div className="space-y-2">
                {formulas.map((formula) => (
                  <Link
                    key={formula.id}
                    href={`/formulas/${formula.id}`}
                    className="block rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                  >
                    <span className="font-medium">{formula.pinyinName}</span>
                    <span className="text-muted ml-2">{formula.chineseName}</span>
                    {formula.englishName && <span className="text-muted ml-2">({formula.englishName})</span>}
                    <Badge label={formula.category} size="sm" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Acupoints */}
          {acupoints.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {t(messages, "search.sectionAcupuncture")}{" "}
                <Badge label={`${acupoints.length}`} color="bg-teal-100 text-teal-800" />
              </h2>
              <div className="space-y-2">
                {acupoints.map((point) => (
                  <Link
                    key={point.id}
                    href={`/acupuncture/${point.id}`}
                    className="block rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                  >
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">{point.code}</span>
                    <span className="font-medium">{point.pinyinName}</span>
                    <span className="text-muted ml-2">{point.chineseName}</span>
                    <Badge label={point.meridian} size="sm" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Patterns */}
          {patterns.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {t(messages, "search.sectionPatterns")}{" "}
                <Badge label={`${patterns.length}`} color="bg-purple-100 text-purple-800" />
              </h2>
              <div className="space-y-2">
                {patterns.map((pattern) => (
                  <Link
                    key={pattern.id}
                    href={`/patterns/${pattern.id}`}
                    className="block rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                  >
                    <span className="font-medium">{pattern.pinyinName}</span>
                    <span className="text-muted ml-2">{pattern.chineseName}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Conditions */}
          {conditions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {t(messages, "search.sectionConditions")}{" "}
                <Badge label={`${conditions.length}`} color="bg-blue-100 text-blue-800" />
              </h2>
              <div className="space-y-2">
                {conditions.map((condition) => (
                  <Link
                    key={condition.id}
                    href={`/conditions/${condition.id}`}
                    className="block rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                  >
                    <span className="font-medium">{condition.westernName}</span>
                    {condition.icd10Code && (
                      <Badge label={`ICD-10: ${condition.icd10Code}`} color="bg-blue-100 text-blue-800" size="sm" />
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {t(messages, "search.sectionEvidence")}{" "}
                <Badge label={`${evidence.length}`} color="bg-orange-100 text-orange-800" />
              </h2>
              <div className="space-y-2">
                {evidence.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/evidence/${entry.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary-light transition-colors"
                  >
                    <div>
                      <span className="font-medium">{entry.title}</span>
                      {entry.year && <span className="text-muted ml-2">({entry.year})</span>}
                    </div>
                    <EvidenceBadge grade={entry.evidenceGrade as "A" | "B" | "C" | "D"} size="sm" locale={locale} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
