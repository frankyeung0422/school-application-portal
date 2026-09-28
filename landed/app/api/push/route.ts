import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { verifyPushToken } from "@/lib/push";

// GET: the public VAPID key. POST: save this browser's push endpoint for an email's alerts. DELETE: forget it.
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  return key ? NextResponse.json({ key }) : NextResponse.json({ error: "push not configured" }, { status: 404 });
}

interface Body {
  subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  email?: unknown;
  token?: unknown;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const me = await currentCustomer();
    const email = (me?.email ?? (typeof body.email === "string" ? body.email : "")).trim().toLowerCase();
    const sub = body.subscription;
    const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
    const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
    const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
      return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "email required" }, { status: 400 });
    // Logged out, the browser must prove it just set an alert for this email;
    // otherwise anyone could receive someone else's alerts by typing their address.
    if (!me && !verifyPushToken(email, typeof body.token === "string" ? body.token : "")) {
      return NextResponse.json({ error: "先設定減價通知 Set an alert first" }, { status: 403 });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, email },
      update: { p256dh, auth, email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
