import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import type { RunMode } from "./actions/kinds";

// Price alerts where Hong Kong actually reads them. Telegram is free and needs
// no business approval, unlike WhatsApp — and like every other outbound path,
// it sends nothing in DRY mode or without a token.

const API = "https://api.telegram.org";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegram(chatId: string, text: string, mode: RunMode): Promise<{ sent: boolean; reason?: string }> {
  if (!telegramConfigured()) return { sent: false, reason: "TELEGRAM_BOT_TOKEN not set" };
  if (mode !== "LIVE") return { sent: false, reason: "DRY run" };
  const res = await fetch(`${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return { sent: false, reason: `Telegram ${res.status}: ${(await res.text()).slice(0, 120)}` };
  return { sent: true };
}

/** A short code the shopper sends to the bot to prove the chat is theirs. */
export async function issueLinkCode(customerId: number): Promise<string> {
  const code = `LD-${randomBytes(3).toString("hex").toUpperCase()}`;
  await prisma.customer.update({ where: { id: customerId }, data: { telegramCode: code } });
  return code;
}

/** Bind a chat to whoever holds the code, and point their watches at it. */
export async function linkChat(code: string, chatId: string): Promise<{ linked: boolean; email?: string }> {
  const customer = await prisma.customer.findUnique({ where: { telegramCode: code.trim().toUpperCase() } });
  if (!customer) return { linked: false };
  await prisma.customer.update({ where: { id: customer.id }, data: { telegramChatId: chatId, telegramCode: null } });
  await prisma.watch.updateMany({
    where: { OR: [{ customerId: customer.id }, { email: customer.email }] },
    data: { telegramChatId: chatId },
  });
  return { linked: true, email: customer.email };
}

export async function unlinkChat(chatId: string) {
  await prisma.customer.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
  await prisma.watch.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
}
