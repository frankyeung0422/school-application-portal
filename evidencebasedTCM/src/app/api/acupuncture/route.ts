import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiOk, apiError, clampPagination } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { skip, take, page, limit } = clampPagination(
      parseInt(searchParams.get("page") || "1"),
      parseInt(searchParams.get("limit") || "24"),
    );
    const search = searchParams.get("search") || "";
    const meridian = searchParams.get("meridian") || "";

    const where = {
      status: "PUBLISHED" as const,
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" as const } },
          { pinyinName: { contains: search, mode: "insensitive" as const } },
          { chineseName: { contains: search } },
          { englishName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(meridian && { meridian }),
    };

    const [acupoints, total] = await Promise.all([
      prisma.acupuncturePoint.findMany({
        where,
        orderBy: { code: "asc" },
        skip,
        take,
        include: {
          evidenceLinks: {
            include: { evidence: { select: { evidenceGrade: true } } },
          },
        },
      }),
      prisma.acupuncturePoint.count({ where }),
    ]);

    return apiOk({
      data: acupoints,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[acupuncture] GET error", err);
    return apiError("internal", 500);
  }
}
