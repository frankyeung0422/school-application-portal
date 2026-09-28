import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSessionId } from "@/lib/session";
import { isBot, normalisePath, refHostOf } from "@/lib/analytics";

// Page-view beacon. Stores a path, an event name, a random session cookie and
// the referring host — nothing that identifies a person.
const EVENTS = new Set(["view", "search", "watch", "basket"]);

export async function POST(req: Request) {
  if (isBot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as { path?: unknown; event?: unknown; ref?: unknown };
  const path = typeof body.path === "string" ? normalisePath(body.path) : null;
  const event = typeof body.event === "string" && EVENTS.has(body.event) ? body.event : "view";
  if (!path) return new NextResponse(null, { status: 204 });
  const sessionId = await ensureSessionId();
  const ownHost = new URL(req.url).hostname;
  await prisma.pageEvent.create({
    data: { sessionId, event, path, refHost: refHostOf(typeof body.ref === "string" ? body.ref : null, ownHost) },
  });
  return new NextResponse(null, { status: 204 });
}
