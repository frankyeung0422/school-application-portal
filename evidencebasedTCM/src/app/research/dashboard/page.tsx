import { prisma } from "@/lib/db/prisma";
import { ResearchDashboard } from "@/components/research/ResearchDashboard";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const locale = await getLocale();

  const reports = await prisma.researchReport.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const stats = await prisma.evidenceEntry.groupBy({
    by: ["evidenceGrade"],
    _count: true,
  });

  const totalEvidence = await prisma.evidenceEntry.count();
  const totalLinks = await Promise.all([
    prisma.evidenceHerbLink.count(),
    prisma.evidenceFormulaLink.count(),
    prisma.evidenceAcupointLink.count(),
    prisma.evidencePatternLink.count(),
  ]).then((c) => c.reduce((a, b) => a + b, 0));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {locale === "zh-Hant" ? "深度研究引擎控制台" : "Deep Research Engine Dashboard"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {locale === "zh-Hant"
          ? "啟動背景研究引擎，自動分析所有疾病、挖掘跨疾病模式、架構創新處方，並持續改進。"
          : "Launch the background research engine to auto-analyze all diseases, mine cross-disease patterns, architect novel formulas, and continuously improve."}
      </p>

      <ResearchDashboard
        locale={locale}
        dbStats={{
          totalEvidence,
          totalLinks,
          gradeA: stats.find((s) => s.evidenceGrade === "A")?._count ?? 0,
          gradeB: stats.find((s) => s.evidenceGrade === "B")?._count ?? 0,
          gradeC: stats.find((s) => s.evidenceGrade === "C")?._count ?? 0,
          gradeD: stats.find((s) => s.evidenceGrade === "D")?._count ?? 0,
        }}
        reports={reports.map((r) => ({
          id: r.id,
          diseaseId: r.diseaseId,
          diseaseName: r.diseaseName,
          reportType: r.reportType,
          formulaName: r.formulaName,
          score: r.score,
          version: r.version,
          updatedAt: r.updatedAt.toISOString(),
          content: r.content,
        }))}
      />
    </div>
  );
}
