import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "EDITOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  // Explicit allowlist — never pass raw body directly to Prisma
  const {
    chineseName, pinyinName, latinName, englishName, category, nature, flavor,
    meridianTropism, dosageRange, description, contraindications,
    status, toxicityClass, classicalFunctions, classicalIndications,
    processingMethods,
  } = body;

  const herb = await prisma.herb.create({
    data: {
      chineseName,
      pinyinName,
      latinName: latinName ?? null,
      englishName: englishName ?? null,
      category: category ?? null,
      nature: nature ?? null,
      flavor: flavor ?? [],
      meridianTropism: meridianTropism ?? [],
      dosageRange: dosageRange ?? null,
      description: description ?? null,
      contraindications: contraindications ?? null,
      status: status ?? "DRAFT",
      toxicityClass: toxicityClass ?? null,
      classicalFunctions: classicalFunctions ?? null,
      classicalIndications: classicalIndications ?? null,
      processingMethods: processingMethods ?? null,
    },
  });
  return NextResponse.json(herb, { status: 201 });
}
