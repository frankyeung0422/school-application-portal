import { prisma } from "./prisma";
import type { RunMode } from "./actions/kinds";

// Email outbox. Every message is written first; it is sent only in LIVE mode
// with RESEND_API_KEY configured, otherwise it is kept as DRY so the flow can
// be inspected without anyone receiving anything.

export async function queueEmail(opts: { email: string; subject: string; body: string; dedupeKey?: string; telegramChatId?: string | null }) {
  if (opts.dedupeKey) {
    const existing = await prisma.notification.findUnique({ where: { dedupeKey: opts.dedupeKey } });
    if (existing) return existing;
  }
  return prisma.notification.create({ data: { ...opts, status: "QUEUED" } });
}

export async function deliver(notificationId: number, mode: RunMode) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!n || n.status !== "QUEUED") return n;

  // Telegram first: it is where Hong Kong shoppers actually read alerts, and it
  // needs no domain or provider account.
  let telegramSent = false;
  if (n.telegramChatId) {
    const { sendTelegram } = await import("./telegram");
    telegramSent = (await sendTelegram(n.telegramChatId, `${n.subject}\n\n${n.body}`, mode)).sent;
  }

  // Web push to any installed PWA registered with this email.
  let pushSent = false;
  {
    const { sendPush, firstUrl } = await import("./push");
    pushSent = (await sendPush(n.email, { title: n.subject, body: n.body, url: firstUrl(n.body), tag: n.dedupeKey ?? undefined }, mode)).sent > 0;
  }
  telegramSent = telegramSent || pushSent;

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (mode !== "LIVE" || !key || !from) {
    return prisma.notification.update({
      where: { id: n.id },
      data: { status: telegramSent ? "SENT" : "DRY", sentAt: new Date() },
    });
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [n.email], subject: n.subject, text: n.body }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return prisma.notification.update({ where: { id: n.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (e) {
    return prisma.notification.update({
      where: { id: n.id },
      data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) },
    });
  }
}
