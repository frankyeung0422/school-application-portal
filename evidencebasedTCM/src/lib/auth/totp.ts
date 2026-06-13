/**
 * Minimal RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) using only Node
 * crypto — no external deps. Compatible with Google Authenticator, Authy,
 * 1Password, etc.
 *
 * Secrets are stored base32-encoded in User.totpSecret. Recovery codes are
 * stored as bcrypt hashes (one per line in User.totpRecoveryCodes).
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const STEP_SECONDS = 30;
const DIGITS = 6;

// RFC 4648 base32 (no padding, uppercase).
const B32_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHA[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHA[(value << (5 - bits)) & 0x1f];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHA.indexOf(ch);
    if (idx < 0) throw new Error("invalid_base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

export function totpCode(secret: string, when: Date = new Date()): string {
  return hotp(base32Decode(secret), Math.floor(when.getTime() / 1000 / STEP_SECONDS));
}

/**
 * Verify a 6-digit code. Tolerates ±1 time step (90s window total).
 */
export function verifyTotp(secret: string, code: string, when: Date = new Date()): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const buf = base32Decode(secret);
  const t = Math.floor(when.getTime() / 1000 / STEP_SECONDS);
  for (const delta of [-1, 0, 1]) {
    if (crypto.timingSafeEqual(Buffer.from(cleaned), Buffer.from(hotp(buf, t + delta)))) return true;
  }
  return false;
}

/**
 * Build the otpauth:// URI for QR-code provisioning.
 * Example:
 *   otpauth://totp/EBTCM:user@example.com?secret=ABC...&issuer=EBTCM
 */
export function otpauthUri(secret: string, accountLabel: string, issuer = "EBTCM"): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(accountLabel)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/**
 * Generate N one-shot recovery codes (display once, store as bcrypt hashes).
 */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    // 4-char-4-char dash-separated, base32 alphabet
    const a = base32Encode(crypto.randomBytes(3)).slice(0, 5);
    const b = base32Encode(crypto.randomBytes(3)).slice(0, 5);
    return `${a}-${b}`;
  });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return hashes.join("\n");
}

/**
 * Try to consume a recovery code from the stored hash list. If matched,
 * returns the new stored-hash list (with the used hash removed) — caller
 * must persist it. Returns null on no match.
 */
export async function consumeRecoveryCode(
  stored: string | null,
  presented: string,
): Promise<string | null> {
  if (!stored) return null;
  const lines = stored.split("\n").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (await bcrypt.compare(presented.trim(), lines[i])) {
      const remaining = [...lines.slice(0, i), ...lines.slice(i + 1)];
      return remaining.join("\n");
    }
  }
  return null;
}
