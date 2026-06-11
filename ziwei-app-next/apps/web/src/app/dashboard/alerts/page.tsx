import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { markAlertReadAction, dismissAlertAction } from '@/lib/alerts/actions';

export const metadata = { title: '命理預警' };
export const dynamic = 'force-dynamic';

const SEVERITY_LABEL: Record<number, string> = { 5: '極高', 4: '高', 3: '中', 2: '低', 1: '輕微' };

function severityColor(sev: number): string {
  if (sev >= 5) return 'var(--color-danger)';
  if (sev >= 4) return '#d97706';
  if (sev >= 3) return 'var(--color-gold)';
  return 'var(--color-fg-subtle)';
}

export default async function AlertsPage() {
  const session = await requireSession();
  const alerts = await prisma.alert.findMany({
    where: { userId: session.sub, isDismissed: false },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">命理預警</p>
          <h1 className="font-display text-4xl font-semibold mb-2">特別提醒</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            三盤合參偵測到的健康、意外、財務等須留意之象。嚴重者(高 / 極高)會另以電郵通知。
          </p>
        </header>

        {alerts.length === 0 ? (
          <Card variant="ink" padding="lg">
            <CardContent>
              <p className="text-[var(--color-fg-muted)]">目前未偵測到須特別留意的預警。平安順遂。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((a) => {
              const recs = Array.isArray(a.recommendations) ? (a.recommendations as string[]) : [];
              return (
                <Card key={a.id} variant={a.isRead ? 'ink' : 'gold-rim'} padding="md">
                  <CardContent>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ color: severityColor(a.severity), border: `1px solid ${severityColor(a.severity)}` }}
                      >
                        {SEVERITY_LABEL[a.severity] ?? a.severity} · {a.system ?? a.alertType}
                      </span>
                      {a.period && <span className="text-[11px] text-[var(--color-fg-subtle)]">{a.period}</span>}
                    </div>
                    <h2 className="font-display text-lg font-semibold mb-1">{a.title}</h2>
                    <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed mb-3">{a.description}</p>
                    {recs.length > 0 && (
                      <ul className="text-xs text-[var(--color-fg-subtle)] list-disc list-inside space-y-1 mb-3">
                        {recs.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      {!a.isRead && (
                        <form action={markAlertReadAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" size="sm" variant="ghost">標為已讀</Button>
                        </form>
                      )}
                      <form action={dismissAlertAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost">忽略</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <InkDivider variant="subtle" />
        <div className="text-center mt-8">
          <Button asChild size="md" variant="ghost"><Link href="/dashboard">← 返回帳戶</Link></Button>
        </div>
      </main>
    </>
  );
}
