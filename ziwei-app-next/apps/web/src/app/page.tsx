import Link from 'next/link';
import { Button, Card, CardContent } from '@/components/ui';
import { GoldNumeral, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-[var(--max-w-content)] mx-auto px-6 pt-24 pb-32 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-6">
              千年命理 · 當代智能
            </p>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight mb-6">
              認識真正的自己,
              <br />
              <span className="text-gold-foil">看清未來的路。</span>
            </h1>
            <p className="text-lg text-[var(--color-fg-muted)] max-w-2xl mx-auto mb-10">
              一次生辰, 同時排出紫微斗數、八字、果老星宗三套命盤, 再由 AI 師傅三盤合參 ——
              三套系統互相印證, 共識最可信, 分歧見真章。這是單看一套盤給不了的準度。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" variant="gold">
                <Link href="/reading">三盤合參 · 免費排三盤 →</Link>
              </Button>
              <Button asChild size="xl" variant="ghost">
                <Link href="/sample">只排紫微斗數</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-[var(--color-fg-subtle)]">
              已有 <GoldNumeral value="1,200+" size="sm" /> 位用戶開啟人生新視角
            </p>
          </div>
        </section>

        <InkDivider>命理三大系統</InkDivider>

        {/* Feature triplet */}
        <section className="max-w-[var(--max-w-content)] mx-auto px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: '紫微斗數',
                subtitle: '十二宮位 · 十四主星',
                body: '完整命盤排盤,星曜亮度、四化、十二宮位互動解讀,深度剖析性格、事業、感情、財運。',
              },
              {
                title: '八字命理',
                subtitle: '天干地支 · 五行平衡',
                body: '四柱八字推算,五行喜忌、十神格局,結合大運流年看人生節奏與時運高低。',
              },
              {
                title: '果老星宗',
                subtitle: '七政四餘 · 真實天象',
                body: '以出生當下日月五星與四餘的真實天空位置入二十八宿與十二宮,由命度論相貌天賦 —— 紫微與八字都做不到的真星象。',
              },
            ].map((f) => (
              <Card key={f.title} variant="gold-rim" padding="lg">
                <CardContent>
                  <div className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-2">
                    {f.subtitle}
                  </div>
                  <h3 className="font-display text-2xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InkDivider variant="subtle">如何運作</InkDivider>

        {/* Process */}
        <section className="max-w-[var(--max-w-content)] mx-auto px-6 pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '一', title: '輸入生辰', body: '出生年月日時 + 性別。我們以陽曆精確排盤,亦支援陰曆換算。' },
              { step: '二', title: '排盤精算', body: '由 @ziwei/engine 計算十二宮位、十四主星亮度與四化,符合傳統典籍規範。' },
              { step: '三', title: 'AI 深度解讀', body: '採用 Claude Opus 與 Gemini Pro 雙引擎,結合命理顧問精校提示詞,生成貼合個人的解讀。' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <GoldNumeral value={s.step} size="xl" foil />
                <div>
                  <h4 className="font-display text-xl font-semibold mb-2 text-[var(--color-gold-bright)]">
                    {s.title}
                  </h4>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="max-w-[var(--max-w-content)] mx-auto px-6 pb-24">
          <Card variant="gold-rim" padding="xl" className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              準備好認識真正的自己了嗎?
            </h2>
            <p className="text-[var(--color-fg-muted)] mb-8 max-w-xl mx-auto">
              首日免費 · 7 天試用 · 隨時取消, 不收任何額外費用。
            </p>
            <Button asChild size="xl" variant="gold">
              <Link href="/sample">免費測試你的命盤</Link>
            </Button>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
