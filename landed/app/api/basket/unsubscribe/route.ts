import { NextResponse } from "next/server";
import { unsubscribeDigest } from "@/lib/basket-service";

// One-click stop for the weekly digest, from the link in the message itself.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = await unsubscribeDigest(Number(u.searchParams.get("id")), u.searchParams.get("t") ?? "");
  return new NextResponse(
    ok ? "已停止每週慳錢清單。Weekly basket digest stopped." : "連結無效 Invalid link.",
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
