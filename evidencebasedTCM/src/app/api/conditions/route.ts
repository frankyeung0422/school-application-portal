import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiError, clampPagination } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { skip, take, page, limit } = clampPagination(
      parseInt(searchParams.get("page") || "1"),
      parseInt(searchParams.get("limit") || "20"),
    );
    const search = searchParams.get("search") || "";

    const where = {
      ...(search && {
        OR: [
          { westernName: { contains: search, mode: "insensitive" as const } },
          { icd10Code: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [conditions, total] = await Promise.all([
      prisma.conditionMapping.findMany({
        where,
        orderBy: { westernName: "asc" },
        skip,
        take,
        include: {
          patternMappings: {
            include: {
              pattern: { select: { pinyinName: true, chineseName: true, pathologyType: true } },
            },
          },
        },
      }),
      prisma.conditionMapping.count({ where }),
    ]);

    return apiOk({
      data: conditions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[conditions] GET error", err);
    return apiError("internal", 500);
  }
}
