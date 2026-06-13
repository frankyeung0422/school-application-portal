import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "EDITOR")) return null;
  return user;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNotes } = body;

  if (!["REVIEWING", "ACCEPTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const contribution = await prisma.evidenceContribution.update({
    where: { id },
    data: {
      status,
      reviewNotes: reviewNotes || null,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
    },
    include: {
      researcher: { select: { user: { select: { name: true } } } },
    },
  });

  // If accepted, promote to a real EvidenceEntry
  if (status === "ACCEPTED") {
    await prisma.evidenceEntry.create({
      data: {
        title: contribution.title,
        studyType: contribution.studyType,
        evidenceLevel: "LEVEL_4", // default — admin should update after review
        evidenceGrade: contribution.proposedGrade ?? "C",
        authors: contribution.authors,
        journal: contribution.journal,
        year: contribution.year,
        doi: contribution.doi,
        pubmedId: contribution.pmid,
        resultsSummary: contribution.results,
        abstract: contribution.conclusions,
        status: "REVIEWED",
      },
    });
  }

  return NextResponse.json(contribution);
}
