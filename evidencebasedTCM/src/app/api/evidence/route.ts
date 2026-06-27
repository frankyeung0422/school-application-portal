import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { EvidenceGrade, StudyType } from "@/generated/prisma/client";
import { apiOk, apiError, clampPagination } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { skip, take, page, limit } = clampPagination(
      parseInt(searchParams.get("page") || "1"),
      parseInt(searchParams.get("limit") || "20"),
    );
    const search = searchParams.get("search") || "";
    const grade = searchParams.get("grade") || "";
    const studyType = searchParams.get("studyType") || "";

    const VALID_GRADES = ["A", "B", "C", "D"] as const;
    if (grade && !VALID_GRADES.includes(grade as typeof VALID_GRADES[number])) {
      return apiError("Invalid grade value", 400);
    }
    const VALID_STUDY_TYPES = [
      "SYSTEMATIC_REVIEW", "META_ANALYSIS", "RCT", "COHORT_STUDY",
      "CASE_CONTROL", "CASE_SERIES", "EXPERT_OPINION", "ANIMAL_STUDY",
      "IN_VITRO", "NETWORK_META_ANALYSIS",
    ] as const;
    if (studyType && !VALID_STUDY_TYPES.includes(studyType as typeof VALID_STUDY_TYPES[number])) {
      return apiError("Invalid studyType value", 400);
    }

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
        orderBy: [{ evidenceGrade: "asc" }, { year: { sort: "desc", nulls: "last" } }],
        skip,
        take,
        include: {
          herbLinks: { select: { herb: { select: { pinyinName: true } } } },
          formulaLinks: { select: { formula: { select: { pinyinName: true } } } },
        },
      }),
      prisma.evidenceEntry.count({ where }),
    ]);

    return apiOk({
      data: entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[evidence] GET error", err);
    return apiError("internal", 500);
  }
}
