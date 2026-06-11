import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider, GoldNumeral } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

interface PageProps {
  params: Promise<{ sign: string; year: string }>;
}

const ZODIAC_MAP: Record<string, { zh: string; element: string; years: number[] }> = {
  rat:     { zh: '鼠', element: '水', years: [2020, 2008, 1996, 1984, 1972, 1960] },
  ox:      { zh: '牛', element: '土', years: [2021, 2009, 1997, 1985, 1973, 1961] },
  tiger:   { zh: '虎', element: '木', years: [2022, 2010, 1998, 1986, 1974, 1962] },
  rabbit:  { zh: '兔', element: '木', years: [2023, 2011, 1999, 1987, 1975, 1963] },
  dragon:  { zh: '龍', element: '土', years: [2024, 2012, 2000, 1988, 1976, 1964] },
  snake:   { zh: '蛇', element: '火', years: [2025, 2013, 2001, 1989, 1977, 1965] },
  horse:   { zh: '馬', element: '火', years: [2026, 2014, 2002, 1990, 1978, 1966] },
  goat:    { zh: '羊', element: '土', years: [2027, 2015, 2003, 1991, 1979, 1967] },
  monkey:  { zh: '猴', element: '金', years: [2028, 2016, 2004, 1992, 1980, 1968] },
  rooster: { zh: '雞', element: '金', years: [2029, 2017, 2005, 1993, 1981, 1969] },
  dog:     { zh: '狗', element: '土', years: [2030, 2018, 2006, 1994, 1982, 1970] },
  pig:     { zh: '豬', element: '水', years: [2031, 2019, 2007, 1995, 1983, 1971] },
};

export async function generateStaticParams() {
  const params: Array<{ sign: string; year: string }> = [];
  const now = new Date().getFullYear();
  for (const sign of Object.keys(ZODIAC_MAP)) {
    for (const y of [now, now + 1]) {
      params.push({ sign, year: String(y) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps) {
  const { sign, year } = await params;
  const data = ZODIAC_MAP[sign];
  if (!data) return {};
  return {
    title: `${year} ${data.zh}年運勢 — 紫微閣`,
    description: `紫微斗數視角下, ${year}年屬${data.zh}的整體運勢、流年機會、命理預警。`,
    openGraph: {
      title: `${year} ${data.zh}年運勢`,
      description: `${data.zh}年的事業、感情、財運、健康四大面向流年分析。`,
      url: `/zodiac/${sign}/${year}`,
      type: 'article',
    },
    alternates: { canonical: `/zodiac/${sign}/${year}` },
  };
}

export default async function ZodiacPage({ params }: PageProps) {
  const { sign, year } = await params;
  const data = ZODIAC_MAP[sign];
  const yearNum = Number(year);
  if (!data || !yearNum) notFound();

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `${year} ${data.zh}年運勢分析`,
              author: { '@type': 'Organization', name: '紫微閣命理顧問團隊' },
              datePublished: new Date().toISOString(),
            }),
          }}
        />

        <header className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">流年運勢</p>
          <h1 className="font-display text-5xl font-semibold mb-3">
            <GoldNumeral value={year} size="display" foil /> 年屬{data.zh}運勢
          </h1>
          <p className="text-[var(--color-fg-muted)] max-w-2xl mx-auto">
            屬{data.zh}者 ({data.years.slice(0, 4).join('、')} 等年份生人) 的{year}年流年走勢。
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 mb-12">
          {[
            { title: '事業運', body: `${data.zh}年${data.element}氣旺, 主有貴人提攜。宜主動接觸新領域, 忌守舊。` },
            { title: '感情運', body: `本年桃花花朵起伏較大, 已婚者宜經營溝通; 單身者宜廣交而謹擇。` },
            { title: '財運', body: `偏財有起色, 但正財仍需腳踏實地。忌大額投資, 宜小額分散。` },
            { title: '健康', body: `${data.element}行旺氣, 須留意對應臟腑保養。睡眠規律為首要。` },
          ].map((sec) => (
            <Card key={sec.title} variant="ink" padding="lg">
              <CardContent>
                <h3 className="font-display text-xl font-semibold mb-3 text-[var(--color-gold-bright)]">{sec.title}</h3>
                <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{sec.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <InkDivider variant="vermilion">本年命理預警</InkDivider>

        <Card variant="gold-rim" padding="xl" className="mb-8">
          <CardContent>
            <p className="text-[var(--color-fg)] leading-relaxed">
              以上為通用流年解析。每個人的命盤不同, {year}年對你的真實衝擊取決於你的命宮、大限與四化。
              紫微閣訂閱版會結合你的個人命盤產生 12 節深度報告 + 全年逐月命理預警。
            </p>
          </CardContent>
        </Card>

        <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
          <CardContent>
            <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">
              想看 {year} 年對你自己的真實影響?
            </h3>
            <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
              30 秒免費排盤, 解鎖個人化流年分析。
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
