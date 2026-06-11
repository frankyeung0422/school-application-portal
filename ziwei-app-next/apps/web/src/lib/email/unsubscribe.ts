import 'server-only';
import { prisma } from '@/lib/db/prisma';

/** Email preference kinds carried in List-Unsubscribe URLs. */
export type PreferenceKind =
  | 'daily_fortune'
  | 'weekly_horoscope'
  | 'monthly_fortune'
  | 'yearly_fortune'
  | 'alert'
  | 'marketing';

const KIND_TO_FIELD: Record<PreferenceKind, string> = {
  daily_fortune: 'dailyFortuneEnabled',
  weekly_horoscope: 'weeklyHoroscopeEnabled',
  monthly_fortune: 'monthlyFortuneEnabled',
  yearly_fortune: 'yearlyFortuneEnabled',
  alert: 'alertEmailEnabled',
  marketing: 'marketingEnabled',
};

export function isPreferenceKind(v: string | null): v is PreferenceKind {
  return v !== null && v in KIND_TO_FIELD;
}

/**
 * Flip a single preference off for a user identified by email. No login — this
 * backs both the one-click List-Unsubscribe POST and the human confirm page.
 * When `kind` is omitted, unsubscribes from ALL recurring fortune emails.
 */
export async function applyUnsubscribe(email: string, kind: PreferenceKind | null): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return false;

  const data: Record<string, boolean> = kind
    ? { [KIND_TO_FIELD[kind]]: false }
    : {
        dailyFortuneEnabled: false,
        monthlyFortuneEnabled: false,
        yearlyFortuneEnabled: false,
        weeklyHoroscopeEnabled: false,
      };

  await prisma.emailPreference.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });
  return true;
}
