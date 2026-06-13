import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const herb = await prisma.herb.findUnique({
    where: { id },
    include: {
      activeCompounds: true,
      formulaHerbs: {
        include: {
          formula: { select: { id: true, pinyinName: true, chineseName: true, englishName: true, category: true } },
        },
      },
      evidenceLinks: {
        include: {
          evidence: true,
        },
      },
      drugInteractions: true,
      contraindications: true,
      herbInteractionsA: {
        include: { herbB: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
      herbInteractionsB: {
        include: { herbA: { select: { id: true, pinyinName: true, chineseName: true } } },
      },
    },
  });

  if (!herb) {
    return NextResponse.json({ error: "Herb not found" }, { status: 404 });
  }

  return NextResponse.json(herb);
}
