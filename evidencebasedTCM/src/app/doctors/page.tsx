import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { SPECIALTIES, getSpecialtyByKey } from "@/lib/doctors/specialties";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "名醫推薦 · Famous Doctors Directory | EBTCM",
  description: "依專長分類介紹國醫大師、知名教授與認證執業者，附文獻引用的成功案例。",
};

interface SearchParams {
  searchParams: Promise<{ specialty?: string; tier?: string; q?: string }>;
}

const TIER_LABEL: Record<string, { zh: string; en: string; cls: string }> = {
  MASTER: { zh: "國醫大師", en: "Master", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  EXPERT: { zh: "知名教授", en: "Expert", cls: "bg-purple-100 text-purple-900 border-purple-300" },
  SPECIALIST: { zh: "專科專家", en: "Specialist", cls: "bg-blue-100 text-blue-900 border-blue-300" },
  CERTIFIED: { zh: "認證執業者", en: "Certified", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
};

export default async function DoctorsListPage({ searchParams }: SearchParams) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const sp = await searchParams;

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (sp.specialty) where.primarySpecialty = sp.specialty;
  if (sp.tier) where.tier = sp.tier;
  if (sp.q) {
    where.OR = [
      { chineseName: { contains: sp.q } },
      { englishName: { contains: sp.q, mode: "insensitive" } },
      { affiliation: { contains: sp.q } },
      { bioZh: { contains: sp.q } },
    ];
  }

  const [doctors, totalAll, featuredDoctors] = await Promise.all([
    prisma.famousDoctor.findMany({
      where,
      orderBy: [{ featured: "desc" }, { tier: "asc" }, { chineseName: "asc" }],
      include: {
        _count: { select: { successCases: true } },
      },
    }),
    prisma.famousDoctor.count({ where: { status: "PUBLISHED" } }),
    sp.specialty || sp.tier || sp.q
      ? []
      : prisma.famousDoctor.findMany({
          where: { status: "PUBLISHED", featured: true },
          take: 3,
          orderBy: { tier: "asc" },
        }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          🏛 {T("名醫推薦目錄", "Famous Doctors Directory")}
        </h1>
        <p className="text-lg text-muted leading-relaxed max-w-3xl">
          {T(
            "依專長分類介紹國醫大師、知名教授與認證執業者。每位附文獻引用的成功案例 — 來自公開出版的學術期刊與專業傳記。",
            "Curated directory of TCM masters, expert professors, and certified practitioners by specialty. Each entry includes peer-reviewed published case reports from public literature.",
          )}
        </p>
        <p className="text-xs text-muted mt-3">
          {T(
            "📚 編輯來源：本目錄為公開資料整理（學術期刊、官方傳記、大學官網），非商業推薦。所有醫師資料皆有引用來源。",
            "📚 Editorial: compiled from public sources (peer-reviewed journals, official biographies, university websites). Not a commercial endorsement. Every entry cites its sources.",
          )}
        </p>
      </div>

      {/* Featured row */}
      {featuredDoctors.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm uppercase tracking-widest text-muted mb-3">
            ⭐ {T("精選推薦", "Featured")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredDoctors.map((d) => (
              <Link
                key={d.id}
                href={`/doctors/${d.id}`}
                className="rounded-2xl border-2 border-amber-300/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-900/15 dark:to-orange-900/10 p-5 hover:border-amber-400 transition-colors"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-xl font-bold">{d.chineseName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TIER_LABEL[d.tier].cls}`}>
                    {isZh ? TIER_LABEL[d.tier].zh : TIER_LABEL[d.tier].en}
                  </span>
                </div>
                <p className="text-xs text-muted mb-2">{d.honorificTitle}</p>
                <p className="text-xs text-muted mb-2">{d.affiliation}</p>
                <p className="text-sm line-clamp-3">{d.philosophyZh}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <span>{getSpecialtyByKey(d.primarySpecialty)?.icon}</span>
                  <span>{isZh ? getSpecialtyByKey(d.primarySpecialty)?.zh : getSpecialtyByKey(d.primarySpecialty)?.en}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <form className="mb-6 rounded-lg border border-border bg-surface p-4 grid gap-3 sm:grid-cols-[1fr,auto,auto,auto] items-end">
        <div>
          <label className="block text-xs text-muted mb-1">{T("搜尋", "Search")}</label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={T("姓名 / 機構 / 學說", "Name / institution / philosophy")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{T("專長", "Specialty")}</label>
          <select name="specialty" defaultValue={sp.specialty ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">{T("全部專長", "All specialties")}</option>
            {SPECIALTIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.icon} {isZh ? s.zh : s.en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{T("等級", "Tier")}</label>
          <select name="tier" defaultValue={sp.tier ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">{T("全部", "All")}</option>
            <option value="MASTER">{T("國醫大師", "Master")}</option>
            <option value="EXPERT">{T("知名教授", "Expert")}</option>
            <option value="SPECIALIST">{T("專科專家", "Specialist")}</option>
            <option value="CERTIFIED">{T("認證執業者", "Certified")}</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium">
          {T("篩選", "Filter")}
        </button>
      </form>

      {/* Specialty chip nav */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <Link
          href="/doctors"
          className={`text-xs px-3 py-1 rounded-full border ${
            !sp.specialty
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface hover:border-primary-light"
          }`}
        >
          {T("全部", "All")} <span className="opacity-60">({totalAll})</span>
        </Link>
        {SPECIALTIES.map((s) => (
          <Link
            key={s.key}
            href={`/doctors?specialty=${s.key}`}
            className={`text-xs px-3 py-1 rounded-full border ${
              sp.specialty === s.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface hover:border-primary-light"
            }`}
          >
            {s.icon} {isZh ? s.zh : s.en}
          </Link>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted mb-3">
        {doctors.length} {T("位醫師", "doctors")}
      </p>

      {/* Doctor cards */}
      {doctors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center bg-surface">
          <p className="text-sm text-muted">{T("沒有符合條件的醫師。", "No doctors match.")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {doctors.map((d) => {
            const sp = getSpecialtyByKey(d.primarySpecialty);
            const tier = TIER_LABEL[d.tier];
            return (
              <Link
                key={d.id}
                href={`/doctors/${d.id}`}
                className="rounded-xl border border-border bg-surface p-5 hover:border-primary-light transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-xl font-bold">
                      {d.chineseName}
                      {d.englishName && <span className="text-sm text-muted ml-2 font-normal">{d.englishName}</span>}
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                      {d.honorificTitle}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${tier.cls}`}>
                    {isZh ? tier.zh : tier.en}
                  </span>
                </div>
                <p className="text-xs text-muted mb-3 line-clamp-2">{d.affiliation}</p>
                <p className="text-sm leading-relaxed line-clamp-3 mb-3">{d.philosophyZh}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                    {sp?.icon} {isZh ? sp?.zh : sp?.en}
                  </span>
                  <span className="text-muted">
                    {d._count.successCases} {T("個成功案例", "cases")}
                  </span>
                  {d.yearsOfPractice && (
                    <span className="text-muted">· {T(`${d.yearsOfPractice} 年臨床`, `${d.yearsOfPractice} yrs practice`)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
