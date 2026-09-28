import { NextResponse } from "next/server";
import { linkChat, sendTelegram, telegramConfigured, unlinkChat } from "@/lib/telegram";
import { runMode } from "@/lib/actions/bus";

// Telegram calls this when someone messages the bot. The only thing it accepts
// is a link code (or /stop); it never takes instructions from a chat.
export async function POST(req: Request) {
  if (!telegramConfigured()) return NextResponse.json({ ok: false }, { status: 404 });
  // Telegram's own shared-secret header, set when the webhook is registered.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await req.json().catch(() => ({}))) as { message?: { chat?: { id?: number }; text?: string } };
  const chatId = update.message?.chat?.id != null ? String(update.message.chat.id) : null;
  const text = (update.message?.text ?? "").trim();
  if (!chatId) return NextResponse.json({ ok: true });

  const mode = await runMode();
  if (/^\/stop\b/i.test(text)) {
    await unlinkChat(chatId);
    await sendTelegram(chatId, "已停止減價通知。Alerts stopped.", mode);
    return NextResponse.json({ ok: true });
  }
  const code = text.match(/\bLD-[A-F0-9]{6}\b/i)?.[0];
  if (code) {
    const r = await linkChat(code, chatId);
    await sendTelegram(
      chatId,
      r.linked ? `✅ 已連結 ${r.email}，之後減價會喺呢度通知你。Linked — price drops will arrive here.` : "❌ 呢個碼唔啱或者已用過。Code not recognised.",
      mode,
    );
    return NextResponse.json({ ok: true });
  }
  await sendTelegram(chatId, "喺 /account 攞連結碼（LD-XXXXXX），再send過嚟。Send the LD- code from your account page.", mode);
  return NextResponse.json({ ok: true });
}
