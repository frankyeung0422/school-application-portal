import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function getResearcherProfile(userId: string) {
  return prisma.researcherProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rp = await getResearcherProfile(user.id);
  if (!rp) return NextResponse.json([]);

  const contributions = await prisma.evidenceContribution.findMany({
    where: { researcherProfileId: rp.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contributions);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "RESEARCHER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Researcher account required" }, { status: 403 });
  }

  const rp = await getResearcherProfile(user.id);
  if (!rp) return NextResponse.json({ error: "Complete your researcher profile first" }, { status: 400 });

  const body = await request.json();
  const {
    title, authors, journal, year, doi, pmid,
    studyType, pico, results, conclusions, proposedGrade,
    relatedHerbIds, relatedFormulaIds, relatedPatternIds, relatedConditionIds,
  } = body;

  if (!title || !authors || !studyType || !results || !conclusions) {
    return NextResponse.json({ error: "title, authors, studyType, results, conclusions required" }, { status: 400 });
  }

  const VALID_STUDY_TYPES = [
    "SYSTEMATIC_REVIEW", "META_ANALYSIS", "RCT", "COHORT_STUDY",
    "CASE_CONTROL", "CASE_SERIES", "EXPERT_OPINION", "ANIMAL_STUDY",
    "IN_VITRO", "NETWORK_META_ANALYSIS",
  ] as const;
  if (!VALID_STUDY_TYPES.includes(studyType as typeof VALID_STUDY_TYPES[number])) {
    return NextResponse.json({ error: "Invalid studyType" }, { status: 400 });
  }

  const VALID_GRADES = ["A", "B", "C", "D"] as const;
  if (proposedGrade && !VALID_GRADES.includes(proposedGrade as typeof VALID_GRADES[number])) {
    return NextResponse.json({ error: "Invalid proposedGrade. Must be A, B, C, or D" }, { status: 400 });
  }

  const parsedYear = year != null ? parseInt(String(year), 10) : null;
  if (parsedYear !== null && (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > new Date().getFullYear() + 1)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const contribution = await prisma.evidenceContribution.create({
    data: {
      researcherProfileId: rp.id,
      title,
      authors,
      journal: journal || null,
      year: parsedYear,
      doi: doi || null,
      pmid: pmid || null,
      studyType,
      pico: pico ? JSON.stringify(pico) : null,
      results,
      conclusions,
      proposedGrade: proposedGrade || null,
      relatedHerbIds: relatedHerbIds ?? [],
      relatedFormulaIds: relatedFormulaIds ?? [],
      relatedPatternIds: relatedPatternIds ?? [],
      relatedConditionIds: relatedConditionIds ?? [],
    },
  });
  return NextResponse.json(contribution, { status: 201 });
}
