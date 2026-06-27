import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "EDITOR")) {
    return null;
  }
  return session;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const herb = await prisma.herb.findUnique({ where: { id } });
    if (!herb) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(herb);
  } catch (err) {
    console.error("[admin/herb/[id]] GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  // Explicit allowlist — never spread raw body directly into Prisma update
  const {
    chineseName, pinyinName, latinName, englishName, category, nature, flavor,
    meridianTropism, dosageRange, description, cautions, contraindications,
    status, properties, toxicityClass, classicalFunctions, classicalIndications,
    processingMethods,
  } = body;

  try {
    const herb = await prisma.herb.update({
      where: { id },
      data: {
        ...(chineseName !== undefined && { chineseName }),
        ...(pinyinName !== undefined && { pinyinName }),
        ...(latinName !== undefined && { latinName }),
        ...(englishName !== undefined && { englishName }),
        ...(category !== undefined && { category }),
        ...(nature !== undefined && { nature }),
        ...(flavor !== undefined && { flavor }),
        ...(meridianTropism !== undefined && { meridianTropism }),
        ...(dosageRange !== undefined && { dosageRange }),
        ...(description !== undefined && { description }),
        ...(cautions !== undefined && { cautions }),
        ...(contraindications !== undefined && { contraindications }),
        ...(status !== undefined && { status }),
        ...(properties !== undefined && { properties }),
        ...(toxicityClass !== undefined && { toxicityClass }),
        ...(classicalFunctions !== undefined && { classicalFunctions }),
        ...(classicalIndications !== undefined && { classicalIndications }),
        ...(processingMethods !== undefined && { processingMethods }),
      },
    });
    return NextResponse.json(herb);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[admin/herb/[id]] PUT error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.herb.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (err.code === "P2003" || err.code === "P2014") {
        return NextResponse.json({ error: "Cannot delete: herb is referenced by other records" }, { status: 409 });
      }
    }
    console.error("[admin/herb/[id]] DELETE error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
