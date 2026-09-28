import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

/** The anonymous first-party session cookie (route handlers only: it may set the cookie). */
export async function ensureSessionId(): Promise<string> {
  const jar = await cookies();
  let sid = jar.get("landed_sid")?.value;
  if (!sid) {
    sid = randomUUID();
    jar.set("landed_sid", sid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return sid;
}
