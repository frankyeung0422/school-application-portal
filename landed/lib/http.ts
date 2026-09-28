import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { isUserFacing } from "./errors";

// Route-handler helpers: consistent JSON errors and a trustworthy origin.

export function jsonError(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  // Minified builds rename classes, so check a marker property, not constructor names.
  const known = isUserFacing(e);
  const message = e instanceof Error ? e.message : String(e);
  if (!known) console.error("[route error]", e);
  return NextResponse.json({ error: message }, { status: known ? 400 : 500 });
}

/** Absolute origin for redirects — APP_ORIGIN when set, else the request's own. */
export function originOf(req: Request): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return (await req.json()) as Record<string, string>;
  const form = await req.formData();
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
}
