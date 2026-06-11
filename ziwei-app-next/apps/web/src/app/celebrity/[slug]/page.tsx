import { notFound } from 'next/navigation';
import Link from 'next/link';
import { computeChart, type PlacedStar } from '@ziwei/engine';
import { CELEBRITIES } from '@/data/celebrities';
import { Card, CardContent, Button } from '@/components/ui';
import { PalaceCell, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CELEBRITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const celeb = CELEBRITIES.find((c) => c.slug === slug);
  if (!celeb) return {};
  return {
    title: `${celeb.nameZh}的紫微斗數命盤分析`,
    description: `${celeb.bio} 從紫微斗數命盤角度, 解讀${celeb.nameZh}的命格與人生軌跡。`,
    openGraph: {
      title: `${celeb.nameZh}命盤 · 紫微閣`,
      description: celeb.bio,
      url: `/celebrity/${slug}`,
      type: 'article',
    },
    alternates: { canonical: `/celebrity/${slug}` },
  };
}

export default async function CelebrityPage({ params }: PageProps) {
  const { slug } = await params;
  const celeb = CELEBRITIES.find((c) => c.slug === slug);
  if (!celeb) notFound();

  const chart = computeChart(celeb.birth);
  const mingong = chart.palaces.find((p) => p.isMingong)!;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `${celeb.nameZh}的紫微斗數命盤分析`,
              author: { '@type': 'Organization', name: '紫微閣命理顧問團隊' },
              datePublished: new Date().toISOString(),
              about: { '@type': 'Person', name: celeb.nameZh, sameAs: celeb.sourceUrl },
            }),
          }}
        />

        <header className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">名人命盤</p>
          <h1 className="font-display text-5xl font-semibold mb-3">{celeb.nameZh}</h1>
          <p className="text-[var(--color-fg-muted)] max-w-2xl mx-auto">{celeb.bio}</p>
        </header>

        <div className="grid grid-cols-4 gap-3 mb-12">
          {chart.palaces.map((p) => (
            <PalaceCell
              key={p.name}
              name={p.name}
              branch={p.branch}
              ganzhi={p.ganzhi}
              stars={p.stars as PlacedStar[]}
              highlight={p.isMingong ? 'mingong' : 'none'}
            />
          ))}
        </div>

        <InkDivider>命盤觀察</InkDivider>

        <Card variant="gold-rim" padding="xl" className="mb-8">
          <CardContent>
            <p className="text-[var(--color-gold-bright)] font-display text-xl mb-3">
              命宮在 {mingong.branch} (干支 {mingong.ganzhi}) ·{' '}
              {mingong.stars.length === 0 ? '空宮' : mingong.stars.map((s) => s.name).join('、')}
            </p>
            <p className="text-[var(--color-fg)] leading-relaxed mb-4">
              {celeb.nameZh}以 {mingong.stars.map((s) => s.name).join('、') || '空宮借星'} 坐命,
              此星象在命理上對應 {celeb.knownFor[0]} 之事業特質。
              詳細十二宮、四化、流年分析, 請訂閱完整版查閱。
            </p>
            {!celeb.birthTimeKnown && (
              <p className="text-xs text-[var(--color-fg-subtle)] italic">
                ※ 出生時辰未公開, 以中午 12 點為推算基準。實際時辰可能影響命宮位置, 結果僅供參考。
              </p>
            )}
            <p className="text-xs text-[var(--color-fg-subtle)] mt-2">
              資料來源: <a href={celeb.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline">{celeb.sourceUrl}</a>
            </p>
          </CardContent>
        </Card>

        <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
          <CardContent>
            <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">
              想知道你的命盤跟 {celeb.nameZh} 有何相似?
            </h3>
            <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
              30 秒免費排盤, 即刻比對。
            </p>
            <Button asChild size="xl" variant="gold">
              <Link href="/sample">免費排出我的命盤 →</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
