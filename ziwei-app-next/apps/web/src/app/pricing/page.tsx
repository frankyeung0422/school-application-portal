import { Button, Card, CardContent } from '@/components/ui';
import { GoldNumeral, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { startCheckoutAction } from '@/lib/billing/actions';

const plans = [
  {
    id: 'monthly',
    name: '月度',
    badge: null,
    price: 98,
    period: '/月',
    features: [
      '無限命盤計算',
      '完整十二宮位解讀',
      '每日運勢電郵',
      '每週流年提醒',
      '連續紀錄與徽章',
      '邀請好友計劃',
    ],
    cta: '立即試用 7 天',
    ctaVariant: 'ghost' as const,
  },
  {
    id: 'annual',
    name: '年度',
    badge: '最受歡迎 · 省 33%',
    price: 788,
    period: '/年',
    features: [
      '月度方案全部功能',
      '語音版每日運勢 (TTS)',
      '視覺命盤解讀 (多模態 AI)',
      'PDF 完整報告匯出',
      '優先支援',
    ],
    cta: '開始 7 天試用',
    ctaVariant: 'gold' as const,
  },
  {
    id: 'master',
    name: '大師',
    badge: '人手深度服務',
    price: 1888,
    period: '/年',
    features: [
      '年度方案全部功能',
      '1 次 30 分鐘真人命理諮詢',
      '專屬命理顧問回應 (48小時內)',
      '優先排程',
      '限量名額',
    ],
    cta: '聯絡命理顧問',
    ctaVariant: 'primary' as const,
  },
];

export const metadata = {
  title: '訂閱方案',
  description: '紫微閣訂閱方案 — 月度 HK$98 / 年度 HK$788 / 大師 HK$1,888。7 天免費試用,隨時取消。',
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const notice =
    sp.error === 'checkout' ? '結帳暫時無法開始, 請稍後再試或聯絡我們。'
    : sp.error === 'unconfigured' ? '付款服務尚未啟用, 請聯絡管理員。'
    : sp.canceled ? '結帳已取消 — 您尚未被扣款, 隨時可再試。'
    : null;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="max-w-[var(--max-w-content)] mx-auto px-6 pt-20 pb-12 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-4">訂閱方案</p>
          <h1 className="font-display text-5xl font-semibold mb-4">選擇適合你的命理之路</h1>
          <p className="text-[var(--color-fg-muted)] max-w-2xl mx-auto">
            一杯咖啡的價格, 換來認識真正自己的清明。所有方案均含 7 天免費試用, 取消後立即停止扣款。
          </p>
          {notice && (
            <p className="mt-6 inline-block rounded-[var(--radius)] border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 py-2 text-sm text-[var(--color-gold-bright)]">
              {notice}
            </p>
          )}
        </section>

        <section className="max-w-[var(--max-w-content)] mx-auto px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <Card
                key={p.id}
                variant={p.id === 'annual' ? 'gold-rim' : 'ink'}
                padding="xl"
                className="flex flex-col"
              >
                <CardContent className="flex flex-col flex-1">
                  {p.badge && (
                    <div className="inline-block self-start mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-gold)] text-[var(--color-bg-deep)]">
                      {p.badge}
                    </div>
                  )}
                  <h3 className="font-display text-2xl font-semibold mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <GoldNumeral value={`HK$${p.price.toLocaleString()}`} size="xl" foil={p.id === 'annual'} />
                    <span className="text-sm text-[var(--color-fg-muted)]">{p.period}</span>
                  </div>
                  <ul className="flex flex-col gap-3 mb-8 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-[var(--color-gold)] mt-[2px]">✦</span>
                        <span className="text-[var(--color-fg)]">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <form action={startCheckoutAction} className="mt-auto">
                    <input type="hidden" name="plan" value={p.id} />
                    <Button type="submit" size="lg" variant={p.ctaVariant} className="w-full">{p.cta}</Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InkDivider variant="subtle">常見問題</InkDivider>

        <section className="max-w-3xl mx-auto px-6 pb-24">
          <div className="space-y-6">
            {[
              {
                q: '試用期會自動扣款嗎?',
                a: '是的, 7 天後系統會自動以您的信用卡開始扣款。您可在帳戶中心隨時取消, 取消後立即停止計費, 不收任何違約金。',
              },
              {
                q: '我可以隨時升級或降級嗎?',
                a: '可以。月度可隨時升級到年度 (按比例計算差額); 年度可在當前計費週期結束時降級至月度。',
              },
              {
                q: '退款政策?',
                a: '訂閱類數位內容原則上不退款, 但若您在訂閱 7 日內 (首次計費後) 對體驗不滿意, 可聯絡我們申請全額退款。',
              },
              {
                q: '我的命盤資料如何保存?',
                a: '所有資料以加密形式儲存於我們的私密資料庫, 僅您本人可查閱。詳見私隱政策。',
              },
            ].map((f) => (
              <div key={f.q} className="border-l-2 border-[var(--color-gold)] pl-4">
                <h4 className="font-display text-lg font-semibold mb-2 text-[var(--color-gold-bright)]">
                  {f.q}
                </h4>
                <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
