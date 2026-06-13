import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { EvidenceGrade, StudyType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const grade = searchParams.get("grade") || "";
  const studyType = searchParams.get("studyType") || "";

  const where = {
    status: "PUBLISHED" as const,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { authors: { contains: search, mode: "insensitive" as const } },
        { journal: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(grade && { evidenceGrade: grade as EvidenceGrade }),
    ...(studyType && { studyType: studyType as StudyType }),
  };

  const [entries, total] = await Promise.all([
    prisma.evidenceEntry.findMany({
      where,
      orderBy: [{ evidenceGrade: "asc" }, { year: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        herbLinks: { select: { herb: { select: { pinyinName: true } } } },
        formulaLinks: { select: { formula: { select: { pinyinName: true } } } },
      },
    }),
    prisma.evidenceEntry.count({ where }),
  ]);

  return NextResponse.json({
    data: entries,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
