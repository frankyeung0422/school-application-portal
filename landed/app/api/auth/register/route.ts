import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { jsonError, readBody } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "電郵格式唔啱 Invalid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "密碼最少 8 個字 Password must be at least 8 characters" }, { status: 400 });
    }
    if (await prisma.customer.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "此電郵已註冊 Email already registered" }, { status: 409 });
    }
    const customer = await prisma.customer.create({
      data: { email, name: (body.name ?? "").trim().slice(0, 80) || null, passwordHash: hashPassword(password) },
    });
    await createSession(customer.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
