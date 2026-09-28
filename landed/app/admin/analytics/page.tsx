import { prisma } from "@/lib/prisma";
import { dailySessions, funnel, returnRate, topPaths } from "@/lib/analytics";
import { Notice, PageTitle, Stat } from "@/components/ui";
import { msAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

// First-party numbers only. "Sessions" are browsers with our cookie, not people.

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

export default async function AnalyticsPage() {
  const since30 = msAgo(30 * 86400_000);
  const [events, clicks, watches, topSearches] = await Promise.all([
    prisma.pageEvent.findMany({ where: { createdAt: { gte: since30 } }, select: { sessionId: true, event: true, path: true, createdAt: true, refHost: true } }),
    prisma.affiliateClick.findMany({ where: { createdAt: { gte: since30 }, sessionId: { not: null } }, select: { sessionId: true } }),
    prisma.watch.count({ where: { createdAt: { gte: since30 } } }),
    prisma.searchQuery.findMany({
      where: { lastSearchedAt: { gte: since30 }, count: { gt: 0 } },
      orderBy: { count: "desc" },
      take: 12,
      select: { display: true, count: true },
    }),
  ]);
  const f = funnel(events, new Set(clicks.map((c) => c.sessionId!)));
  const d7 = returnRate(events, msAgo(14 * 86400_000), 7, 7);
  const d30 = returnRate(events, since30, 7, 30);
  const days = dailySessions(events).slice(-14);
  const max = Math.max(1, ...days.map((d) => d.sessions));
  const refs = new Map<string, number>();
  for (const e of events) if (e.refHost) refs.set(e.refHost, (refs.get(e.refHost) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <PageTitle title="使用數據 Analytics (30日)" sub="First-party page views: a random session cookie, the path and the referring host. No IP, no user agent, no account." />
      {!events.length ? <Notice tone="blue">未有數據 — page views start recording from this release.</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Sessions" value={f.sessions} />
        <Stat label="搜尋 Searched" value={f.searched} hint={pct(f.searched, f.sessions)} />
        <Stat label="睇產品 Viewed a product" value={f.viewedProduct} hint={pct(f.viewedProduct, f.sessions)} />
        <Stat label="出站點擊 Clicked out" value={f.clickedOut} hint={`${pct(f.clickedOut, f.sessions)} — the affiliate revenue step`} />
        <Stat label="新提醒 New watches" value={watches} hint="the retention step" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="7日回訪 D7 return" value={d7.rate == null ? "—" : pct(d7.returned, d7.cohort)} hint={`${d7.returned}/${d7.cohort} sessions first seen 8–14 days ago came back within 7 days`} />
        <Stat label="30日回訪 D30 return" value={d30.rate == null ? "—" : pct(d30.returned, d30.cohort)} hint={`${d30.returned}/${d30.cohort} of the first-week cohort (still filling for 30 days)`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="mb-2 font-semibold">每日 Sessions / day</h2>
          <div className="space-y-1">
            {days.map((d) => (
              <div key={d.day} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-slate-500">{d.day.slice(5)}</span>
                <div className="h-3 rounded bg-brand-500" style={{ width: `${(d.sessions / max) * 80}%`, minWidth: 2 }} />
                <span className="tabular-nums">{d.sessions}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card overflow-x-auto">
          <h2 className="mb-2 font-semibold">熱門頁面 Top pages</h2>
          <table className="table">
            <thead><tr><th>Path</th><th className="text-right">Sessions</th></tr></thead>
            <tbody>
              {topPaths(events, 12).map((p) => (
                <tr key={p.path}>
                  <td className="max-w-[16rem] truncate text-xs">{p.path}</td>
                  <td className="text-right tabular-nums">{p.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <h2 className="mb-2 font-semibold">熱門搜尋 Searches · 來源 Referrers</h2>
          <table className="table">
            <tbody>
              {topSearches.map((s) => (
                <tr key={s.display}><td className="text-xs">{s.display}</td><td className="text-right tabular-nums">{s.count}</td></tr>
              ))}
              {[...refs.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([h, n]) => (
                  <tr key={h}><td className="text-xs text-slate-500">↪ {h}</td><td className="text-right tabular-nums">{n}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
