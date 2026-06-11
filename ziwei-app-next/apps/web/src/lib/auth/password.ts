import 'server-only';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import bcrypt from 'bcryptjs';

const SCRYPT_KEY_LEN = 64;
const SCRYPT_N = 2 ** 15; // ~50ms on modern hardware
// Node's default scrypt maxmem is 32MB, which is exactly the limit at N=2^15, r=8, p=1
// — flaky on some Node builds (ERR_CRYPTO_INVALID_SCRYPT_PARAMS). Give it headroom.
const SCRYPT_MAXMEM = 128 * 1024 * 1024;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, opts, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/**
 * Password hashing — scrypt (Node native, no native bcrypt build deps).
 * Returns "scrypt$N$<salt-hex>$<hash-hex>" so we can rotate params later.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, SCRYPT_KEY_LEN, { N: SCRYPT_N, maxmem: SCRYPT_MAXMEM });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

// Legacy bcrypt hashes from C:/Projects/ziwei-app start with $2a$/$2b$/$2y$.
// Detected so loginAction can rehash to scrypt on first successful login.
export function isLegacyBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isLegacyBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  const [scheme, nStr, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const N = Number(nStr);
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scryptAsync(plain, salt, expected.length, { N, maxmem: SCRYPT_MAXMEM });
  return timingSafeEqual(derived, expected);
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
