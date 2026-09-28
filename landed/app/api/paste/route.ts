import { NextResponse } from "next/server";
import { requestPaste } from "@/lib/paste";
import { jsonError, readBody } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    return NextResponse.json(await requestPaste(String(body.url ?? "")));
  } catch (e) {
    return jsonError(e);
  }
}
