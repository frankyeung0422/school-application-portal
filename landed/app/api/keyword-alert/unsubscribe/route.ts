import { NextResponse } from "next/server";
import { unsubscribeKeyword } from "@/lib/keyword-alert-service";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = await unsubscribeKeyword(Number(u.searchParams.get("id")), u.searchParams.get("t") ?? "");
  return new NextResponse(ok ? "已停止呢個關鍵字通知。Keyword alert stopped." : "連結無效 Invalid link.", {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
