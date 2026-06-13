export const dynamic = "force-dynamic";

import Link from "next/link";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { studyTypeLabel } from "@/lib/i18n/data-labels";

const featureDefs = [
  {
    href: "/herbs",
    titleKey: "home.features.herbal.title",
    descKey: "home.features.herbal.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    href: "/formulas",
    titleKey: "home.features.formulas.title",
    descKey: "home.features.formulas.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    href: "/acupuncture",
    titleKey: "home.features.acupuncture.title",
    descKey: "home.features.acupuncture.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    href: "/patterns",
    titleKey: "home.features.patterns.title",
    descKey: "home.features.patterns.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/evidence",
    titleKey: "home.features.evidence.title",
    descKey: "home.features.evidence.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    href: "/interactions",
    titleKey: "home.features.interactions.title",
    descKey: "home.features.interactions.desc",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
];

async function getLiveStats() {
  try {
    const [herbs, formulas, acupoints, evidence, targets, trials, researchers] = await Promise.all([
      prisma.herb.count({ where: { status: "PUBLISHED" } }),
      prisma.formula.count({ where: { status: "PUBLISHED" } }),
      prisma.acupuncturePoint.count({ where: { status: "PUBLISHED" } }),
      prisma.evidenceEntry.count({ where: { status: "PUBLISHED" } }),
      prisma.proteinTarget.count(),
      prisma.clinicalTrial.count(),
      prisma.researcherProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    ]);
    return [
      { value: herbs || "500+", labelKey: "home.statsHerbs" as const },
      { value: formulas || "50+", labelKey: "home.statsFormulas" as const },
      { value: acupoints || "50+", labelKey: "home.statsAcu" as const },
      { value: evidence || "300+", labelKey: "home.statsEvidence" as const },
      { value: targets || "200+", labelKey: "home.statsTargets" as const },
      { value: trials || "100+", labelKey: "home.statsTrials" as const },
      { value: researchers || "0", labelKey: "home.statsResearchers" as const },
    ];
  } catch {
    return [
      { value: "500+", labelKey: "home.statsHerbs" as const },
      { value: "50+", labelKey: "home.statsFormulas" as const },
      { value: "50+", labelKey: "home.statsAcu" as const },
      { value: "300+", labelKey: "home.statsEvidence" as const },
      { value: "200+", labelKey: "home.statsTargets" as const },
      { value: "100+", labelKey: "home.statsTrials" as const },
      { value: "0", labelKey: "home.statsResearchers" as const },
    ];
  }
}

async function getGradeDistribution() {
  try {
    return await prisma.evidenceEntry.groupBy({
      by: ["evidenceGrade"],
      _count: true,
      where: { status: "PUBLISHED" },
    });
  } catch {
    return [];
  }
}

async function getStudyTypeDistribution() {
  try {
    return await prisma.evidenceEntry.groupBy({
      by: ["studyType"],
      _count: true,
      where: { status: "PUBLISHED" },
    });
  } catch {
    return [];
  }
}

const GRADE_BAR_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-orange-500",
  D: "bg-red-500",
};

const STUDY_TYPE_COLORS: Record<string, string> = {
  SYSTEMATIC_REVIEW: "bg-emerald-500",
  META_ANALYSIS: "bg-teal-500",
  RCT: "bg-blue-500",
  COHORT: "bg-indigo-500",
  CASE_CONTROL: "bg-purple-500",
  CASE_SERIES: "bg-pink-500",
  CASE_REPORT: "bg-rose-500",
  EXPERT_OPINION: "bg-amber-500",
  TRADITIONAL_USE: "bg-orange-500",
};

const EXPLAINER_STYLE: Record<string, { color: string; dot: string }> = {
  A: { color: "border-green-300 bg-green-50", dot: "bg-green-500" },
  B: { color: "border-blue-300 bg-blue-50", dot: "bg-blue-500" },
  C: { color: "border-orange-300 bg-orange-50", dot: "bg-orange-500" },
  D: { color: "border-red-300 bg-red-50", dot: "bg-red-500" },
};

export default async function HomePage() {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const [stats, gradeDistribution, studyTypeDistribution, trialsByDisease] = await Promise.all([
    getLiveStats(),
    getGradeDistribution(),
    getStudyTypeDistribution(),
    prisma.clinicalTrial.groupBy({ by: ["diseaseId"], _count: true }).catch(() => [] as { diseaseId: string; _count: number }[]),
  ]);

  const totalEvidence = gradeDistribution.reduce((sum, g) => sum + g._count, 0);
  const totalStudies = studyTypeDistribution.reduce((sum, s) => sum + s._count, 0);
  const trialCountById = new Map(trialsByDisease.map(r => [r.diseaseId, r._count]));

  return (
    <div>
      <section className="bg-gradient-to-br from-primary-dark via-primary to-primary-light py-20 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            {t(messages, "home.heroTitle1")}
            <br />
            {t(messages, "home.heroTitle2")}
          </h1>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            {t(messages, "home.heroLead")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/practitioner"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-primary shadow-lg hover:bg-blue-50 transition-colors"
            >
              🩺 {locale === "zh-Hant" ? "進入醫師工作台" : "Enter Practitioner Hub"}
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg bg-amber-400 px-6 py-3 font-semibold text-amber-900 shadow-lg hover:bg-amber-300 transition-colors"
            >
              {locale === "zh-Hant" ? "查看訂閱方案" : "View Pricing"}
            </Link>
            <Link
              href="/herbs"
              className="rounded-lg border-2 border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {t(messages, "home.exploreDb")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-100">
            {locale === "zh-Hant"
              ? "✨ 14 天免費試用 · 無需信用卡 · 隨時取消"
              : "✨ 14-day free trial · No credit card required · Cancel anytime"}
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface py-8 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.labelKey}>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-xs text-muted">{t(messages, stat.labelKey)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-12">
            {t(messages, "home.featuresHeading")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureDefs.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="group rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md hover:border-primary-light transition-all"
              >
                <div className="text-primary group-hover:text-primary-light transition-colors">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t(messages, feature.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {t(messages, feature.descKey)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Disease research modules */}
      <section className="border-t border-border py-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-2">{t(messages, "home.diseaseResearchHeading")}</h2>
          <p className="text-center text-muted mb-10 max-w-2xl mx-auto">{t(messages, "home.diseaseResearchLead")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {DISEASE_CATALOG.map(d => {
              const trials = trialCountById.get(d.id) ?? 0;
              const isZh = locale === "zh-Hant";
              return (
                <Link key={d.id} href={`/research/${d.id}`}
                  className="rounded-xl border border-border bg-surface p-4 hover:shadow-md hover:border-primary transition-all group">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                    {isZh ? d.nameZh : d.nameEn}
                  </p>
                  {!isZh && <p className="text-xs text-muted mt-0.5">{d.nameZh}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {trials > 0 && (
                      <span className="text-[11px] text-muted">🧪 {trials} {isZh ? "試驗" : "trials"}</span>
                    )}
                    <span className="text-[11px] text-muted">🔬 {isZh ? "網絡藥理" : "Network pharm."}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link href="/research/dashboard"
              className="text-sm text-primary hover:underline font-medium">
              {locale === "zh-Hant" ? "查看完整研究儀表板 →" : "Open full research dashboard →"}
            </Link>
          </div>
        </div>
      </section>

      {totalEvidence > 0 && (
        <section className="bg-surface border-t border-border py-16 px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-center mb-2">{t(messages, "home.evidenceOverview")}</h2>
            <p className="text-center text-muted mb-10">{t(messages, "home.evidenceOverviewLead")}</p>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-xl border border-border bg-background p-6">
                <h3 className="text-lg font-semibold mb-4">{t(messages, "home.gradeChartTitle")}</h3>
                <div className="space-y-3">
                  {["A", "B", "C", "D"].map((grade) => {
                    const entry = gradeDistribution.find((g) => g.evidenceGrade === grade);
                    const count = entry?._count || 0;
                    const pct = totalEvidence > 0 ? (count / totalEvidence) * 100 : 0;
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span
                          className={`h-8 w-8 rounded-lg ${GRADE_BAR_COLORS[grade]} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                        >
                          {grade}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{tf(messages, "home.gradeLine", { grade })}</span>
                            <span className="text-muted">
                              {count} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-gray-100">
                            <div
                              className={`h-3 rounded-full ${GRADE_BAR_COLORS[grade]} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-4 text-center">
                  {tf(messages, "home.totalEvidenceFooter", { count: totalEvidence })}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-6">
                <h3 className="text-lg font-semibold mb-4">{t(messages, "home.studyTypeChartTitle")}</h3>
                <div className="space-y-2">
                  {studyTypeDistribution
                    .sort((a, b) => b._count - a._count)
                    .map((entry) => {
                      const pct = totalStudies > 0 ? (entry._count / totalStudies) * 100 : 0;
                      return (
                        <div key={entry.studyType} className="flex items-center gap-2">
                          <span className="text-xs text-right w-28 shrink-0 text-muted">
                            {studyTypeLabel(locale, entry.studyType)}
                          </span>
                          <div className="flex-1 h-2.5 rounded-full bg-gray-100">
                            <div
                              className={`h-2.5 rounded-full ${STUDY_TYPE_COLORS[entry.studyType] || "bg-gray-400"} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted w-6 text-right">{entry._count}</span>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-muted mt-4 text-center">
                  {tf(messages, "home.totalStudiesFooter", { count: totalStudies })}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-surface border-t border-border py-16 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8">{t(messages, "home.gradingHeading")}</h2>
          <p className="text-center text-muted mb-8">{t(messages, "home.gradingLead")}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["A", "B", "C", "D"] as const).map((grade) => {
              const style = EXPLAINER_STYLE[grade];
              const label = t(messages, `home.explainerGrades.${grade}.label`);
              const desc = t(messages, `home.explainerGrades.${grade}.desc`);
              return (
                <div key={grade} className={`rounded-lg border-2 ${style.color} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-3 w-3 rounded-full ${style.dot}`} />
                    <span className="font-bold text-lg">{tf(messages, "home.gradeLine", { grade })}</span>
                    <span className="text-sm text-muted">({label})</span>
                  </div>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
