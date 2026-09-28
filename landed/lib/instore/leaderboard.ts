// Monthly thanks to the shoppers who report shelf prices. Pure; tests/leaderboard.test.ts.
// Only APPROVED reports count (the admin check is unchanged), and nobody is named:
// an email is masked, an anonymous reporter gets a stable nickname from their hashed key.

export const DETECTIVE_BADGE_AT = 5;

export interface ReporterRow {
  reporterKey: string;
  reporterEmail: string | null;
}

export interface LeaderEntry {
  handle: string;
  approved: number;
  detective: boolean;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.toLowerCase().split("@");
  if (!user || !domain) return "匿名";
  return `${user.slice(0, 2)}***@${domain.split(".")[0]}`;
}

export function leaderboard(rows: ReporterRow[], n = 10): LeaderEntry[] {
  const by = new Map<string, { handle: string; approved: number }>();
  for (const r of rows) {
    // One person = one email when given, else one reporter key.
    const id = r.reporterEmail ? `e:${r.reporterEmail.toLowerCase()}` : `k:${r.reporterKey}`;
    const handle = r.reporterEmail ? maskEmail(r.reporterEmail) : `匿名偵探 #${r.reporterKey.slice(0, 4)}`;
    const e = by.get(id) ?? { handle, approved: 0 };
    e.approved++;
    by.set(id, e);
  }
  return [...by.values()]
    .sort((a, b) => b.approved - a.approved || a.handle.localeCompare(b.handle))
    .slice(0, n)
    .map((e) => ({ ...e, detective: e.approved >= DETECTIVE_BADGE_AT }));
}
