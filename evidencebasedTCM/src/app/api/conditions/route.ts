import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
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
      skip: (page - 1) * limit,
      take: limit,
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

  return NextResponse.json({
    data: conditions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
