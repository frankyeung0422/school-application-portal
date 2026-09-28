import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError, readBody } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const email = (body.email ?? "").trim().toLowerCase();
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || !verifyPassword(body.password ?? "", customer.passwordHash)) {
      return NextResponse.json({ error: "電郵或密碼錯誤 Wrong email or password" }, { status: 401 });
    }
    await createSession(customer.id);
    return NextResponse.json({ ok: true, isAdmin: customer.isAdmin });
  } catch (e) {
    return jsonError(e);
  }
}
