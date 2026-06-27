import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/tier";

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

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rows = await prisma.caseNote.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ cases: rows.map(toClient) });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body → blank note */ }

  const note = await prisma.caseNote.create({
    data: {
      userId,
      patientInitials: typeof body.patientInitials === "string" ? body.patientInitials : "",
      chiefComplaint:  typeof body.chiefComplaint  === "string" ? body.chiefComplaint  : "",
      diagnosis:       typeof body.diagnosis       === "string" ? body.diagnosis       : "",
      patternIds:  JSON.stringify(Array.isArray(body.patternIds)  ? body.patternIds  : []),
      formulaIds:  JSON.stringify(Array.isArray(body.formulaIds)  ? body.formulaIds  : []),
      acupointIds: JSON.stringify(Array.isArray(body.acupointIds) ? body.acupointIds : []),
      herbIds:     JSON.stringify(Array.isArray(body.herbIds)     ? body.herbIds     : []),
      notes: typeof body.notes === "string" ? body.notes : "",
    },
  });

  return NextResponse.json(toClient(note), { status: 201 });
}
