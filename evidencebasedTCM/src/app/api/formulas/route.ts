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
    const category = searchParams.get("category") || "";

    const where = {
      status: "PUBLISHED" as const,
      ...(search && {
        OR: [
          { pinyinName: { contains: search, mode: "insensitive" as const } },
          { chineseName: { contains: search } },
          { englishName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(category && { category }),
    };

    const [formulas, total] = await Promise.all([
      prisma.formula.findMany({
        where,
        orderBy: { pinyinName: "asc" },
        skip,
        take,
        include: {
          herbs: {
            include: {
              herb: { select: { id: true, pinyinName: true, chineseName: true } },
            },
          },
          evidenceLinks: {
            include: { evidence: { select: { evidenceGrade: true } } },
          },
        },
      }),
      prisma.formula.count({ where }),
    ]);

    return apiOk({
      data: formulas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[formulas] GET error", err);
    return apiError("internal", 500);
  }
}
