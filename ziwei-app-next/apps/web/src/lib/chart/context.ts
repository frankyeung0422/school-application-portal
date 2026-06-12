import type { Chart, BaziChart, QizhengChart, BirthInfo, WuXing, TransitSnapshot } from '@ziwei/engine';
import {
  mangpaiView,
  computeSelfTransformations,
  computeFlyingStars,
  detectPatterns,
  dongweiLimits,
  analyzeCrossSystem,
  traceJiChains,
  decadeOverlay,
  decadeAtYear,
  ziweiYearFlow,
  ganzhiOfYear,
  tenGodVsDayMaster,
  minorLimitAtYear,
  type HeavenlyStem,
} from '@ziwei/engine';
import { deriveArchetype, mingongStarsLine } from './archetype';

/**
 * Shared chart-context builders. Each turns one system's chart into a compact
 * Chinese text block suitable for an LLM system prompt. Used by the unified
 * 三盤合參 synthesis prompt and the cross-system 師傅 chat so all three engines
 * speak the same context language.
 */

const ELEMENT_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];

export function birthSummary(birth: Pick<BirthInfo, 'year' | 'month' | 'day' | 'hour' | 'calendar'>): string {
  return `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;
}

/** 紫微斗數 — 五行局 + 本命主星 + 命格 + 十二宮排佈. */
export function ziweiContext(chart: Chart): string {
  const archetype = deriveArchetype(chart);
  const palaces = chart.palaces
    .map((p) => {
      const stars =
        p.stars.length === 0
          ? '空宮'
          : p.stars
              .map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`)
              .join('、');
      return `${p.name}(${p.branch}${p.ganzhi}${p.isMingong ? ' 命宮' : ''}${p.isShenGong ? ' 身宮' : ''}): ${stars}`;
    })
    .join('\n');
  const lines = [
    `五行局: ${chart.bureau.bureau}`,
    `年柱: ${chart.yearGanzhi}`,
    `本命主星: ${mingongStarsLine(chart)}`,
    ...(chart.mingLord ? [`命主: ${chart.mingLord}　身主: ${chart.shenLord}`] : []),
    `命格: ${archetype.label} — ${archetype.tagline}`,
    `十二宮:`,
    palaces,
  ];

  // 大限 — engine ≥0.4 charts carry decades; older cached charts don't.
  if (chart.decades?.length) {
    const decadeLines = chart.decades
      .slice(0, 9)
      .map((d) => {
        const startYear = chart.birthInfo.year + d.startAge - 1;
        const t = d.transformations;
        return `第${d.index}限 ${d.startAge}-${d.endAge}歲(${startYear}年起) 行${d.palaceName}(${d.stem}${d.branch}) 限四化: 祿${t.祿} 權${t.權} 科${t.科} 忌${t.忌}`;
      })
      .join('\n');
    lines.push('大限:', decadeLines);
  }

  // 格局 — classical patterns with evidence (strongest first).
  const patterns = detectPatterns(chart);
  if (patterns.length) {
    lines.push(`格局: ${patterns.map((p) => `${p.name}(${p.kind}) — ${p.evidence.join('，')}`).join('；')}`);
  }

  // 飛星層 — 自化 + 各宮化忌飛向 (北派 reading hooks for the LLM).
  const selfTrans = computeSelfTransformations(chart);
  if (selfTrans.length) {
    lines.push(`自化: ${selfTrans.map((s) => `${s.palace}${s.kind}自化${s.hua}(${s.star})`).join('、')}`);
  }
  const jiFlights = computeFlyingStars(chart).filter((f) => f.hua === '忌' && f.toPalace);
  if (jiFlights.length) {
    lines.push(`各宮化忌飛向: ${jiFlights.map((f) => `${f.fromPalace}忌入${f.toPalace}(${f.star})`).join('、')}`);
  }

  // 化忌鏈 — key palaces only (most chains cycle, so filter by origin to stay compact).
  const KEY_CHAIN_STARTS = new Set(['命宮', '夫妻', '財帛', '疾厄', '官祿']);
  const chains = traceJiChains(chart).filter((c) => KEY_CHAIN_STARTS.has(c.start));
  if (chains.length) {
    lines.push(`化忌連環: ${chains.map((c) => c.text).join('；')}`);
  }

  // 現行大限疊宮 — how this decade's palaces stack on the natal chart.
  if (chart.decades?.length) {
    const active = decadeAtYear(chart.decades, chart.birthInfo.year, new Date().getFullYear());
    if (active) {
      const overlay = decadeOverlay(chart, active)
        .filter((o) => ['命宮', '夫妻', '財帛', '官祿', '疾厄'].includes(o.decadePalace))
        .map((o) => `限${o.decadePalace}疊本命${o.natalPalace}`)
        .join('、');
      lines.push(`現行大限 (${active.startAge}-${active.endAge}歲) 疊宮: ${overlay}`);
    }
  }

  return lines.join('\n');
}

/** 八字 — 四柱 + 日主 + 五行分佈 + 大運. */
export function baziContext(chart: BaziChart): string {
  const pillar = (label: string, p: BaziChart['pillars']['year']) =>
    `${label}: ${p.ganzhi} (${p.nayin}${p.stemTenGod && p.stemTenGod !== '日主' ? `, 天干${p.stemTenGod}` : ''}${p.branchTenGods.length ? `, 地支藏${p.branchTenGods.join('、')}` : ''})`;
  const elements = ELEMENT_ORDER.map((e) => `${e}${chart.fiveElements[e]}`).join(' ');
  const luck = chart.luckPillars
    .map((lp) => `${lp.startAge}歲起 ${lp.ganzhi} (${lp.startYear}-${lp.endYear})`)
    .join('; ');
  const lines = [
    pillar('年柱', chart.pillars.year),
    pillar('月柱', chart.pillars.month),
    `日柱: ${chart.pillars.day.ganzhi} (${chart.pillars.day.nayin}) — 日主${chart.dayMaster}${chart.dayMasterElement}`,
    pillar('時柱', chart.pillars.hour),
    `五行分佈: ${elements} (最旺${chart.dominantElement}, 最弱${chart.weakestElement})`,
    `大運: ${luck}`,
  ];

  // 日主強弱 + 用神 — engine ≥0.2 bazi charts; older cached charts lack it.
  const s = chart.strength;
  if (s) {
    const parts = [
      `月令${s.seasonalState}`,
      s.deLing ? '得令' : '失令',
      s.deDi ? `通根${s.roots}支` : '無根',
      s.deShi ? '得勢' : '失勢',
    ];
    if (s.followerCandidate) parts.push(`疑似${s.followerCandidate}格`);
    lines.push(`日主強弱: ${s.verdict} (${parts.join('、')})`);
    lines.push(`喜用神: ${s.favorableElements.join('、')}　忌神: ${s.unfavorableElements.join('、')}`);
    if (s.climateAdjustment) lines.push(`調候: 宜${s.climateAdjustment.element} — ${s.climateAdjustment.reason}`);
    const voidNote = s.voidPillars.length
      ? ` (${s.voidPillars.map((p) => (p === 'year' ? '年' : p === 'month' ? '月' : '時')).join('、')}支落空亡)`
      : '';
    lines.push(`空亡: ${s.voidBranches.join('、')}${voidNote}`);
  }

  // 神煞 + 胎元/命宮 — engine ≥0.3 bazi charts.
  if (chart.shenSha?.length) {
    const PILLAR_CN = { year: '年', month: '月', day: '日', hour: '時' } as const;
    lines.push(`神煞: ${chart.shenSha.map((h) => `${h.name}(${PILLAR_CN[h.pillar]}柱)`).join('、')}`);
  }
  if (chart.taiYuan || chart.mingGong) {
    lines.push(`胎元: ${chart.taiYuan ?? '—'}　命宮: ${chart.mingGong ?? '—'}`);
  }

  return lines.join('\n');
}

/** 果老星宗 — 命度 + 命主/身主 + 七政四餘廟陷分佈. */
export function qizhengContext(chart: QizhengChart): string {
  const bodies = chart.bodies
    .map(
      (b) =>
        `${b.name}: ${b.sign}座 ${b.mansion}宿${b.degIntoMansion.toFixed(1)}度, ${b.dignity}${b.retrograde ? '(逆行)' : ''}, ${b.houseName}`,
    )
    .join('\n');
  const strong = chart.bodies
    .filter((b) => b.dignity === '廟' || b.dignity === '旺')
    .map((b) => `${b.name}(${b.dignity}於${b.sign})`);
  const weak = chart.bodies
    .filter((b) => b.dignity === '落' || b.dignity === '陷')
    .map((b) => `${b.name}(${b.dignity}於${b.sign})`);
  const lines = [
    `命度: ${chart.ascendant.sign}座 ${chart.ascendant.mansion}宿 ${chart.ascendant.degIntoMansion.toFixed(1)}度`,
    `命主星: ${chart.mingLord}　身主星: ${chart.shenLord}`,
    `廟旺: ${strong.length ? strong.join('、') : '無顯著廟旺'}`,
    `落陷: ${weak.length ? weak.join('、') : '無顯著落陷'}`,
    `七政四餘:`,
    bodies,
  ];

  // 洞微大限 — the 果老 timing ladder (虛歲 spans + 限主 condition).
  try {
    const { chuXianAge, limits } = dongweiLimits(chart);
    const ladder = limits
      .map((l) => `${l.startAge.toFixed(0)}-${l.endAge.toFixed(0)}歲 行${l.houseName}(${l.sign}) 限主${l.limitLord}${l.lordDignity}`)
      .join('；');
    lines.push(`洞微大限 (出限${chuXianAge}歲): ${ladder}`);
  } catch {
    // older cached charts may lack fields the limits need — skip silently
  }

  return lines.join('\n');
}

/** 盲派八字 — 宮位象法 + 主賓體用 + 制化 scaffold (layered on top of 子平 baziContext). */
export function baziMangpaiContext(chart: BaziChart): string {
  const v = mangpaiView(chart);
  const palaces = v.palaces
    .map((p) => {
      const gods = [
        p.stemGod === '日主' ? '日主' : `天干${p.stemGod}`,
        p.branchGods.length ? `地支${p.branchGods.join('、')}` : '',
      ]
        .filter(Boolean)
        .join(', ');
      return `${p.palace}: ${p.ganzhi} (${gods}) — 象${p.hint}`;
    })
    .join('\n');
  const controls = v.controls.length
    ? v.controls.map((c) => `${c.a}支${c.relation}${c.b}支`).join('、')
    : '四支無顯著沖合';
  return [
    `主（體）: 日主${v.host.stem}${v.host.element}, ${v.host.strength}`,
    `提綱（賓/用）: ${v.guest.tenGod ?? '不顯'} — ${v.guest.note}`,
    `宮位象法:`,
    palaces,
    `制化: ${controls}`,
    `盲派提要: ${v.summary}`,
  ].join('\n');
}

export interface SubjectCharts {
  ziwei?: Chart | null;
  bazi?: BaziChart | null;
  qizheng?: QizhengChart | null;
}

/**
 * Var-bag for the unified-synthesis / master-chat-unified prompts. Missing
 * systems render as a short "(未排算)" placeholder so the prompt stays valid.
 */
/**
 * Rolling 流年 timing table (last year + next 8) — 大限/流年落宮/小限/流年十神
 * per year, so the 師傅 can answer "X 年如何" by walking 限→流年→宮 instead of
 * guessing. Needs ziwei (with decades) + bazi.
 */
export function timingTableContext(charts: SubjectCharts): string | null {
  const { ziwei, bazi } = charts;
  if (!ziwei?.decades?.length || !bazi) return null;
  try {
    const birthYear = ziwei.birthInfo.year;
    const startYear = new Date().getFullYear() - 1;
    const lines: string[] = [];
    for (let year = startYear; year < startYear + 10; year++) {
      const gz = ganzhiOfYear(year);
      const zf = ziweiYearFlow(ziwei, year, birthYear);
      const decade = decadeAtYear(ziwei.decades, birthYear, year);
      const minor = minorLimitAtYear(ziwei, year);
      const tg = tenGodVsDayMaster(gz[0] as HeavenlyStem, bazi.dayMaster);
      const flowStars = zf.hostPalace?.stars.map((s) => s.name).slice(0, 4).join('、') || '空宮';
      lines.push(
        `${year}(${gz}): ${decade ? `${decade.palaceName}限/限忌${decade.transformations.忌}；` : ''}流年${zf.hostPalace?.name ?? '—'}[${flowStars}]${minor ? `；小限${minor.palaceName}` : ''}；十神${tg}`,
      );
    }
    return lines.join('\n');
  } catch {
    return null;
  }
}

/** 三盤合參 natal corroboration block — only when all three charts exist. */
export function crossSystemContext(charts: SubjectCharts): string | null {
  if (!charts.ziwei || !charts.bazi || !charts.qizheng) return null;
  try {
    return analyzeCrossSystem(charts.ziwei, charts.bazi, charts.qizheng).summaryText;
  } catch {
    return null; // older cached charts may lack required fields
  }
}

export function buildUnifiedVars(
  charts: SubjectCharts,
  meta: { label: string; gender: 'M' | 'F'; birth: BirthInfo },
): Record<string, string> {
  return {
    label: meta.label,
    gender: meta.gender === 'M' ? '男' : '女',
    birthSummary: birthSummary(meta.birth),
    ziweiContext: charts.ziwei ? ziweiContext(charts.ziwei) : '(未排紫微盤)',
    baziContext: charts.bazi ? baziContext(charts.bazi) : '(未排八字盤)',
    baziMangpai: charts.bazi ? baziMangpaiContext(charts.bazi) : '(未排八字盤)',
    qizhengContext: charts.qizheng ? qizhengContext(charts.qizheng) : '(未排果老盤)',
    crossSystemContext: crossSystemContext(charts) ?? '(三盤未齊，未作合參比對)',
    timingTable: timingTableContext(charts) ?? '(流年表暫缺 — 請依大限與年干支自行推算)',
  };
}

/** 流盤 (transit) context — the period delta layered on top of the natal three charts. */
export function transitContext(snap: TransitSnapshot): string {
  const lines: string[] = [
    `週期: ${snap.periodLabel}　干支: 日${snap.solar.dayGanzhi}／月${snap.solar.monthGanzhi}／年${snap.solar.yearGanzhi}`,
  ];

  // 紫微流盤
  const zf = snap.ziwei;
  if ('transformedNatalStars' in zf) {
    const trans = (['祿', '權', '科', '忌'] as const)
      .map((h) => `${h}→${zf.periodTransformations[h]}`)
      .join(' ');
    const landed = zf.transformedNatalStars.length
      ? zf.transformedNatalStars.map((t) => `${t.star}化${t.hua}坐本命${t.palace}`).join('、')
      : '無主星受流四化牽引';
    lines.push(
      `【紫微流盤】流命宮: ${zf.hostPalace?.name ?? '—'}(${zf.branch})　流四化: ${trans}`,
      `　流曜入本命: ${landed}`,
    );
  } else {
    lines.push(`【紫微流年】流年入「${zf.hostPalace?.name ?? '—'}」宮 (${zf.ganzhi}, ${zf.age}歲)`);
  }

  // 八字流盤
  const bf = snap.bazi;
  if ('branchRelationToNatal' in bf) {
    const rels = bf.branchRelationToNatal.length
      ? bf.branchRelationToNatal.map((r) => `${r.relation}${r.pillar}柱`).join('、')
      : '與本命四柱無沖合';
    lines.push(`【八字流盤】流干支: ${bf.ganzhi}　十神: ${bf.tenGod}　與本命: ${rels}`);
  } else {
    const lp = bf.activeLuckPillar ? `${bf.activeLuckPillar.ganzhi}運` : '無大運資料';
    lines.push(`【八字流年】流年: ${bf.ganzhi}　流年十神: ${bf.yearTenGod}　行運: ${lp}`);
  }

  // 果老行運
  const topAspects = snap.qizheng.aspects.slice(0, 6);
  const aspectLine = topAspects.length
    ? topAspects
        .map(
          (a) =>
            `${a.transiting}${a.kind}${a.natal}(誤差${a.orbDeg}°${a.applying ? '入相' : '出相'}${a.malefic ? '凶' : ''})`,
        )
        .join('、')
    : '本期無緊密交角';
  lines.push(`【果老行運】要角: ${aspectLine}`);
  if (snap.qizheng.ingresses.length) {
    const ing = snap.qizheng.ingresses
      .map((i) => `${i.body}入${i.enteredSign ?? ''}${i.enteredMansion ? i.enteredMansion + '宿' : ''}(行本命${i.natalHouseName})`)
      .join('、');
    lines.push(`　行運換垣: ${ing}`);
  }

  return lines.join('\n');
}

/**
 * Var-bag for the unified-daily/monthly/yearly prompts. The natal three-chart
 * block is the cacheable prefix; `transitContext` + `periodLabel` are the small
 * fresh delta that changes each period.
 */
export function buildTransitVars(
  charts: SubjectCharts,
  snap: TransitSnapshot,
  meta: { label: string; gender: 'M' | 'F'; birth: BirthInfo },
): Record<string, string> {
  return {
    ...buildUnifiedVars(charts, meta),
    scope: snap.scope === 'day' ? '日' : snap.scope === 'month' ? '月' : '年',
    periodLabel: snap.periodLabel,
    transitContext: transitContext(snap),
  };
}

/** Single combined context block, used as the cacheable chat system prefix. */
export function unifiedContextBlock(charts: SubjectCharts): string {
  const cross = crossSystemContext(charts);
  return [
    '## 紫微斗數盤',
    charts.ziwei ? ziweiContext(charts.ziwei) : '(未排紫微盤)',
    '',
    '## 八字盤',
    charts.bazi ? baziContext(charts.bazi) : '(未排八字盤)',
    '',
    '## 果老星宗盤',
    charts.qizheng ? qizhengContext(charts.qizheng) : '(未排果老盤)',
    ...(cross ? ['', '## 三盤合參（系統交叉驗證）', cross] : []),
  ].join('\n');
}
