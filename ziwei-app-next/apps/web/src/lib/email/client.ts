import 'server-only';
import { Resend } from 'resend';
import { env, publicEnv } from '@/lib/env';
import type { PreferenceKind } from './unsubscribe';

// Lazy singleton — avoid construction during `next build` when no key is set.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  if (!env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
  _resend = new Resend(env.SENDGRID_API_KEY);
  return _resend;
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** When set, will include in the unsubscribe header */
  preferenceKind?: PreferenceKind;
}

export async function sendEmail(params: EmailParams) {
  // One-click List-Unsubscribe target (RFC 8058) — an API route that accepts POST.
  const unsubUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(
    params.to,
  )}${params.preferenceKind ? `&kind=${params.preferenceKind}` : ''}`;

  return getResend().emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: env.EMAIL_REPLY_TO,
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}
