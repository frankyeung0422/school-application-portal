import { prisma } from "@/lib/db/prisma";
import { ImprovementDashboard } from "@/components/engine/ImprovementDashboard";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

export default async function ImprovePage() {
  const locale = await getLocale();

  const recentLogs = await prisma.improvementLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const categoryCounts = await prisma.improvementLog.groupBy({
    by: ["category"],
    _count: true,
  });

  const totalRuns = await prisma.improvementLog.count({
    where: { action: "daily_summary" },
  });

  const dbStats = await Promise.all([
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(),
    prisma.evidenceEntry.count(),
    prisma.courseLesson.count(),
    prisma.researchReport.count(),
    prisma.evidenceHerbLink.count(),
    prisma.evidenceFormulaLink.count(),
    prisma.evidenceAcupointLink.count(),
    prisma.evidencePatternLink.count(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ImprovementDashboard
        locale={locale}
        totalRuns={totalRuns}
        dbStats={{
          herbs: dbStats[0],
          formulas: dbStats[1],
          acupoints: dbStats[2],
          patterns: dbStats[3],
          evidence: dbStats[4],
          lessons: dbStats[5],
          reports: dbStats[6],
          links: dbStats[7] + dbStats[8] + dbStats[9] + dbStats[10],
        }}
        categoryCounts={categoryCounts.map((c) => ({ category: c.category, count: c._count }))}
        recentLogs={recentLogs.map((l) => ({
          id: l.id,
          runDate: l.runDate.toISOString(),
          runType: l.runType,
          category: l.category,
          action: l.action,
          details: l.details,
          itemsAffected: l.itemsAffected,
          status: l.status,
          duration: l.duration,
        }))}
      />
    </div>
  );
}
