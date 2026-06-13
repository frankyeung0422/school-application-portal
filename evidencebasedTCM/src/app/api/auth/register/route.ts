import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password, role, credentials, institution, orcidId } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const allowedRoles = ["PUBLIC", "PRACTITIONER", "PATIENT", "RESEARCHER"];
  const userRole = allowedRoles.includes(role) ? role : "PUBLIC";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: userRole,
      credentials: credentials || null,
    },
  });

  // Auto-create role-specific profile records
  if (userRole === "RESEARCHER" && institution) {
    await prisma.researcherProfile.create({
      data: {
        userId: user.id,
        institution: institution || null,
        orcidId: orcidId || null,
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
