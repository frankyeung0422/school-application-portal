import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

const ALLOWED_TYPES = ["rwe", "evidence", "network-pharmacology", "condition-outcomes"] as const;
type ExportType = typeof ALLOWED_TYPES[number];

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "RESEARCHER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Researcher account required" }, { status: 403 });
  }

  const { type } = await params;
  if (!ALLOWED_TYPES.includes(type as ExportType)) {
    return NextResponse.json({ error: `Unknown export type. Valid: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  let rows: Record<string, unknown>[] = [];

  if (type === "evidence") {
    const entries = await prisma.evidenceEntry.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true, title: true, studyType: true, evidenceLevel: true, evidenceGrade: true,
        authors: true, journal: true, year: true, doi: true, pubmedId: true,
        sampleSize: true, effectMetric: true, effectValue: true, ciLow: true, ciHigh: true,
        resultsSummary: true,
      },
      orderBy: { createdAt: "desc" },
    });
    rows = entries as unknown as Record<string, unknown>[];
  }

  if (type === "rwe") {
    // Only include consented users' data, aggregated — no row-level patient data
    const consults = await prisma.consultation.findMany({
      where: { symptomScoreBefore: { not: null }, symptomScoreAfter: { not: null } },
      select: {
        visitDate: true,
        symptomScoreBefore: true,
        symptomScoreAfter: true,
        patternId: true,
        pattern: { select: { chineseName: true, pathologyType: true } },
        prescription: { select: { baseFormula: { select: { pinyinName: true } } } },
      },
    });
    rows = consults.map(c => ({
      visitYear: new Date(c.visitDate).getFullYear(),
      visitMonth: new Date(c.visitDate).getMonth() + 1,
      scoreBefore: c.symptomScoreBefore,
      scoreAfter: c.symptomScoreAfter,
      delta: (c.symptomScoreBefore ?? 0) - (c.symptomScoreAfter ?? 0),
      pattern: c.pattern?.chineseName ?? "",
      pathologyType: c.pattern?.pathologyType ?? "",
      formula: c.prescription?.baseFormula?.pinyinName ?? "",
    })) as Record<string, unknown>[];

    // Merge in self-report check-ins from consenting users
    const selfReports = await prisma.healthCheckIn.findMany({
      where: { profile: { researchConsent: true } },
      select: {
        checkInDate: true,
        overallScore: true,
        energyScore: true,
        painScore: true,
        sleepScore: true,
        stressScore: true,
        digestiveScore: true,
        activeConditions: true,
      },
    });
    const selfRows = selfReports.map(r => ({
      source: "self_report",
      visitYear: new Date(r.checkInDate).getFullYear(),
      visitMonth: new Date(r.checkInDate).getMonth() + 1,
      overallScore: r.overallScore,
      energyScore: r.energyScore,
      painScore: r.painScore,
      sleepScore: r.sleepScore,
      stressScore: r.stressScore,
      digestiveScore: r.digestiveScore,
    })) as Record<string, unknown>[];
    rows = [...rows, ...selfRows];
  }

  if (type === "network-pharmacology") {
    const links = await prisma.compoundTarget.findMany({
      select: {
        source: true, confidence: true,
        compound: { select: { compoundName: true, herb: { select: { pinyinName: true, chineseName: true } } } },
        target: { select: { geneSymbol: true, uniprotId: true, bindingdbCount: true, bestAffinityNm: true } },
      },
      take: 5000,
    });
    rows = links.map(l => ({
      herbPinyin: l.compound.herb.pinyinName,
      herbChinese: l.compound.herb.chineseName,
      compound: l.compound.compoundName,
      gene: l.target.geneSymbol,
      uniprotId: l.target.uniprotId,
      source: l.source,
      confidence: l.confidence,
      bindingdbCount: l.target.bindingdbCount,
      bestAffinityNm: l.target.bestAffinityNm,
    })) as Record<string, unknown>[];
  }

  if (type === "condition-outcomes") {
    // Only consented self-report condition data
    const condLogs = await prisma.userConditionLog.findMany({
      where: { profile: { researchConsent: true } },
      select: {
        westernName: true, icd10Code: true, tcmPatternFree: true,
        startDate: true, endDate: true, status: true, severity: true,
      },
    });
    rows = condLogs.map(c => ({
      westernName: c.westernName,
      icd10Code: c.icd10Code,
      tcmPattern: c.tcmPatternFree,
      status: c.status,
      severity: c.severity,
      startYear: c.startDate ? new Date(c.startDate).getFullYear() : null,
      durationDays: c.startDate && c.endDate
        ? Math.round((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / 86400000)
        : null,
    })) as Record<string, unknown>[];
  }

  // Log export
  await prisma.dataExportLog.create({
    data: {
      userId: user.id,
      exportType: type.toUpperCase().replace("-", "_"),
      format: format.toUpperCase(),
      recordCount: rows.length,
    },
  });

  if (format === "csv") {
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ebtcm-${type}-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ type, count: rows.length, data: rows });
}
