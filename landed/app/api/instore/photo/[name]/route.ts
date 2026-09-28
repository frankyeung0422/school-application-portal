import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readPhoto } from "@/lib/instore/service";
import { currentCustomer } from "@/lib/auth";

// Uploads live outside /public and are served only here: approved photos to
// everyone, pending ones only to an admin reviewing them.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const report = await prisma.storePriceReport.findFirst({ where: { photoPath: name } });
  if (!report) return new NextResponse("Not found", { status: 404 });
  if (report.status !== "APPROVED") {
    const me = await currentCustomer();
    if (!me?.isAdmin) return new NextResponse("Not found", { status: 404 });
  }
  const photo = await readPhoto(name);
  if (!photo) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": report.status === "APPROVED" ? "public, max-age=86400" : "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
