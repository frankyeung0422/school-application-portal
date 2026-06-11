import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/env';

const ISSUER = 'ziwei-pavilion';
const AUDIENCE = 'ziwei-web';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface SessionClaims {
  sub: string;        // user id
  email: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

export async function signSession(payload: Pick<SessionClaims, 'sub' | 'email' | 'role'>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_MAX_AGE_DAYS}d`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}
