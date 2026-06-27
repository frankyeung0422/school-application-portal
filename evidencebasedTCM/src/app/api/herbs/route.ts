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
    const nature = searchParams.get("nature") || "";

    const VALID_NATURES = ["WARM", "HOT", "COOL", "COLD", "NEUTRAL"] as const;
    if (nature && !VALID_NATURES.includes(nature as typeof VALID_NATURES[number])) {
      return apiError("Invalid nature value", 400);
    }

    const where = {
      status: "PUBLISHED" as const,
      ...(search && {
        OR: [
          { pinyinName: { contains: search, mode: "insensitive" as const } },
          { chineseName: { contains: search } },
          { englishName: { contains: search, mode: "insensitive" as const } },
          { latinName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(category && { category }),
      ...(nature && { nature: nature as "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL" }),
    };

    const [herbs, total] = await Promise.all([
      prisma.herb.findMany({
        where,
        orderBy: { pinyinName: "asc" },
        skip,
        take,
        include: {
          evidenceLinks: {
            include: { evidence: { select: { evidenceGrade: true } } },
          },
        },
      }),
      prisma.herb.count({ where }),
    ]);

    return apiOk({
      data: herbs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[herbs] GET error", err);
    return apiError("internal", 500);
  }
}
