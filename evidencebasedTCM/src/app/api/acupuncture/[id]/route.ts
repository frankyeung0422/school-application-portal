import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const acupoint = await prisma.acupuncturePoint.findFirst({
      where: { id, status: "PUBLISHED" },
      include: {
        evidenceLinks: {
          include: { evidence: true },
        },
        patternAcupoints: {
          include: {
            pattern: { select: { id: true, pinyinName: true, chineseName: true } },
          },
        },
      },
    });

    if (!acupoint) {
      return NextResponse.json({ error: "Acupoint not found" }, { status: 404 });
    }

    return NextResponse.json(acupoint);
  } catch (err) {
    console.error("[acupuncture/[id]] GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
