import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/client';
import { renderAlertEmail } from '@/emails/alert';

/**
 * Send a dedicated email for any newly-detected high-severity (≥4) alerts the
 * user hasn't been emailed about yet. `Alert.emailSent` is flipped atomically so
 * each distinct alert emails exactly once (and re-fires next period via a new
 * alertHash). Respects the user's alertEmailEnabled preference. Returns the
 * number of alerts emailed.
 */
export async function flushAlertEmails(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      displayName: true,
      emailPrefs: { select: { alertEmailEnabled: true } },
    },
  });
  if (!user || user.emailPrefs?.alertEmailEnabled === false) return 0;

  const pending = await prisma.alert.findMany({
    where: { userId, severity: { gte: 4 }, emailSent: false, isDismissed: false },
    orderBy: { severity: 'desc' },
    take: 10,
  });
  if (pending.length === 0) return 0;

  // Claim atomically so a concurrent sweep can't double-send.
  const claimed = await prisma.alert.updateMany({
    where: { id: { in: pending.map((a) => a.id) }, emailSent: false },
    data: { emailSent: true },
  });
  if (claimed.count === 0) return 0;

  const { subject, html } = renderAlertEmail({
    displayName: user.displayName ?? undefined,
    period: pending[0].period ?? '近期',
    alerts: pending.map((a) => ({
      title: a.title,
      description: a.description,
      severity: a.severity,
      recommendations: Array.isArray(a.recommendations) ? (a.recommendations as string[]) : [],
    })),
  });

  try {
    await sendEmail({ to: user.email, subject, html, preferenceKind: 'alert' });
  } catch (err) {
    // Revert the claim so a later sweep retries.
    await prisma.alert.updateMany({
      where: { id: { in: pending.map((a) => a.id) } },
      data: { emailSent: false },
    });
    throw err;
  }
  return pending.length;
}
