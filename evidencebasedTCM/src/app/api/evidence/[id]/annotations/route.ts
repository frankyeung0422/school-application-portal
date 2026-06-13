import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const annotations = await prisma.evidenceAnnotation.findMany({
    where: { evidenceId: id, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { institution: true, verificationStatus: true, user: { select: { name: true } } } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { institution: true, verificationStatus: true, user: { select: { name: true } } } },
        },
      },
    },
  });
  return NextResponse.json(annotations);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "RESEARCHER" && user.role !== "ADMIN" && user.role !== "EDITOR") {
    return NextResponse.json({ error: "Researcher account required to annotate" }, { status: 403 });
  }

  const rp = await prisma.researcherProfile.findUnique({ where: { userId: user.id } });
  if (!rp && user.role !== "ADMIN" && user.role !== "EDITOR") {
    return NextResponse.json({ error: "Complete your researcher profile first" }, { status: 400 });
  }

  // Admins/editors can annotate without a researcher profile — create a minimal one on-the-fly
  let researcherProfileId = rp?.id;
  if (!researcherProfileId) {
    const created = await prisma.researcherProfile.create({
      data: { userId: user.id, verificationStatus: "VERIFIED" },
    });
    researcherProfileId = created.id;
  }

  const { id } = await params;
  const body = await request.json();
  const { body: text, annotationType, parentId } = body;
  if (!text?.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });

  const evidence = await prisma.evidenceEntry.findUnique({ where: { id } });
  if (!evidence) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });

  const annotation = await prisma.evidenceAnnotation.create({
    data: {
      evidenceId: id,
      authorId: researcherProfileId,
      body: text,
      annotationType: annotationType ?? "COMMENT",
      parentId: parentId ?? null,
    },
    include: {
      author: { select: { institution: true, verificationStatus: true, user: { select: { name: true } } } },
    },
  });
  return NextResponse.json(annotation, { status: 201 });
}
