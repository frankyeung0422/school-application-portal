import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentCustomer } from "@/lib/auth";
import { reporterKeyOf, submitReport } from "@/lib/instore/service";
import { MAX_PHOTO_BYTES } from "@/lib/instore/validate";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const photo = form.get("photo");
    const file = photo instanceof File && photo.size > 0 ? photo : null;
    if (file && file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "相片太大（上限 4MB）Photo too large" }, { status: 413 });
    }
    const jar = await cookies();
    let sid = jar.get("landed_sid")?.value;
    if (!sid) {
      sid = randomUUID();
      jar.set("landed_sid", sid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    const customer = await currentCustomer();
    const str = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : null;
    };
    const price = Number(str("price"));
    const productId = str("productId") ? Number(str("productId")) : null;
    const result = await submitReport({
      retailer: str("retailer") ?? "",
      priceCents: Number.isFinite(price) ? Math.round(price * 100) : NaN,
      seenAt: str("seenAt") ? new Date(str("seenAt")!) : new Date(),
      productId: Number.isInteger(productId) ? productId : null,
      itemName: str("itemName"),
      branch: str("branch"),
      note: str("note"),
      reporterEmail: str("email") ?? customer?.email ?? null,
      photo: file ? { type: file.type, size: file.size } : null,
      photoBytes: file ? await file.arrayBuffer() : null,
      reporterKey: reporterKeyOf(sid, req.headers.get("x-forwarded-for")),
    });
    return NextResponse.json({
      ok: true,
      ...result,
      message: "多謝！我哋核實之後就會顯示。Thanks — it appears once a human has checked it.",
    });
  } catch (e) {
    return jsonError(e);
  }
}
