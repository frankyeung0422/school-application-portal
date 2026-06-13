import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function getSession() {
  const session = await auth();
  return session?.user as { id?: string; role?: string } | undefined;
}

export async function GET() {
  const user = await getSession();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.researcherProfile.findUnique({
    where: { userId: user.id },
    include: {
      _count: { select: { contributions: true, annotations: true } },
    },
  });
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { institution, department, orcidId, researchAreas, publicationsJson } = body;

  const existing = await prisma.researcherProfile.findUnique({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: "Profile exists, use PATCH" }, { status: 409 });

  const profile = await prisma.researcherProfile.create({
    data: {
      userId: user.id,
      institution: institution || null,
      department: department || null,
      orcidId: orcidId || null,
      researchAreas: researchAreas ?? [],
      publicationsJson: publicationsJson ? JSON.stringify(publicationsJson) : null,
    },
  });
  return NextResponse.json(profile, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { institution, department, orcidId, researchAreas, publicationsJson } = body;

  const profile = await prisma.researcherProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      institution: institution || null,
      department: department || null,
      orcidId: orcidId || null,
      researchAreas: researchAreas ?? [],
      publicationsJson: publicationsJson ? JSON.stringify(publicationsJson) : null,
    },
    update: {
      ...(institution !== undefined && { institution }),
      ...(department !== undefined && { department }),
      ...(orcidId !== undefined && { orcidId }),
      ...(researchAreas !== undefined && { researchAreas }),
      ...(publicationsJson !== undefined && { publicationsJson: JSON.stringify(publicationsJson) }),
    },
  });
  return NextResponse.json(profile);
}
