import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { PathologyType } from "@/generated/prisma/client";
import { apiOk, apiError, clampPagination } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { skip, take, page, limit } = clampPagination(
      parseInt(searchParams.get("page") || "1"),
      parseInt(searchParams.get("limit") || "20"),
    );
    const search = searchParams.get("search") || "";
    const pathology = searchParams.get("pathology") || "";

    const VALID_PATHOLOGIES = [
      "DEFICIENCY", "EXCESS", "STAGNATION", "HEAT", "COLD", "DAMPNESS",
      "PHLEGM", "WIND", "BLOOD_STASIS", "YIN_DEFICIENCY", "YANG_DEFICIENCY",
      "QI_DEFICIENCY", "BLOOD_DEFICIENCY",
    ] as const;
    if (pathology && !VALID_PATHOLOGIES.includes(pathology as typeof VALID_PATHOLOGIES[number])) {
      return apiError("Invalid pathology value", 400);
    }

    const where = {
      status: "PUBLISHED" as const,
      ...(search && {
        OR: [
          { pinyinName: { contains: search, mode: "insensitive" as const } },
          { chineseName: { contains: search } },
          { englishName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(pathology && { pathologyType: pathology as PathologyType }),
    };

    const [patterns, total] = await Promise.all([
      prisma.tcmPattern.findMany({
        where,
        orderBy: { pinyinName: "asc" },
        skip,
        take,
        include: {
          patternFormulas: { select: { id: true } },
          patternAcupoints: { select: { id: true } },
        },
      }),
      prisma.tcmPattern.count({ where }),
    ]);

    return apiOk({
      data: patterns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[patterns] GET error", err);
    return apiError("internal", 500);
  }
}
