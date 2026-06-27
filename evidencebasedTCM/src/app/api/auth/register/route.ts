import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { Prisma, UserRole } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password, role, credentials, institution, orcidId } = body as Record<string, unknown>;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  if (typeof name !== "string" || name.length > 200) {
    return NextResponse.json({ error: "Name must be 200 characters or fewer" }, { status: 400 });
  }
  if (typeof credentials === "string" && credentials.length > 500) {
    return NextResponse.json({ error: "Credentials must be 500 characters or fewer" }, { status: 400 });
  }
  if (typeof institution === "string" && institution.length > 500) {
    return NextResponse.json({ error: "Institution must be 500 characters or fewer" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== "string" || !emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email as string } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const allowedRoles: UserRole[] = ["PUBLIC", "PRACTITIONER", "PATIENT", "RESEARCHER"];
  const userRole: UserRole = (typeof role === "string" && allowedRoles.includes(role as UserRole)) ? role as UserRole : "PUBLIC";

  const passwordHash = await bcrypt.hash(password as string, 12);

  let user: { id: string; email: string; name: string | null; role: string };
  try {
    user = await prisma.user.create({
      data: {
        name: name as string,
        email: email as string,
        passwordHash,
        role: userRole,
        credentials: typeof credentials === "string" ? credentials : null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    console.error("[auth/register] create error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Auto-create role-specific profile records
  if (userRole === "RESEARCHER") {
    // Always create profile for RESEARCHER role, even without institution
    await prisma.researcherProfile.create({
      data: {
        userId: user.id,
        institution: typeof institution === "string" ? institution : null,
        orcidId: typeof orcidId === "string" ? orcidId : null,
      },
    });
  } else if (userRole === "PATIENT") {
    await prisma.userHealthProfile.create({
      data: { userId: user.id },
    });
  }

  // Determine post-registration redirect hint
  const redirect =
    userRole === "PATIENT" ? "/my-health" :
    userRole === "RESEARCHER" ? "/researcher/profile" :
    "/";

  return NextResponse.json({
    success: true,
    redirect,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }, { status: 201 });
}
