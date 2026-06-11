import { NextResponse } from 'next/server';
import { applyUnsubscribe, isPreferenceKind } from '@/lib/email/unsubscribe';
import { publicEnv } from '@/lib/env';

export const runtime = 'nodejs';

/** One-click unsubscribe (RFC 8058). Mail clients POST here directly. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  const kindRaw = url.searchParams.get('kind');
  if (!email) return new NextResponse('missing email', { status: 400 });
  const kind = isPreferenceKind(kindRaw) ? kindRaw : null;
  try {
    await applyUnsubscribe(email, kind);
  } catch {
    // best-effort; still 200 so the mail client marks it done
  }
  return new NextResponse('unsubscribed', { status: 200 });
}

/** GET → forward to the human confirmation page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.search;
  return NextResponse.redirect(`${publicEnv.NEXT_PUBLIC_APP_URL}/unsubscribe${qs}`);
}
