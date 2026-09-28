import { createHmac } from "node:crypto";
import { prisma } from "./prisma";
import type { RunMode } from "./actions/kinds";

// Web Push to the installed PWA, as a third alert channel next to Telegram and
// email. Same rule as the others: only LIVE mode touches the network.

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** The first link in an alert body is where a tap on the notification should go. */
export function firstUrl(text: string): string | null {
  return /https?:\/\/[^\s]+/.exec(text)?.[0] ?? null;
}

export async function sendPush(email: string, msg: { title: string; body: string; url: string | null; tag?: string }, mode: RunMode) {
  const subs = await prisma.pushSubscription.findMany({ where: { email: email.toLowerCase() } });
  if (!subs.length) return { sent: 0, reason: "no subscription" };
  if (mode !== "LIVE" || !pushConfigured()) return { sent: 0, reason: mode !== "LIVE" ? "DRY" : "VAPID keys not set" };
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:alerts@example.com", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  let sent = 0;
  const payload = JSON.stringify({ title: msg.title, body: msg.body.slice(0, 180), url: msg.url, tag: msg.tag });
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // Gone / not found: the browser unsubscribed or was reset. Forget it.
      if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
    }
  }
  return { sent };
}

/**
 * Proof that this browser just set an alert for `email` (returned by /api/watch).
 * Without it, a logged-out visitor could register their browser against anyone's email.
 */
export function pushToken(email: string, issuedAt = Date.now()): string {
  return `${issuedAt}.${sign(email, issuedAt)}`;
}

export function verifyPushToken(email: string, token: string, now = Date.now(), maxAgeMs = 30 * 60_000): boolean {
  const [ts, mac] = token.split(".");
  const issuedAt = Number(ts);
  if (!Number.isFinite(issuedAt) || now - issuedAt > maxAgeMs || issuedAt > now + 60_000) return false;
  return mac === sign(email, issuedAt);
}

function sign(email: string, issuedAt: number): string {
  const secret = process.env.AUTH_SECRET ?? "landed-dev-only-secret-do-not-use-in-production";
  return createHmac("sha256", secret).update(`push:${email.toLowerCase()}:${issuedAt}`).digest("hex").slice(0, 32);
}
