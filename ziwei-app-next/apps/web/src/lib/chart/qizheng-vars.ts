import type { QizhengChart } from '@ziwei/engine';

/** Build the {{var}} bag for the qizheng-reading prompt from a chart. */
export function buildQizhengReadingVars(chart: QizhengChart): Record<string, string> {
  const bodies = chart.bodies
    .map(
      (b) =>
        `${b.name} / ${b.sign} / ${b.mansion}${b.degIntoMansion.toFixed(1)}度 / ${b.dignity}${b.retrograde ? '(逆)' : ''} / ${b.houseName}`,
    )
    .join('\n');

  const strong = chart.bodies.filter((b) => b.dignity === '廟' || b.dignity === '旺').map((b) => `${b.name}(${b.dignity}於${b.sign})`);
  const weak = chart.bodies.filter((b) => b.dignity === '落' || b.dignity === '陷').map((b) => `${b.name}(${b.dignity}於${b.sign})`);

  return {
    ascSign: chart.ascendant.sign,
    ascMansion: chart.ascendant.mansion,
    ascDeg: chart.ascendant.degIntoMansion.toFixed(1),
    mingLord: chart.mingLord,
    shenLord: chart.shenLord,
    bodies,
    strongBodies: strong.length ? strong.join('、') : '無顯著廟旺',
    weakBodies: weak.length ? weak.join('、') : '無顯著落陷',
    gender: chart.birthInfo.gender === 'M' ? '男' : '女',
  };
}

/**
 * Default upsell preview appended when the model omits it. The free reading
 * must always close with 【完整解讀預告】, but a truncated response (token cap,
 * or a fallback provider returning a short body) can drop the 5th section.
 */
export const FALLBACK_TEASER =
  '完整版將深入解讀行限流年、七政過宮，並與紫微、八字三盤合參，洞悉命運流轉之全貌。';

/**
 * Guarantee the reading ends with a non-empty 【完整解讀預告】 section. Keeps the
 * model's own preview when it wrote a body; otherwise appends a default (and
 * drops a dangling empty header that would render as an empty card). Used by
 * both the saved-chart page and the sample page so the preview always renders.
 */
export function ensureTeaser(text: string): string {
  const m = text.match(/【[^】]*預告[^】]*】([\s\S]*)$/);
  const modelBody = m ? m[1].replace(/【[\s\S]*$/, '').trim() : '';
  if (modelBody) return text;
  const stripped = text.replace(/【[^】]*預告[^】]*】\s*$/, '').trimEnd();
  return `${stripped}\n\n【完整解讀預告】\n${FALLBACK_TEASER}`;
}
