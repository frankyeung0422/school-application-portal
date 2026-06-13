import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

const VALID_ENTITY_TYPES = ["HERB", "FORMULA", "ACUPOINT", "PATTERN", "EVIDENCE", "CONDITION"] as const;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (entityType && VALID_ENTITY_TYPES.includes(entityType as (typeof VALID_ENTITY_TYPES)[number])) {
    where.entityType = entityType;
  }
  if (entityId) {
    where.entityId = entityId;
  }

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entityType, entityId, notes } = body;

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  const bookmark = await prisma.bookmark.upsert({
    where: {
      userId_entityType_entityId: {
        userId: session.user.id,
        entityType,
        entityId,
      },
    },
    update: { notes },
    create: {
      userId: session.user.id,
      entityType,
      entityId,
      notes,
    },
  });

  return NextResponse.json({ bookmark }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  await prisma.bookmark.deleteMany({
    where: {
      userId: session.user.id,
      entityType: entityType as (typeof VALID_ENTITY_TYPES)[number],
      entityId,
    },
  });

  return NextResponse.json({ success: true });
}
