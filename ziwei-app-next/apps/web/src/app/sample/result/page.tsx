import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, Button } from '@/components/ui';
import { PalaceCell, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { prisma } from '@/lib/db/prisma';
import { computeChart, ENGINE_VERSION, type Chart, type PlacedStar, type BirthInfo } from '@ziwei/engine';
import { getSession } from '@/lib/auth/session';
import { saveZiweiChartAction } from '@/lib/chart/actions';

export const metadata = {
  title: '你的命盤試讀',
  description: '紫微斗數命盤試讀 — 命宮免費解讀, 完整十二宮位請開啟 7 天試用。',
};

function dbAvailable(): boolean {
  return !(process.env.DATABASE_URL || '').includes('placeholder');
}

interface ResultParams {
  h?: string;
  // Birth-data fallback (Path A — no DB)
  y?: string; m?: string; d?: string; hr?: string; mi?: string;
  g?: string; c?: string;
  save_error?: string;
}

export default async function SampleResultPage({
  searchParams,
}: {
  searchParams: Promise<ResultParams>;
}) {
  const sp = await searchParams;
  if (!sp.h && !sp.y) redirect('/sample');

  let chart: Chart | null = null;

  // 1) Try DB cache (Path B)
  if (sp.h && dbAvailable()) {
    try {
      const cached = await prisma.chartCache.findUnique({ where: { chartHash: sp.h } });
      // Skip stale rows from older engines (no minor stars/大限) — the URL
      // fallback below recomputes with the current engine.
      if (cached && cached.engineVersion === ENGINE_VERSION) chart = cached.chartJson as unknown as Chart;
    } catch (err) {
      console.warn('[sample/result] chart_cache read skipped:', (err as Error).message);
    }
  }

  // 2) Recompute from URL params (Path A or DB miss)
  if (!chart && sp.y) {
    const birth: BirthInfo = {
      year: Number(sp.y),
      month: Number(sp.m ?? 1),
      day: Number(sp.d ?? 1),
      hour: Number(sp.hr ?? 12),
      minute: Number(sp.mi ?? 0),
      gender: (sp.g === 'F' ? 'F' : 'M'),
      calendar: (sp.c === 'lunar' ? 'lunar' : 'solar'),
    };
    chart = computeChart(birth);
  }

  if (!chart) redirect('/sample');

  const mingong = chart.palaces.find((p) => p.isMingong);
  const session = await getSession();
  const birth = chart.birthInfo;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">命盤試讀</p>
          <h1 className="font-display text-4xl font-semibold mb-2">你的紫微斗數命盤</h1>
          <p className="text-[var(--color-fg-muted)] text-sm">
            五行局: <span className="text-[var(--color-gold-bright)]">{chart.bureau.bureau}</span>
            ・年柱: <span className="text-[var(--color-gold-bright)]">{chart.yearGanzhi}</span>
            ・農曆: {chart.lunarDate.year}年{chart.lunarDate.isLeap ? '閏' : ''}{chart.lunarDate.month}月{chart.lunarDate.day}日
          </p>
        </div>

        {/* 12-palace chart in 4×3 grid */}
        <div className="grid grid-cols-4 gap-3 mb-12">
          {chart.palaces.map((p) => (
            <PalaceCell
              key={p.name}
              name={p.name}
              branch={p.branch}
              ganzhi={p.ganzhi}
              stars={p.stars as PlacedStar[]}
              highlight={p.isMingong ? 'mingong' : 'none'}
              locked={!p.isMingong}
            />
          ))}
        </div>

        <InkDivider>命宮深度解讀</InkDivider>

        <Card variant="gold-rim" padding="xl" className="mb-8">
          <CardContent>
            {mingong && (
              <>
                <p className="text-[var(--color-gold-bright)] font-display text-xl mb-3">
                  命宮在 {mingong.branch} (干支 {mingong.ganzhi}) ·{' '}
                  {mingong.stars.length === 0
                    ? '空宮'
                    : mingong.stars.map((s) => s.name).join('、')}
                </p>
                <p className="text-[var(--color-fg)] leading-relaxed mb-4">
                  {mingongInterpretation(mingong.stars as PlacedStar[])}
                </p>
                <p className="text-xs text-[var(--color-fg-subtle)] italic">
                  ※ 此為基於命宮主星之模板解讀。訂閱版採用 Claude Opus 4.7 + 個人化命理顧問提示詞, 結合所有十二宮、四化、流年產生 2,500 字深度報告。
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {session ? (
          <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
            <CardContent>
              <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">
                儲存這張命盤
              </h3>
              <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
                儲存後可隨時查看完整十二宮深度解讀、流年運勢、命理預警。
              </p>
              {sp.save_error && (
                <p className="text-sm text-[var(--color-danger)] mb-3">儲存失敗, 請稍後再試。</p>
              )}
              <form action={saveZiweiChartAction} className="flex flex-col gap-3 max-w-sm mx-auto">
                <input type="hidden" name="year" value={birth.year} />
                <input type="hidden" name="month" value={birth.month} />
                <input type="hidden" name="day" value={birth.day} />
                <input type="hidden" name="hour" value={birth.hour} />
                <input type="hidden" name="minute" value={birth.minute} />
                <input type="hidden" name="gender" value={birth.gender} />
                <input type="hidden" name="calendar" value={birth.calendar} />
                <input
                  type="text"
                  name="label"
                  placeholder="命盤標籤 (選填, 例如「我」、「妻子」)"
                  className="h-11 px-4 rounded-[var(--radius)] bg-[var(--color-bg-deep)] text-[var(--color-fg)] shadow-[var(--shadow-rim-gold)] focus:outline-none focus:shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]"
                />
                <Button type="submit" size="lg" variant="gold">儲存到我的帳戶 →</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
            <CardContent>
              <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">
                解鎖完整命盤 · 7 天免費試用
              </h3>
              <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
                查看其餘十一宮位深度解讀、流年運勢、命理預警, 並可儲存命盤、邀請好友。
              </p>
              <Button asChild size="xl" variant="gold">
                <Link href={`/register?intent=trial${sp.h ? `&chart=${sp.h}` : ''}`}>開始 7 天試用 →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

// Template stub — real interpretations come from AI client in P4.
function mingongInterpretation(stars: PlacedStar[]): string {
  if (stars.length === 0) {
    return '命宮為空宮, 須借對宮 (遷移宮) 的主星推算。空宮人多浮動, 但亦能靈活適應變局。';
  }
  const main = stars[0].name;
  const map: Record<string, string> = {
    紫微: '紫微為帝星, 主貴氣與領導氣質。性格穩重, 不喜輕浮, 一生衣食無憂, 具統御他人之氣度。然帝星亦帶傲氣, 須留意人際間之分寸。',
    天機: '天機主智慧與善變。思緒敏捷, 善於策劃, 但易過於思慮、優柔寡斷。宜從事文化、研究、宗教或軍師類工作。',
    太陽: '太陽主光明、博愛、發散。性格開朗、樂於助人, 在公門事業可發光發熱。然耗能甚速, 須留意眼疾與過勞。',
    武曲: '武曲為財星, 主果決、剛烈、執行力。理財有道, 適合金融、軍警、技藝類事業。然剛烈過甚易孤剋, 須柔濟之。',
    天同: '天同主福氣、享樂、人緣。性情溫和, 善於享受生活, 但需注意過於安逸而失進取心。多得貴人提攜。',
    廉貞: '廉貞為次桃花, 主感情豐富、變化多端。聰明而帶叛逆, 事業多波折但能逢凶化吉。須留意感情糾葛。',
    天府: '天府為庫星, 主財帛、包容、穩重。為人圓融、能聚財蓄福, 適合管理、財務、不動產類事業。一生較少大風大浪。',
    太陰: '太陰主柔、靜、母性、私房。富同理心, 善於照顧他人, 適合教育、醫療、藝術類事業。情緒易陰晴不定, 須留意心理健康。',
    貪狼: '貪狼為桃花、慾望、藝術之星。多才多藝、人際廣闊, 但慾望強烈易迷失。宜從事文藝、社交、業務類工作。',
    巨門: '巨門主口才、辯論、暗藏。能言善道, 適合教學、法律、傳媒類事業。然易招口舌是非, 須慎言。',
    天相: '天相為宰輔之星, 主忠誠、輔助、調和。為人正直、善於協調, 適合幕僚、顧問、公務員。然過於依賴他人決斷。',
    天梁: '天梁主蔭、清高、孤剋。具長者風範、好濟弱扶傾, 適合醫學、宗教、公益事業。然易孤芳自賞。',
    七殺: '七殺為將星, 主衝鋒、變動、開創。膽識過人、能獨當一面, 適合創業、軍警、技術類事業。一生起伏較大。',
    破軍: '破軍為先鋒之星, 主破壞與重建、開創新局。膽大心細、不喜守成, 適合創業、改革、外勤類事業。然耗損多, 須節制。',
  };
  return map[main] ?? `${main}坐命, 為人具其星曜之特質, 詳盡分析請於試用版查看完整解讀。`;
}
