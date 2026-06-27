import { NextRequest, NextResponse } from "next/server";

type RateWindow = { count: number; resetAt: number };
const hits = new Map<string, RateWindow>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/diagnose/reason": { max: 10, windowMs: 60_000 },
  "/api/safety/check": { max: 30, windowMs: 60_000 },
  "/api/stats": { max: 60, windowMs: 60_000 },
};

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = LIMITS[pathname];
  if (!rule) return NextResponse.next();

  const ip = getIp(request);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const win = hits.get(key);

  if (!win || now >= win.resetAt) {
    hits.set(key, { count: 1, resetAt: now + rule.windowMs });
    return NextResponse.next();
  }

  if (win.count >= rule.max) {
    const retryAfter = Math.ceil((win.resetAt - now) / 1000);
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rule.max),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  win.count++;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/diagnose/reason", "/api/safety/check", "/api/stats"],
};
