import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const nature = searchParams.get("nature") || "";

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
      skip: (page - 1) * limit,
      take: limit,
      include: {
        evidenceLinks: {
          include: { evidence: { select: { evidenceGrade: true } } },
        },
      },
    }),
    prisma.herb.count({ where }),
  ]);

  return NextResponse.json({
    data: herbs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
