import { Card, CardContent, Field, Input, Button } from '@/components/ui';
import { InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { calculateUnifiedAction } from '@/lib/chart/unified-actions';

export const metadata = {
  title: '三盤合參 · 全盤排算',
  description: '一次輸入生辰, 同時排出紫微斗數、八字、果老星宗三套命盤, 並由 AI 師傅三盤合參 —— 三套系統互相印證, 共識最可信, 分歧見真章。',
};

export default async function UnifiedReadingPage({
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
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">紫微 · 八字 · 果老星宗</p>
          <h1 className="font-display text-4xl font-semibold mb-3">一次生辰, 三盤合參</h1>
          <p className="text-[var(--color-fg-muted)]">
            輸入一次出生資料, 同時排出三套原理截然不同的命盤 —— 紫微斗數看格局結構、八字看五行旺衰、果老星宗以真實天象看廟旺。
            三盤一致時最可信; 三盤分歧時, 由師傅為你權衡。
          </p>
        </div>

        {sp.error && (
          <div className="mb-4 p-3 rounded-[var(--radius)] bg-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm text-center">
            請檢查所有欄位 — 三盤合參需要完整的出生時辰。
          </div>
        )}

        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <form action={calculateUnifiedAction} method="POST" className="grid gap-5">
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
              <div className="grid grid-cols-2 gap-4">
                <Field label="出生地緯度" htmlFor="latitude" hint="選填, 北緯為正, 預設香港">
                  <Input id="latitude" name="latitude" type="number" step="0.01" min={-90} max={90} placeholder="22.32" />
                </Field>
                <Field label="出生地經度" htmlFor="longitude" hint="選填, 東經為正, 預設香港">
                  <Input id="longitude" name="longitude" type="number" step="0.01" min={-180} max={180} placeholder="114.17" />
                </Field>
              </div>
              <input type="hidden" name="minute" value="0" />
              <input type="hidden" name="calendar" value="solar" />
              <InkDivider variant="subtle" />
              <Button type="submit" size="lg" variant="gold">
                同時排出三套命盤 →
              </Button>
              <p className="text-xs text-[var(--color-fg-subtle)] text-center">
                出生地僅影響果老星宗的命度 —— 不填則以香港為準。我們不會儲存你的生辰資料, 除非你註冊帳戶。
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
