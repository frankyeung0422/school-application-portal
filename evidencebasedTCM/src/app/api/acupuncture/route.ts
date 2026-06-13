import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "24");
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
      skip: (page - 1) * limit,
      take: limit,
      include: {
        evidenceLinks: {
          include: { evidence: { select: { evidenceGrade: true } } },
        },
      },
    }),
    prisma.acupuncturePoint.count({ where }),
  ]);

  return NextResponse.json({
    data: acupoints,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
