import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { issueLinkCode, telegramConfigured } from "@/lib/telegram";
import { jsonError } from "@/lib/http";

export async function POST() {
  try {
    const me = await requireCustomer();
    if (!telegramConfigured()) {
      return NextResponse.json({ error: "未設定 Telegram bot（TELEGRAM_BOT_TOKEN）— bot not configured yet" }, { status: 503 });
    }
    return NextResponse.json({ code: await issueLinkCode(me.id), bot: process.env.TELEGRAM_BOT_USERNAME ?? null });
  } catch (e) {
    return jsonError(e);
  }
}
