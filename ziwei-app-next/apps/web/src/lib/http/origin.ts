/** Minimal Headers-like shape so both `Headers` and Next's `ReadonlyHeaders` work. */
type HeaderGetter = { get(name: string): string | null };

/**
 * Resolve the request scheme ('http' | 'https') from request headers.
 *
 * Order: x-forwarded-proto (first value if comma-listed) → http for loopback
 * hosts → https otherwise (and https when nothing is knowable, the safe default
 * for a public deployment).
 *
 * This must drive the `Secure` cookie attribute rather than NODE_ENV: a prod
 * build served locally over http://localhost (e.g. `next start`) reports
 * NODE_ENV=production but is NOT https, so a NODE_ENV-keyed Secure cookie is set
 * and then never sent back over http — silently breaking the OAuth state check
 * and the session.
 */
export function resolveScheme(headers: HeaderGetter): 'http' | 'https' {
  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedProto === 'http' || forwardedProto === 'https') return forwardedProto;
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? '';
  const isLocal =
    host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('[::1]');
  return isLocal ? 'http' : 'https';
}

/**
 * Resolve the externally-visible origin (scheme + host[:port]) from an incoming
 * request, honouring reverse-proxy headers. Pure and dependency-free so it can
 * be unit-tested without loading the server-only env module.
 *
 * Preference order for host: x-forwarded-host → host. Scheme via resolveScheme.
 * Falls back to `fallback` only when no host header is present.
 */
export function resolveOrigin(req: Request, fallback: string): string {
  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return fallback;
  return `${resolveScheme(h)}://${host}`;
}
