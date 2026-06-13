import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
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
      skip: (page - 1) * limit,
      take: limit,
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

  return NextResponse.json({
    data: formulas,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
