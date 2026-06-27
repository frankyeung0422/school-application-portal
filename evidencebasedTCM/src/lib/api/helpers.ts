import { NextResponse } from "next/server";

export function apiOk<T extends object>(data: T) {
  return NextResponse.json({ ok: true, ...data });
}

export function apiError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function clampPagination(rawPage: number, rawLimit: number) {
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
