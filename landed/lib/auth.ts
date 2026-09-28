import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "./prisma";

// Customer + admin sessions: an HS256 JWT in an httpOnly cookie. Passwords are
// scrypt-hashed with a per-user salt (node:crypto, no native addon).

const COOKIE = "landed_session";
const MAX_AGE_S = 60 * 60 * 24 * 14;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return new TextEncoder().encode("landed-dev-only-secret-do-not-use-in-production");
  }
  return new TextEncoder().encode(s);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

export async function createSession(customerId: number) {
  const token = await new SignJWT({ cid: customerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentCustomer() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const cid = Number(payload.cid);
    if (!Number.isInteger(cid)) return null;
    return prisma.customer.findUnique({ where: { id: cid } });
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function requireCustomer() {
  const c = await currentCustomer();
  if (!c) throw new AuthError(401, "請先登入 Please sign in");
  return c;
}

export async function requireAdmin() {
  const c = await currentCustomer();
  if (!c) throw new AuthError(401, "請先登入 Please sign in");
  if (!c.isAdmin) throw new AuthError(403, "只限管理員 Admins only");
  return c;
}
