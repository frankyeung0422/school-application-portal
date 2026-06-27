import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { studyTypeLabel } from "@/lib/i18n/data-labels";
import { AdminStatsPanel } from "@/components/admin/AdminStatsPanel";

async function getStats() {
  const [herbs, formulas, acupoints, patterns, evidence, conditions, users, bookmarks] = await Promise.all([
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(),
    prisma.evidenceEntry.count(),
    prisma.conditionMapping.count(),
    prisma.user.count(),
    prisma.bookmark.count(),
  ]);

  return { herbs, formulas, acupoints, patterns, evidence, conditions, users, bookmarks };
}

async function getRecentEvidence() {
  return prisma.evidenceEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, evidenceGrade: true, studyType: true, createdAt: true },
  });
}

async function getGradeDistribution() {
  return prisma.evidenceEntry.groupBy({
    by: ["evidenceGrade"],
    _count: true,
  });
}

const STAT_CARDS: { key: keyof Awaited<ReturnType<typeof getStats>>; labelKey: string; href: string; color: string }[] = [
  { key: "herbs", labelKey: "admin.statHerbs", href: "/admin/herbs", color: "bg-emerald-500" },
  { key: "formulas", labelKey: "admin.statFormulas", href: "/admin/formulas", color: "bg-blue-500" },
  { key: "acupoints", labelKey: "admin.statAcupoints", href: "/admin/acupuncture", color: "bg-purple-500" },
  { key: "patterns", labelKey: "admin.statPatterns", href: "/admin/patterns", color: "bg-amber-500" },
  { key: "evidence", labelKey: "admin.statEvidence", href: "/admin/evidence", color: "bg-rose-500" },
  { key: "conditions", labelKey: "admin.statConditions", href: "/admin/conditions", color: "bg-teal-500" },
  { key: "users", labelKey: "admin.statUsers", href: "/admin/users", color: "bg-indigo-500" },
  { key: "bookmarks", labelKey: "admin.statBookmarks", href: "#", color: "bg-gray-500" },
];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-rose-500",
};

export default async function AdminDashboardPage() {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const [stats, recentEvidence, gradeDistribution] = await Promise.all([
    getStats(),
    getRecentEvidence(),
    getGradeDistribution(),
  ]);

  const totalEvidence = gradeDistribution.reduce((sum, g) => sum + g._count, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">{t(messages, "admin.dashboardHeading")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg ${card.color} flex items-center justify-center text-white font-bold text-lg`}
              >
                {stats[card.key]}
              </div>
              <div>
                <p className="text-sm font-medium text-muted">{t(messages, card.labelKey)}</p>
                <p className="text-xl font-bold text-foreground">{stats[card.key]}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t(messages, "admin.gradeDistTitle")}</h2>
          {totalEvidence === 0 ? (
            <p className="text-sm text-muted">{t(messages, "admin.noEvidenceSeed")}</p>
          ) : (
            <div className="space-y-3">
              {["A", "B", "C", "D"].map((grade) => {
                const entry = gradeDistribution.find((g) => g.evidenceGrade === grade);
                const count = entry?._count || 0;
                const pct = totalEvidence > 0 ? (count / totalEvidence) * 100 : 0;
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <span
                      className={`h-8 w-8 rounded-lg ${GRADE_COLORS[grade]} flex items-center justify-center text-white font-bold text-sm`}
                    >
                      {grade}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{tf(messages, "admin.gradeRow", { grade })}</span>
                        <span className="text-muted">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${GRADE_COLORS[grade]} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t(messages, "admin.recentEvidenceTitle")}</h2>
          {recentEvidence.length === 0 ? (
            <p className="text-sm text-muted">{t(messages, "admin.noEvidenceYet")}</p>
          ) : (
            <div className="space-y-3">
              {recentEvidence.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/evidence/${entry.id}`}
                  className="block rounded-lg border border-border p-3 hover:bg-background transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 h-6 w-6 rounded ${GRADE_COLORS[entry.evidenceGrade]} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                    >
                      {entry.evidenceGrade}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.title}</p>
                      <p className="text-xs text-muted">{studyTypeLabel(locale, entry.studyType)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Evidence Contributions</p>
            <p className="text-xs text-amber-700 mt-0.5">Review researcher-submitted evidence entries pending approval.</p>
          </div>
          <Link href="/admin/contributions" className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors">
            Review →
          </Link>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-800">Researcher Verification</p>
            <p className="text-xs text-blue-700 mt-0.5">Verify or reject researcher profile applications.</p>
          </div>
          <Link href="/admin/researchers" className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Review →
          </Link>
        </div>
      </div>

      <AdminStatsPanel totals={{ herbs: stats.herbs, formulas: stats.formulas, acupoints: stats.acupoints, patterns: stats.patterns }} />
    </div>
  );
}
