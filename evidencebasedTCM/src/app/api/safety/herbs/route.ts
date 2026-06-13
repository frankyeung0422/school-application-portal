/**
 * Public herb autocomplete for the safety/interaction checker.
 * Searches by chineseName, pinyinName, englishName, latinName, category.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length === 0) {
    return NextResponse.json({ ok: true, herbs: [] });
  }
  const herbs = await prisma.herb.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { chineseName: { contains: q } },
        { pinyinName: { contains: q, mode: "insensitive" } },
        { englishName: { contains: q, mode: "insensitive" } },
        { latinName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, chineseName: true, pinyinName: true, englishName: true, category: true },
    orderBy: { pinyinName: "asc" },
    take: 12,
  });
  return NextResponse.json({ ok: true, herbs });
}
