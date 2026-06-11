import 'server-only';
import type { TransitScope } from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/client';
import { renderPeriodFortuneEmail } from '@/emails/period-fortune';
import {
  loadPrimarySubject,
  getOrCreatePeriodFortune,
  syncPeriodAlerts,
} from '@/lib/chart/period-fortune';
import { flushAlertEmails } from '@/lib/alerts/notify';

const PAID_PLANS = ['MONTHLY', 'ANNUAL', 'MASTER'] as const;
const ACTIVE_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE'] as const;

const FLAG_FIELD: Record<TransitScope, 'dailyFortuneEnabled' | 'monthlyFortuneEnabled' | 'yearlyFortuneEnabled'> = {
  day: 'dailyFortuneEnabled',
  month: 'monthlyFortuneEnabled',
  year: 'yearlyFortuneEnabled',
};

const LAST_SENT_FIELD: Record<TransitScope, 'lastDailySentAt' | 'lastMonthlySentAt' | 'lastYearlySentAt'> = {
  day: 'lastDailySentAt',
  month: 'lastMonthlySentAt',
  year: 'lastYearlySentAt',
};

export interface SweepResult {
  scope: TransitScope;
  candidates: number;
  sent: number;
  failed: number;
  alertsEmailed: number;
  skippedNoSubject: number;
}

/**
 * Premium personalized fortune sweep for one scope. Finds opted-in users with an
 * active plan and a saved 命主, generates (or reuses) the period fortune, emails
 * it once per period (Fortune.emailSent claim), then runs + flushes period
 * alerts. Self-guarding by periodKey: for month/year, re-runs on later days of
 * the same period find emailSent=true and skip — so a daily schedule is safe.
 */
export async function runPeriodSweep(scope: TransitScope): Promise<SweepResult> {
  const flag = FLAG_FIELD[scope];
  const prefs = await prisma.emailPreference.findMany({
    where: {
      [flag]: true,
      user: {
        subscription: {
          plan: { in: [...PAID_PLANS] },
          status: { in: [...ACTIVE_STATUSES] },
        },
        subjects: { some: { charts: { some: {} } } },
      },
    },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  const today = new Date();
  const result: SweepResult = {
    scope, candidates: prefs.length, sent: 0, failed: 0, alertsEmailed: 0, skippedNoSubject: 0,
  };

  for (const pref of prefs) {
    const userId = pref.user.id;
    try {
      const subject = await loadPrimarySubject(userId);
      if (!subject) { result.skippedNoSubject++; continue; }

      const fortune = await getOrCreatePeriodFortune({ userId, subject, scope, date: today });

      // Period-scoped alerts + immediate high-severity emails.
      try {
        await syncPeriodAlerts({ userId, birth: subject.birth, scope, snapshot: fortune.snapshot });
        result.alertsEmailed += await flushAlertEmails(userId);
      } catch (err) {
        console.error(`[period-sweep:${scope}] alerts failed for ${userId}:`, (err as Error).message);
      }

      // Claim the per-period send atomically (send once per period).
      const claim = await prisma.fortune.updateMany({
        where: { userId, subjectId: subject.subjectId, scope, periodKey: fortune.periodKey, emailSent: false },
        data: { emailSent: true },
      });
      if (claim.count === 0) continue; // already emailed this period

      const { subject: subj, html, preferenceKind } = renderPeriodFortuneEmail({
        scope,
        periodLabel: fortune.periodLabel,
        body: fortune.body,
        displayName: pref.user.displayName ?? undefined,
      });
      try {
        await sendEmail({ to: pref.user.email, subject: subj, html, preferenceKind });
        await prisma.emailPreference.update({
          where: { userId },
          data: { [LAST_SENT_FIELD[scope]]: new Date(), ...(scope === 'day' ? { lastSentDate: new Date() } : {}) },
        });
        result.sent++;
      } catch (err) {
        // Revert the claim so a later run retries.
        await prisma.fortune.updateMany({
          where: { userId, subjectId: subject.subjectId, scope, periodKey: fortune.periodKey },
          data: { emailSent: false },
        });
        console.error(`[period-sweep:${scope}] send failed for ${pref.user.email}:`, (err as Error).message);
        result.failed++;
      }
    } catch (err) {
      console.error(`[period-sweep:${scope}] failed for ${userId}:`, (err as Error).message);
      result.failed++;
    }
  }

  return result;
}
