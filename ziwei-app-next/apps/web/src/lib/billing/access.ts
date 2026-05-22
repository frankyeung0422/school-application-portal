import 'server-only';
import { prisma } from '@/lib/db/prisma';

/**
 * Centralised plan-gating for premium features.
 *
 * `hasActivePlan` returns true when the user has a subscription in a
 * paying-or-still-eligible status. We treat TRIALING as access-granted so
 * the trial period actually delivers value; PAST_DUE keeps access for a
 * grace window since Stripe dunning runs ~3-7 days before final cancel.
 */

const ACCESS_GRANT_STATUSES = new Set(['TRIALING', 'ACTIVE', 'PAST_DUE']);
const PAID_PLANS = new Set(['MONTHLY', 'ANNUAL', 'MASTER']);

export async function hasActivePlan(userId: string): Promise<boolean> {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return false;
    return PAID_PLANS.has(sub.plan) && ACCESS_GRANT_STATUSES.has(sub.status);
  } catch (err) {
    // DB-unavailable (Path A placeholder) → no premium. Free path still works.
    console.warn('[billing/access] hasActivePlan failed:', (err as Error).message);
    return false;
  }
}

/**
 * Free-tier 師傅 chat quota — count user-role messages this calendar month
 * across all conversations belonging to this user. Subscribers bypass.
 */

export const FREE_MASTER_CHAT_QUOTA = 3;

export interface MasterChatQuota {
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function getMasterChatQuota(userId: string): Promise<MasterChatQuota> {
  if (await hasActivePlan(userId)) {
    return { unlimited: true, used: 0, limit: Infinity, remaining: Infinity };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let used = 0;
  try {
    used = await prisma.chatMessage.count({
      where: {
        role: 'user',
        createdAt: { gte: monthStart },
        conversation: { userId },
      },
    });
  } catch (err) {
    console.warn('[billing/access] master chat quota count failed:', (err as Error).message);
  }

  return {
    unlimited: false,
    used,
    limit: FREE_MASTER_CHAT_QUOTA,
    remaining: Math.max(0, FREE_MASTER_CHAT_QUOTA - used),
  };
}
