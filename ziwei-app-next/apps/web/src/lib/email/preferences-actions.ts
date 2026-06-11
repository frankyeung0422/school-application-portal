'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { applyUnsubscribe, isPreferenceKind } from './unsubscribe';

const ALLOWED_TZ = new Set([
  'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London',
]);

/** Upsert the user's email preferences from the settings form. */
export async function updateEmailPreferencesAction(formData: FormData) {
  const session = await requireSession();
  const on = (name: string) => formData.get(name) === 'on';
  const tzRaw = (formData.get('timezone') as string | null) ?? 'Asia/Hong_Kong';
  const timezone = ALLOWED_TZ.has(tzRaw) ? tzRaw : 'Asia/Hong_Kong';

  const data = {
    dailyFortuneEnabled: on('dailyFortuneEnabled'),
    monthlyFortuneEnabled: on('monthlyFortuneEnabled'),
    yearlyFortuneEnabled: on('yearlyFortuneEnabled'),
    alertEmailEnabled: on('alertEmailEnabled'),
    marketingEnabled: on('marketingEnabled'),
    timezone,
  };

  await prisma.emailPreference.upsert({
    where: { userId: session.sub },
    update: data,
    create: { userId: session.sub, ...data },
  });
  revalidatePath('/account/settings');
}

/** Human one-click confirm from the /unsubscribe page (no login). */
export async function confirmUnsubscribeAction(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim();
  const kindRaw = formData.get('kind') as string | null;
  if (!email) redirect('/unsubscribe?error=1');
  const kind = isPreferenceKind(kindRaw) ? kindRaw : null;
  await applyUnsubscribe(email, kind);
  redirect(`/unsubscribe?done=1${kind ? `&kind=${kind}` : ''}`);
}
