import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { hasActivePlan } from '@/lib/billing/access';
import { updateEmailPreferencesAction } from '@/lib/email/preferences-actions';

export const metadata = { title: '帳戶設定' };
export const dynamic = 'force-dynamic';

const TIMEZONES = [
  ['Asia/Hong_Kong', '香港 (UTC+8)'],
  ['Asia/Taipei', '台北 (UTC+8)'],
  ['Asia/Shanghai', '上海 (UTC+8)'],
  ['Asia/Singapore', '新加坡 (UTC+8)'],
  ['Asia/Tokyo', '東京 (UTC+9)'],
  ['America/Los_Angeles', '洛杉磯 (UTC-8/-7)'],
  ['America/New_York', '紐約 (UTC-5/-4)'],
  ['Europe/London', '倫敦 (UTC+0/+1)'],
] as const;

function Toggle({
  name, label, hint, defaultChecked, disabled,
}: { name: string; label: string; hint: string; defaultChecked: boolean; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-1 h-4 w-4 accent-[var(--color-gold)]"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--color-fg-subtle)]">{hint}</span>
      </span>
    </label>
  );
}

export default async function SettingsPage() {
  const session = await requireSession();
  const [prefs, premium] = await Promise.all([
    prisma.emailPreference.findUnique({ where: { userId: session.sub } }),
    hasActivePlan(session.sub),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">帳戶設定</p>
          <h1 className="font-display text-4xl font-semibold mb-2">電郵與通知</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            選擇您想收到的命理電郵。月運與流年為訂閱會員專屬。
          </p>
        </header>

        <form action={updateEmailPreferencesAction}>
          <Card variant="gold-rim" padding="lg" className="mb-6">
            <CardContent>
              <div className="divide-y divide-[var(--color-border)]/40">
                <Toggle name="dailyFortuneEnabled" label="每日運勢" hint="每日 07:30(您的時區)寄送個人化每日運勢"
                  defaultChecked={prefs?.dailyFortuneEnabled ?? true} />
                <Toggle name="monthlyFortuneEnabled" label="每月運勢(會員)" hint="每節氣月寄送三盤合參月運"
                  defaultChecked={prefs?.monthlyFortuneEnabled ?? false} disabled={!premium} />
                <Toggle name="yearlyFortuneEnabled" label="流年運勢(會員)" hint="立春換年時寄送三盤合參流年報告"
                  defaultChecked={prefs?.yearlyFortuneEnabled ?? false} disabled={!premium} />
                <Toggle name="alertEmailEnabled" label="特別預警通知" hint="偵測到高嚴重度命理預警時即時電郵"
                  defaultChecked={prefs?.alertEmailEnabled ?? true} />
                <Toggle name="marketingEnabled" label="產品與優惠資訊" hint="不定期的新功能與優惠"
                  defaultChecked={prefs?.marketingEnabled ?? true} />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">時區</label>
                <select
                  name="timezone"
                  defaultValue={prefs?.timezone ?? 'Asia/Hong_Kong'}
                  className="w-full rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  {TIMEZONES.map(([tz, label]) => <option key={tz} value={tz}>{label}</option>)}
                </select>
              </div>

              {!premium && (
                <p className="mt-4 text-xs text-[var(--color-fg-subtle)]">
                  月運與流年為會員功能。<Link href="/pricing" className="text-[var(--color-gold-bright)] underline">升級解鎖</Link>。
                </p>
              )}

              <div className="mt-6">
                <Button type="submit" size="lg" variant="gold">儲存設定</Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <InkDivider variant="subtle" />
        <div className="text-center mt-8">
          <Button asChild size="md" variant="ghost"><Link href="/dashboard">← 返回帳戶</Link></Button>
        </div>
      </main>
    </>
  );
}
