import { prisma } from "@/lib/db/prisma";
import { AcupointCard } from "@/components/acupuncture/AcupointCard";
import { AcupointViewToggle } from "@/components/acupuncture/AcupointViewToggle";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { MERIDIAN_LIST } from "@/lib/utils/tcm-constants";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { tf } from "@/lib/i18n/format-message";
import { t } from "@/lib/i18n/resolve-message";
import { meridianLabel } from "@/lib/i18n/data-labels";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";
import { MeridianBodyMap } from "@/components/shared/MeridianBodyMap";

const ITEMS_PER_PAGE = 24;

interface Props {
  searchParams: Promise<{ page?: string; search?: string; meridian?: string }>;
}

export default async function AcupuncturePage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const meridian = params.meridian || "";

  const where = {
    status: "PUBLISHED" as const,
    ...(search && {
      OR: [
        { code: { contains: search, mode: "insensitive" as const } },
        { pinyinName: { contains: search, mode: "insensitive" as const } },
        { chineseName: { contains: search } },
        { englishName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(meridian && { meridian }),
  };

  const [acupoints, total, allPointsForMap] = await Promise.all([
    prisma.acupuncturePoint.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        evidenceLinks: {
          include: { evidence: { select: { evidenceGrade: true } } },
        },
      },
    }),
    prisma.acupuncturePoint.count({ where }),
    prisma.acupuncturePoint.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function getHighestGrade(evidenceLinks: { evidence: { evidenceGrade: string } }[]): string | null {
    const grades = evidenceLinks.map((l) => l.evidence.evidenceGrade);
    if (grades.includes("A")) return "A";
    if (grades.includes("B")) return "B";
    if (grades.includes("C")) return "C";
    if (grades.includes("D")) return "D";
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(messages, "acupuncture.title")}</h1>
        <p className="mt-2 text-muted">{tf(messages, "acupuncture.subtitle", { count: total })}</p>
      </div>

      <div className="mb-6">
        <MeridianBodyMap locale={locale} highlight={meridian || undefined} />
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <form className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t(messages, "acupuncture.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface py-2 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/acupuncture"
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              !meridian ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {t(messages, "common.all")}
          </Link>
          {MERIDIAN_LIST.map((m) => (
            <Link
              key={m}
              href={`/acupuncture?meridian=${encodeURIComponent(m)}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                meridian === m ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {meridianLabel(locale, m)}
            </Link>
          ))}
        </div>
      </div>

      {acupoints.length === 0 ? (
        <EmptyState title={t(messages, "acupuncture.emptyTitle")} description={t(messages, "acupuncture.emptyDesc")} />
      ) : (
        <AcupointViewToggle
          points={allPointsForMap.map((p) => ({
            id: p.id,
            code: p.code,
            pinyinName: p.pinyinName,
            chineseName: toTraditionalChinese(p.chineseName, locale),
            meridian: p.meridian,
          }))}
          locale={locale}
          labels={{
            listView: t(messages, "acupuncture.viewList"),
            bodyView: t(messages, "acupuncture.viewBody"),
            front: t(messages, "acupuncture.mapFront"),
            back: t(messages, "acupuncture.mapBack"),
            allMeridians: t(messages, "acupuncture.mapAllMeridians"),
            clickHint: t(messages, "acupuncture.mapClickHint"),
            noMapping: t(messages, "acupuncture.mapNoMapping"),
          }}
          listSlot={
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {acupoints.map((point) => {
                  const chineseTc = toTraditionalChinese(point.chineseName, locale);
                  const primary = locale === "zh-Hant" ? chineseTc : point.pinyinName;
                  const secondary = locale === "zh-Hant" ? point.pinyinName : point.chineseName;
                  return (
                    <AcupointCard
                      key={point.id}
                      id={point.id}
                      code={point.code}
                      primaryName={primary}
                      secondaryLine={secondary}
                      englishLine={point.englishName}
                      meridianKey={point.meridian}
                      highestGrade={getHighestGrade(point.evidenceLinks)}
                      locale={locale}
                    />
                  );
                })}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} />
            </>
          }
        />
      )}
    </div>
  );
}
