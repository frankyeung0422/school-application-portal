import 'server-only';
import { prisma } from '@/lib/db/prisma';

const STREAK_KEY = 'streak';
const BADGE_MILESTONES = [7, 14, 30, 60, 100, 365];

interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string; // YYYY-MM-DD HKT
  badges: number[];
}

function todayHKT(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function yesterdayHKT(): string {
  return new Date(Date.now() + 8 * 3600 * 1000 - 24 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Get a user's streak state. Streak is stored as JSON in Event rows
 * (eventName = 'streak') rather than a dedicated table — events are write-once
 * and we always read the latest row.
 */
export async function getStreak(userId: string): Promise<StreakState> {
  const row = await prisma.event.findFirst({
    where: { userId, eventName: STREAK_KEY },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return { current: 0, longest: 0, lastActiveDate: '', badges: [] };
  return row.properties as unknown as StreakState;
}

/**
 * Bump the streak on a meaningful daily action (chart view, daily-fortune open).
 * Idempotent within a day.
 */
export async function bumpStreak(userId: string): Promise<StreakState & { milestone?: number }> {
  const today = todayHKT();
  const prev = await getStreak(userId);

  if (prev.lastActiveDate === today) return prev; // already counted today

  const isContinuation = prev.lastActiveDate === yesterdayHKT();
  const current = isContinuation ? prev.current + 1 : 1;
  const longest = Math.max(prev.longest, current);

  const newBadges = BADGE_MILESTONES.filter((m) => current === m && !prev.badges.includes(m));
  const badges = [...prev.badges, ...newBadges];

  const next: StreakState = { current, longest, lastActiveDate: today, badges };

  await prisma.event.create({
    data: {
      userId,
      eventName: STREAK_KEY,
      properties: next as unknown as object,
    },
  });

  return { ...next, milestone: newBadges[0] };
}
