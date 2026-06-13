import { prisma } from "@/lib/db/prisma";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { EVIDENCE_GRADE_CONFIG, STUDY_TYPE_LABELS } from "@/lib/utils/evidence-grades";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { studyTypeLabel, evidenceLevelLabel, gradeQualityLabel } from "@/lib/i18n/data-labels";
import { localizeDbText } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-orange-500",
  D: "bg-red-500",
};

const GRADE_ACTIVE_COLORS: Record<string, string> = {
  A: "bg-green-600 text-white border-green-600",
  B: "bg-blue-600 text-white border-blue-600",
  C: "bg-orange-500 text-white border-orange-500",
  D: "bg-red-600 text-white border-red-600",
};

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    grade?: string;
    studyType?: string;
    yearFrom?: string;
    yearTo?: string;
  }>;
}

export default async function EvidencePage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const grade = params.grade || "";
  const studyType = params.studyType || "";
  const yearFrom = params.yearFrom ? parseInt(params.yearFrom) : null;
  const yearTo = params.yearTo ? parseInt(params.yearTo) : null;

  const where = {
    status: "PUBLISHED" as const,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { authors: { contains: search, mode: "insensitive" as const } },
        { journal: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(grade && { evidenceGrade: grade as "A" | "B" | "C" | "D" }),
    ...(studyType && {
      studyType: studyType as
        | "SYSTEMATIC_REVIEW"
        | "META_ANALYSIS"
        | "RCT"
        | "COHORT"
        | "CASE_CONTROL"
        | "CASE_SERIES"
        | "CASE_REPORT"
        | "EXPERT_OPINION"
        | "TRADITIONAL_USE",
    }),
    ...((yearFrom || yearTo) && {
      year: {
        ...(yearFrom && { gte: yearFrom }),
        ...(yearTo && { lte: yearTo }),
      },
    }),
  };

  const [entries, total, gradeDistribution] = await Promise.all([
    prisma.evidenceEntry.findMany({
      where,
      orderBy: [{ evidenceGrade: "asc" }, { year: "desc" }],
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.evidenceEntry.count({ where }),
    prisma.evidenceEntry.groupBy({
      by: ["evidenceGrade"],
      _count: true,
      where: { status: "PUBLISHED" },
    }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const totalAll = gradeDistribution.reduce((sum, g) => sum + g._count, 0);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (search && !overrides.search) p.set("search", search);
    if (overrides.search) p.set("search", overrides.search);
    if (overrides.grade !== undefined) {
      if (overrides.grade) p.set("grade", overrides.grade);
    } else if (grade) {
      p.set("grade", grade);
    }
    if (overrides.studyType !== undefined) {
      if (overrides.studyType) p.set("studyType", overrides.studyType);
    } else if (studyType) {
      p.set("studyType", studyType);
    }
    if (yearFrom && !overrides.yearFrom) p.set("yearFrom", String(yearFrom));
    if (yearTo && !overrides.yearTo) p.set("yearTo", String(yearTo));
    const qs = p.toString();
    return `/evidence${qs ? `?${qs}` : ""}`;
  }

  const hasFilters = !!(grade || studyType || yearFrom || yearTo);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(messages, "evidence.title")}</h1>
        <p className="mt-2 text-muted">{tf(messages, "evidence.pageSubtitleAll", { count: totalAll })}</p>
      </div>

      {totalAll > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{t(messages, "evidence.gradeDistribution")}</span>
            <span className="text-xs text-muted">{tf(messages, "evidence.totalItems", { count: totalAll })}</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden mb-2">
            {(["A", "B", "C", "D"] as const).map((g) => {
              const entry = gradeDistribution.find((d) => d.evidenceGrade === g);
              const count = entry?._count || 0;
              const pct = totalAll > 0 ? (count / totalAll) * 100 : 0;
              if (pct === 0) return null;
              const q = gradeQualityLabel(locale, g);
              return (
                <div
                  key={g}
                  className={`${GRADE_COLORS[g]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${g} (${q}): ${count} (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {(["A", "B", "C", "D"] as const).map((g) => {
              const entry = gradeDistribution.find((d) => d.evidenceGrade === g);
              const count = entry?._count || 0;
              const config = EVIDENCE_GRADE_CONFIG[g];
              return (
                <span key={g} className="flex items-center gap-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                  <span className="text-muted">{tf(messages, "evidence.gradeCount", { grade: g })}</span>
                  <span className="font-medium">{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <form className="max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t(messages, "evidence.listSearchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface py-2 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </form>

        <div>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-3">
            {t(messages, "evidence.gradeFilter")}
          </span>
          <div className="inline-flex flex-wrap gap-2 mt-1">
            <Link
              href={buildHref({ grade: "" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                !grade ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {t(messages, "common.all")}
            </Link>
            {(["A", "B", "C", "D"] as const).map((g) => (
              <Link
                key={g}
                href={buildHref({ grade: g })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  grade === g ? GRADE_ACTIVE_COLORS[g] : "border-border text-muted hover:text-foreground"
                }`}
              >
                {tf(messages, "home.gradeLine", { grade: g })}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-3">
            {t(messages, "evidence.studyTypeFilter")}
          </span>
          <div className="inline-flex flex-wrap gap-2 mt-1">
            <Link
              href={buildHref({ studyType: "" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                !studyType ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {t(messages, "common.all")}
            </Link>
            {Object.keys(STUDY_TYPE_LABELS).map((key) => (
              <Link
                key={key}
                href={buildHref({ studyType: key })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  studyType === key ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {studyTypeLabel(locale, key)}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">
            {t(messages, "evidence.yearRange")}
          </span>
          <form className="flex items-center gap-2 flex-wrap">
            {search && <input type="hidden" name="search" value={search} />}
            {grade && <input type="hidden" name="grade" value={grade} />}
            {studyType && <input type="hidden" name="studyType" value={studyType} />}
            <input
              type="number"
              name="yearFrom"
              defaultValue={yearFrom || ""}
              placeholder={t(messages, "evidence.yearFrom")}
              min={1950}
              max={2030}
              className="w-24 rounded-lg border border-border bg-surface py-1.5 px-3 text-xs focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
            />
            <span className="text-muted text-xs">{t(messages, "evidence.yearToConnector")}</span>
            <input
              type="number"
              name="yearTo"
              defaultValue={yearTo || ""}
              placeholder={t(messages, "evidence.yearTo")}
              min={1950}
              max={2030}
              className="w-24 rounded-lg border border-border bg-surface py-1.5 px-3 text-xs focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark transition-colors"
            >
              {t(messages, "evidence.applyFilters")}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted">
            {hasFilters ? (
              <>
                {tf(messages, "evidence.showingFiltered", { filtered: total, total: totalAll })}
              </>
            ) : (
              <>{tf(messages, "evidence.showingAll", { count: total })}</>
            )}
          </p>
          {hasFilters && (
            <Link href="/evidence" className="text-xs text-primary hover:underline">
              {t(messages, "evidence.clearFilters")}
            </Link>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState title={t(messages, "evidence.emptyTitle")} description={t(messages, "evidence.emptyDesc")} />
      ) : (
        <>
          <div className="space-y-3">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/evidence/${entry.id}`}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-primary-light hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{localizeDbText(entry.title, locale)}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                      <span>{studyTypeLabel(locale, entry.studyType)}</span>
                      {entry.year && <span>({entry.year})</span>}
                      {entry.journal && (
                        <span>
                          {t(messages, "common.dash")} {localizeDbText(entry.journal, locale)}
                        </span>
                      )}
                    </div>
                    {entry.authors && (
                      <p className="mt-1 text-xs text-muted line-clamp-1">
                        {localizeDbText(entry.authors, locale)}
                      </p>
                    )}
                    <div className="mt-1 text-xs text-muted">
                      {evidenceLevelLabel(locale, entry.evidenceLevel)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <EvidenceBadge grade={entry.evidenceGrade as "A" | "B" | "C" | "D"} locale={locale} />
                    {entry.sampleSize && (
                      <span className="text-xs text-muted">n={entry.sampleSize}</span>
                    )}
                  </div>
                </div>
                {entry.summary && (
                  <p className="mt-2 text-sm text-muted line-clamp-2">
                    {localizeDbText(entry.summary, locale)}
                  </p>
                )}
              </Link>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
