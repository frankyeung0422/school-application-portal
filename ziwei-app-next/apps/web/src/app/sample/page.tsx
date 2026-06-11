import { Card, CardContent, Field, Input, Button } from '@/components/ui';
import { InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { calculateSampleChartAction } from '@/lib/chart/actions';

export const metadata = {
  title: '免費試讀',
  description: '輸入你的出生時辰, 立即獲得命宮免費解讀。',
};

export default async function SamplePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">免費試讀</p>
          <h1 className="font-display text-4xl font-semibold mb-3">輸入你的出生時辰</h1>
          <p className="text-[var(--color-fg-muted)]">
            我們將為你排出完整紫微斗數命盤, 並免費解讀「命宮」一宮。其餘十一宮位請於試用後查看。
          </p>
        </div>

        {sp.error && (
          <div className="mb-4 p-3 rounded-[var(--radius)] bg-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm text-center">
            請檢查所有欄位 — 我們需要完整的出生時辰才能排盤。
          </div>
        )}

        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <form action={calculateSampleChartAction} className="grid gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="出生年" htmlFor="year">
                  <Input id="year" name="year" type="number" min={1900} max={2100} required placeholder="1990" />
                </Field>
                <Field label="性別" htmlFor="gender">
                  <select
                    id="gender"
                    name="gender"
                    required
                    defaultValue=""
                    className="flex h-11 w-full rounded-[var(--radius)] px-4 bg-[var(--color-bg-deep)] text-[var(--color-fg)] shadow-[var(--shadow-rim-gold)] focus:outline-none focus:shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]"
                  >
                    <option value="" disabled>請選擇</option>
                    <option value="M">男</option>
                    <option value="F">女</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="月" htmlFor="month">
                  <Input id="month" name="month" type="number" min={1} max={12} required placeholder="6" />
                </Field>
                <Field label="日" htmlFor="day">
                  <Input id="day" name="day" type="number" min={1} max={31} required placeholder="15" />
                </Field>
                <Field label="時" htmlFor="hour" hint="0-23, 整點">
                  <Input id="hour" name="hour" type="number" min={0} max={23} required placeholder="14" />
                </Field>
              </div>
              <input type="hidden" name="minute" value="0" />
              <input type="hidden" name="calendar" value="solar" />
              <InkDivider variant="subtle" />
              <Button type="submit" size="lg" variant="gold">
                免費排出我的命盤 →
              </Button>
              <p className="text-xs text-[var(--color-fg-subtle)] text-center">
                我們不會儲存你的生辰資料, 除非你註冊帳戶。
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
