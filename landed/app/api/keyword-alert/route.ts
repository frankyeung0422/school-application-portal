import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/auth";
import { jsonError, readBody } from "@/lib/http";
import { cleanKeyword } from "@/lib/keyword-alerts";
import { addKeywordAlert } from "@/lib/keyword-alert-service";
import { prisma } from "@/lib/prisma";

// "Tell me about deals on 『keyword』". Signed-in shoppers can also list and remove theirs.
export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const me = await currentCustomer();
    const keyword = cleanKeyword(body.keyword);
    if (!keyword) return NextResponse.json({ error: "關鍵字要 2–60 個字 Keyword must be 2–60 characters" }, { status: 400 });
    const max = body.max ? Math.round(Number(body.max) * 100) : null;
    if (max !== null && !(max > 0)) return NextResponse.json({ error: "目標價要大過 0" }, { status: 400 });
    const r = await addKeywordAlert({ email: String(body.email || me?.email || ""), keyword, maxHkdCents: max, customerId: me?.id ?? null });
    return NextResponse.json({ ok: true, alertId: r.alert.id, matchingNow: r.matching });
  } catch (e) {
    if (e instanceof Error && /Invalid email/.test(e.message)) return NextResponse.json({ error: e.message }, { status: 400 });
    return jsonError(e);
  }
}

export async function DELETE(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  await prisma.keywordAlert.updateMany({ where: { id: Number(id), email: me.email }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
