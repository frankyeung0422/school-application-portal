import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPractitionerContext } from "@/lib/patients/access";
import { scoreSurvey, type ConstitutionKey } from "@/lib/clinical/constitution-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  answers?: Record<string, number>;
  patientId?: string | null;
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ ok: false, error: "answers_required" }, { status: 400 });
  }
  // Validate Likert values 1..5.
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.answers)) {
    const n = typeof v === "number" ? v : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= 5) clean[k] = Math.round(n);
  }
  const result = scoreSurvey(clean);

  // Optional persistence: only if caller is a practitioner saving to one of their patients.
  let saved = false;
  let savedId: string | null = null;
  if (body.patientId) {
    const ctx = await getPractitionerContext();
    if (ctx) {
      const owned = await prisma.patient.findFirst({
        where: { id: body.patientId, practitionerId: ctx.userId },
        select: { id: true },
      });
      if (owned) {
        const row = await prisma.patientConstitution.create({
          data: {
            patientId: owned.id,
            practitionerId: ctx.userId,
            scorePingHe: result.scores.ping_he,
            scoreQiXu: result.scores.qi_xu,
            scoreYangXu: result.scores.yang_xu,
            scoreYinXu: result.scores.yin_xu,
            scoreTanShi: result.scores.tan_shi,
            scoreShiRe: result.scores.shi_re,
            scoreXueYu: result.scores.xue_yu,
            scoreQiYu: result.scores.qi_yu,
            scoreTeBing: result.scores.te_bing,
            primary: result.primary,
            secondary: result.secondary,
            notes: body.notes ?? null,
          },
        });
        saved = true;
        savedId = row.id;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scores: result.scores,
    primary: result.primary as ConstitutionKey,
    secondary: result.secondary,
    presentTypes: result.presentTypes,
    tendencyTypes: result.tendencyTypes,
    saved,
    savedId,
  });
}
