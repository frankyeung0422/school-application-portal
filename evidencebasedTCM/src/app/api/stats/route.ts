import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// In-process 5-minute cache — eliminates repeated heavy groupBy queries
let cache: { data: unknown; expiresAt: number } | null = null;
let inflightFetch: Promise<unknown> | null = null;

async function fetchStats() {
  const [
    totalEvidence,
    gradeDistribution,
    studyTypeDistribution,
    herbsWithEvidence,
    formulasWithEvidence,
    acupointsWithEvidence,
    patternsWithEvidence,
    recentEvidence,
  ] = await Promise.all([
    prisma.evidenceEntry.count({ where: { status: "PUBLISHED" } }),
    prisma.evidenceEntry.groupBy({
      by: ["evidenceGrade"],
      _count: true,
      where: { status: "PUBLISHED" },
    }),
    prisma.evidenceEntry.groupBy({
      by: ["studyType"],
      _count: true,
      where: { status: "PUBLISHED" },
    }),
    prisma.evidenceHerbLink.groupBy({ by: ["herbId"], _count: true, where: { evidence: { status: "PUBLISHED" } } }),
    prisma.evidenceFormulaLink.groupBy({ by: ["formulaId"], _count: true, where: { evidence: { status: "PUBLISHED" } } }),
    prisma.evidenceAcupointLink.groupBy({ by: ["acupointId"], _count: true, where: { evidence: { status: "PUBLISHED" } } }),
    prisma.evidencePatternLink.groupBy({ by: ["patternId"], _count: true, where: { evidence: { status: "PUBLISHED" } } }),
    prisma.evidenceEntry.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        evidenceGrade: true,
        studyType: true,
        year: true,
        journal: true,
      },
    }),
  ]);

  const gradeMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const g of gradeDistribution) gradeMap[g.evidenceGrade] = g._count;

  const studyTypeMap: Record<string, number> = {};
  for (const s of studyTypeDistribution) studyTypeMap[s.studyType] = s._count;

  const gradeOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

  const topHerbIds = herbsWithEvidence
    .sort((a, b) => b._count - a._count)
    .slice(0, 10)
    .map((h) => h.herbId);

  const topHerbsRaw = topHerbIds.length > 0
    ? await prisma.herb.findMany({
        where: { id: { in: topHerbIds } },
        select: {
          id: true,
          pinyinName: true,
          chineseName: true,
          evidenceLinks: {
            include: { evidence: { select: { evidenceGrade: true } } },
          },
        },
      })
    : [];

  const topEvidenceHerbs = topHerbsRaw
    .map((h) => {
      const grades = h.evidenceLinks.map((l) => l.evidence.evidenceGrade);
      const bestGrade = grades.sort((a, b) => gradeOrder[a] - gradeOrder[b])[0] || "D";
      return { id: h.id, name: h.pinyinName, chineseName: h.chineseName, count: h.evidenceLinks.length, bestGrade };
    })
    .sort((a, b) => b.count - a.count);

  const topAcupointIds = acupointsWithEvidence
    .sort((a, b) => b._count - a._count)
    .slice(0, 10)
    .map((a) => a.acupointId);

  const topAcupointsRaw = topAcupointIds.length > 0
    ? await prisma.acupuncturePoint.findMany({
        where: { id: { in: topAcupointIds } },
        select: {
          id: true,
          code: true,
          pinyinName: true,
          chineseName: true,
          evidenceLinks: {
            include: { evidence: { select: { evidenceGrade: true } } },
          },
        },
      })
    : [];

  const topEvidenceAcupoints = topAcupointsRaw
    .map((a) => {
      const grades = a.evidenceLinks.map((l) => l.evidence.evidenceGrade);
      const bestGrade = grades.sort((x, y) => gradeOrder[x] - gradeOrder[y])[0] || "D";
      return { id: a.id, code: a.code, name: a.pinyinName, chineseName: a.chineseName, count: a.evidenceLinks.length, bestGrade };
    })
    .sort((a, b) => b.count - a.count);

  return {
    totalEvidence,
    gradeDistribution: gradeMap,
    studyTypeDistribution: studyTypeMap,
    entityCoverage: {
      herbsWithEvidence: herbsWithEvidence.length,
      formulasWithEvidence: formulasWithEvidence.length,
      acupointsWithEvidence: acupointsWithEvidence.length,
      patternsWithEvidence: patternsWithEvidence.length,
    },
    topEvidenceHerbs,
    topEvidenceAcupoints,
    recentEvidence,
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (!cache || now >= cache.expiresAt) {
      if (!inflightFetch) {
        inflightFetch = fetchStats().then((data) => {
          cache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
          inflightFetch = null;
          return data;
        }).catch((err) => {
          inflightFetch = null;
          throw err;
        });
      }
      await inflightFetch;
    }
    return NextResponse.json(cache!.data);
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Unable to fetch statistics" }, { status: 500 });
  }
}
