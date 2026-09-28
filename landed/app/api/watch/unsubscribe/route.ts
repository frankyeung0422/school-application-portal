import { NextResponse } from "next/server";
import { unsubscribeWatch } from "@/lib/demand";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ok = await unsubscribeWatch(Number(url.searchParams.get("id")), url.searchParams.get("t") ?? "");
  const html = ok
    ? "<p>已取消減價通知。You will no longer receive price alerts for this product.</p>"
    : "<p>連結無效。This unsubscribe link is invalid.</p>";
  return new NextResponse(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:2rem">${html}<a href="/">到手價 Landed</a></body>`, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
