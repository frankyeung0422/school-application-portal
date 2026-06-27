import { auth } from "@/lib/auth/authOptions";

/**
 * Subscription tier definition.
 *
 * The User model uses a `role` enum (PUBLIC | PRACTITIONER | EDITOR | ADMIN | PATIENT | RESEARCHER).
 * For tier gating we map:
 *   PUBLIC / PATIENT / RESEARCHER  → "free"        (browsing only; PATIENT/RESEARCHER have their own portals)
 *   PRACTITIONER                   → "professional" (clinical workflow tools)
 *   EDITOR / ADMIN                 → "clinic"       (full access incl. analytics, multi-user features)
 */
export type Tier = "free" | "professional" | "clinic";

export function tierFromRole(role: string | undefined | null): Tier {
  switch (role) {
    case "PRACTITIONER":
      return "professional";
    case "EDITOR":
    case "ADMIN":
      return "clinic";
    default:
      return "free";
  }
}

const TIER_RANK: Record<Tier, number> = { free: 0, professional: 1, clinic: 2 };

export function tierAtLeast(have: Tier, need: Tier): boolean {
  return TIER_RANK[have] >= TIER_RANK[need];
}

/** Server-side helper: read current user's tier from the session. */
export async function getCurrentTier(): Promise<Tier> {
  const session = await auth();
  return tierFromRole((session?.user as { role?: string } | undefined)?.role);
}

/** Server-side guard: throw if user lacks the required tier. */
export async function requireTier(need: Tier): Promise<Tier> {
  const have = await getCurrentTier();
  if (!tierAtLeast(have, need)) {
    throw new Error(`tier:${need}_required`);
  }
  return have;
}

type SessionUser = { role?: string; id?: string } | undefined;

/** Throw if the current user is not an authenticated RESEARCHER or ADMIN. */
export async function requireResearcher(): Promise<string> {
  const session = await auth();
  const user = session?.user as SessionUser;
  if (!user?.id) throw new Error("auth:unauthenticated");
  if (user.role !== "RESEARCHER" && user.role !== "ADMIN") {
    throw new Error("auth:researcher_required");
  }
  return user.id;
}

/** Throw if the current user is not an authenticated PATIENT (or higher). */
export async function requirePatient(): Promise<string> {
  const session = await auth();
  const user = session?.user as SessionUser;
  if (!user?.id) throw new Error("auth:unauthenticated");
  // PATIENT, PRACTITIONER, ADMIN, EDITOR can all access self-health profile
  const ALLOWED = ["PATIENT", "PRACTITIONER", "ADMIN", "EDITOR"];
  if (!user.role || !ALLOWED.includes(user.role)) throw new Error("auth:patient_required");
  return user.id;
}

/** Return current user id from session, or null if unauthenticated. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as SessionUser)?.id ?? null;
}

/** Return current user role from session, or null if unauthenticated. */
export async function getCurrentUserRole(): Promise<string | null> {
  const session = await auth();
  return (session?.user as SessionUser)?.role ?? null;
}
