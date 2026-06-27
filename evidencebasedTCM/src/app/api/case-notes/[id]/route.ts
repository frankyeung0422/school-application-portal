import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/tier";

type Params = { params: Promise<{ id: string }> };

function parseArr(s: string): string[] {
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

function toClient(n: {
  id: string; createdAt: Date; updatedAt: Date;
  patientInitials: string; chiefComplaint: string; diagnosis: string;
  patternIds: string; formulaIds: string; acupointIds: string; herbIds: string; notes: string;
}) {
  return {
    id: n.id,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    patientInitials: n.patientInitials,
    chiefComplaint: n.chiefComplaint,
    diagnosis: n.diagnosis,
    patternIds: parseArr(n.patternIds),
    formulaIds: parseArr(n.formulaIds),
    acupointIds: parseArr(n.acupointIds),
    herbIds: parseArr(n.herbIds),
    notes: n.notes,
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.caseNote.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.userId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  if (typeof body.patientInitials === "string") data.patientInitials = body.patientInitials;
  if (typeof body.chiefComplaint  === "string") data.chiefComplaint  = body.chiefComplaint;
  if (typeof body.diagnosis       === "string") data.diagnosis       = body.diagnosis;
  if (typeof body.notes           === "string") data.notes           = body.notes;
  if (Array.isArray(body.patternIds))  data.patternIds  = JSON.stringify(body.patternIds);
  if (Array.isArray(body.formulaIds))  data.formulaIds  = JSON.stringify(body.formulaIds);
  if (Array.isArray(body.acupointIds)) data.acupointIds = JSON.stringify(body.acupointIds);
  if (Array.isArray(body.herbIds))     data.herbIds     = JSON.stringify(body.herbIds);

  const updated = await prisma.caseNote.update({ where: { id }, data });
  return NextResponse.json(toClient(updated));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.caseNote.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.userId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.caseNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
