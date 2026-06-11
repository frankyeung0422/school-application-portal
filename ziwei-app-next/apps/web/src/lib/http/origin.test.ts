import { describe, it, expect } from 'vitest';
import { resolveOrigin, resolveScheme } from './origin';

/** Build a bare Request carrying just the headers under test. */
function req(headers: Record<string, string>): Request {
  return new Request('http://internal.invalid/whatever', { headers });
}

const FALLBACK = 'https://aifortunetelling.org';

describe('resolveOrigin', () => {
  it('uses the host header, http for localhost (dev on :9001)', () => {
    expect(resolveOrigin(req({ host: 'localhost:9001' }), FALLBACK)).toBe('http://localhost:9001');
  });

  it('uses https for a non-loopback host', () => {
    expect(resolveOrigin(req({ host: 'aifortunetelling.org' }), FALLBACK)).toBe(
      'https://aifortunetelling.org',
    );
  });

  it('honours x-forwarded-host + x-forwarded-proto behind a proxy', () => {
    const r = req({
      host: 'internal-pod:8080',
      'x-forwarded-host': 'aifortunetelling.org',
      'x-forwarded-proto': 'https',
    });
    expect(resolveOrigin(r, FALLBACK)).toBe('https://aifortunetelling.org');
  });

  it('takes the first value of a comma-listed x-forwarded-proto', () => {
    const r = req({
      'x-forwarded-host': 'aifortunetelling.org',
      'x-forwarded-proto': 'https,http',
    });
    expect(resolveOrigin(r, FALLBACK)).toBe('https://aifortunetelling.org');
  });

  it('prefers x-forwarded-host over host', () => {
    const r = req({ host: 'localhost:9001', 'x-forwarded-host': 'aifortunetelling.org' });
    expect(resolveOrigin(r, FALLBACK)).toBe('https://aifortunetelling.org');
  });

  it('treats 127.0.0.1 and IPv6 loopback as http', () => {
    expect(resolveOrigin(req({ host: '127.0.0.1:9001' }), FALLBACK)).toBe('http://127.0.0.1:9001');
    expect(resolveOrigin(req({ host: '[::1]:9001' }), FALLBACK)).toBe('http://[::1]:9001');
  });

  it('respects an explicit x-forwarded-proto even for localhost', () => {
    const r = req({ host: 'localhost:9001', 'x-forwarded-proto': 'https' });
    expect(resolveOrigin(r, FALLBACK)).toBe('https://localhost:9001');
  });

  it('falls back only when no host header is present', () => {
    expect(resolveOrigin(req({}), FALLBACK)).toBe(FALLBACK);
  });
});

describe('resolveScheme (drives the Secure cookie attribute)', () => {
  const h = (headers: Record<string, string>) => new Headers(headers);

  it('returns http for localhost — the key regression: prod build over http://localhost', () => {
    // NODE_ENV=production but the connection is plain http → cookie must NOT be Secure
    expect(resolveScheme(h({ host: 'localhost:9001' }))).toBe('http');
  });

  it('returns http for loopback IPs', () => {
    expect(resolveScheme(h({ host: '127.0.0.1:9001' }))).toBe('http');
    expect(resolveScheme(h({ host: '[::1]:9001' }))).toBe('http');
  });

  it('returns https for a public host with no forwarded proto', () => {
    expect(resolveScheme(h({ host: 'aifortunetelling.org' }))).toBe('https');
  });

  it('trusts x-forwarded-proto when present (proxy terminating TLS)', () => {
    expect(resolveScheme(h({ host: 'localhost:9001', 'x-forwarded-proto': 'https' }))).toBe('https');
    expect(resolveScheme(h({ host: 'aifortunetelling.org', 'x-forwarded-proto': 'http' }))).toBe(
      'http',
    );
  });

  it('takes the first value of a comma-listed x-forwarded-proto', () => {
    expect(resolveScheme(h({ host: 'x', 'x-forwarded-proto': 'https,http' }))).toBe('https');
  });

  it('defaults to https when nothing is knowable', () => {
    expect(resolveScheme(h({}))).toBe('https');
  });
});
