// First-party usage numbers from PageEvent + AffiliateClick. Pure; tests/analytics.test.ts.
// Sessions are a random cookie: these are browsers, not people, and the page says so.

export interface EventRow {
  sessionId: string;
  event: string;
  path: string;
  createdAt: Date;
}

const BOT = /(bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|headless|lighthouse|curl|wget|python-requests|node-fetch)/i;

/** Crawlers and link-preview fetchers are not visitors. */
export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT.test(userAgent);
}

/** Only the host of a referrer — never the full URL (it can carry search terms or tokens). */
export function refHostOf(referrer: string | null | undefined, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const h = new URL(referrer).hostname.toLowerCase();
    return h && h !== ownHost.toLowerCase() ? h.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/** Paths we record: page paths only, no query strings (searches are counted as the "search" event). */
export function normalisePath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/_next")) return null;
  const p = path.split(/[?#]/)[0].slice(0, 200);
  return p.length > 1 ? p.replace(/\/$/, "") : "/";
}

const hkDay = (d: Date) => new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);

export interface Funnel {
  sessions: number;
  searched: number;
  viewedProduct: number;
  clickedOut: number;
  watched: number;
}

/** Of the sessions seen in the window, how many got how far. */
export function funnel(events: EventRow[], clickSessions: Set<string>): Funnel {
  const s = new Map<string, Set<string>>();
  for (const e of events) {
    const set = s.get(e.sessionId) ?? new Set<string>();
    if (e.event === "search" || e.path === "/search") set.add("search");
    if (e.path.startsWith("/p/")) set.add("product");
    if (e.event === "watch") set.add("watch");
    set.add("seen");
    s.set(e.sessionId, set);
  }
  const has = (k: string) => [...s.values()].filter((v) => v.has(k)).length;
  return {
    sessions: s.size,
    searched: has("search"),
    viewedProduct: has("product"),
    clickedOut: [...s.keys()].filter((id) => clickSessions.has(id)).length,
    watched: has("watch"),
  };
}

/** Share of sessions first seen in [from, from+cohortDays) that came back on a later day within `withinDays`. */
export function returnRate(events: EventRow[], from: Date, cohortDays: number, withinDays: number): { cohort: number; returned: number; rate: number | null } {
  const firstSeen = new Map<string, Date>();
  const days = new Map<string, Set<string>>();
  for (const e of events) {
    const f = firstSeen.get(e.sessionId);
    if (!f || e.createdAt < f) firstSeen.set(e.sessionId, e.createdAt);
    const d = days.get(e.sessionId) ?? new Set<string>();
    d.add(hkDay(e.createdAt));
    days.set(e.sessionId, d);
  }
  const end = from.getTime() + cohortDays * 86400_000;
  let cohort = 0;
  let returned = 0;
  for (const [id, first] of firstSeen) {
    if (first.getTime() < from.getTime() || first.getTime() >= end) continue;
    cohort++;
    const firstDay = hkDay(first);
    const limit = hkDay(new Date(first.getTime() + withinDays * 86400_000));
    if ([...(days.get(id) ?? [])].some((d) => d > firstDay && d <= limit)) returned++;
  }
  return { cohort, returned, rate: cohort ? returned / cohort : null };
}

/** Distinct sessions per HK day. */
export function dailySessions(events: EventRow[]): { day: string; sessions: number }[] {
  const byDay = new Map<string, Set<string>>();
  for (const e of events) {
    const d = hkDay(e.createdAt);
    const set = byDay.get(d) ?? new Set<string>();
    set.add(e.sessionId);
    byDay.set(d, set);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, set]) => ({ day, sessions: set.size }));
}

export function topPaths(events: EventRow[], n = 15): { path: string; views: number; sessions: number }[] {
  const m = new Map<string, { views: number; sessions: Set<string> }>();
  for (const e of events) {
    if (e.event !== "view") continue;
    const r = m.get(e.path) ?? { views: 0, sessions: new Set<string>() };
    r.views++;
    r.sessions.add(e.sessionId);
    m.set(e.path, r);
  }
  return [...m.entries()]
    .map(([path, r]) => ({ path, views: r.views, sessions: r.sessions.size }))
    .sort((a, b) => b.sessions - a.sessions || b.views - a.views)
    .slice(0, n);
}
