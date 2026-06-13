import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; aid: string }> }) {
  const session = await auth();
  if (!(session?.user as { id?: string } | undefined)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { aid } = await params;
  const updated = await prisma.evidenceAnnotation.update({
    where: { id: aid },
    data: { upvotes: { increment: 1 } },
  });
  return NextResponse.json({ upvotes: updated.upvotes });
}
