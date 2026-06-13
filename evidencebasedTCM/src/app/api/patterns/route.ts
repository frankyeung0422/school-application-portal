import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { PathologyType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const pathology = searchParams.get("pathology") || "";

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
      skip: (page - 1) * limit,
      take: limit,
      include: {
        patternFormulas: { select: { id: true } },
        patternAcupoints: { select: { id: true } },
      },
    }),
    prisma.tcmPattern.count({ where }),
  ]);

  return NextResponse.json({
    data: patterns,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
