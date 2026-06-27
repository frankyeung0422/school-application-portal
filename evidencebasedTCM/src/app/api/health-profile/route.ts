import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function getAuthUserId() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return null;
  return user.id;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let profile = await prisma.userHealthProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userHealthProfile.create({ data: { userId } });
  }
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { dateOfBirth, gender, chronicConditions, knownAllergies, researchConsent } = body;

  const existing = await prisma.userHealthProfile.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json({ error: "Profile already exists, use PATCH" }, { status: 409 });
  }

  const dob = dateOfBirth ? new Date(dateOfBirth) : null;
  if (dob && Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: "Invalid dateOfBirth" }, { status: 400 });
  }

  const profile = await prisma.userHealthProfile.create({
    data: {
      userId,
      dateOfBirth: dob,
      gender: gender || null,
      chronicConditions: chronicConditions ?? [],
      knownAllergies: knownAllergies ?? [],
      researchConsent: researchConsent ?? false,
      consentedAt: researchConsent ? new Date() : null,
      consentVersion: researchConsent ? "v1.0" : null,
    },
  });
  return NextResponse.json(profile, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { dateOfBirth, gender, chronicConditions, knownAllergies, researchConsent } = body;

  const current = await prisma.userHealthProfile.findUnique({ where: { userId } });

  const consentChanged = researchConsent !== undefined && researchConsent !== current?.researchConsent;

  const patchDob = dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined;
  if (patchDob instanceof Date && Number.isNaN(patchDob.getTime())) {
    return NextResponse.json({ error: "Invalid dateOfBirth" }, { status: 400 });
  }

  const profile = await prisma.userHealthProfile.upsert({
    where: { userId },
    create: {
      userId,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender ?? null,
      chronicConditions: chronicConditions ?? [],
      knownAllergies: knownAllergies ?? [],
      researchConsent: researchConsent ?? false,
      consentedAt: researchConsent ? new Date() : null,
      consentVersion: researchConsent ? "v1.0" : null,
    },
    update: {
      ...(patchDob !== undefined && { dateOfBirth: patchDob }),
      ...(gender !== undefined && { gender }),
      ...(chronicConditions !== undefined && { chronicConditions }),
      ...(knownAllergies !== undefined && { knownAllergies }),
      ...(researchConsent !== undefined && {
        researchConsent,
        consentedAt: consentChanged && researchConsent ? new Date() : undefined,
        consentVersion: consentChanged && researchConsent ? "v1.0" : undefined,
      }),
    },
  });
  return NextResponse.json(profile);
}
