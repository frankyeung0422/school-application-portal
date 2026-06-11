/**
 * 分齡健康預警 — decade-banded health risk timeline derived from natal ziwei chart.
 *
 * Pure function: takes a computed Chart, returns one HealthDecade per age band
 * (0-9, 10-19, ..., 70-79, 80+). Risk areas are mapped from the stars in 疾厄宮
 * and 命宮 via traditional 紫微 health correspondences (心、肝、腎、骨、血光 etc.).
 * Severity escalates in later decades where the chart's 煞星/化忌 accumulation
 * peaks.
 *
 * Intentionally NOT a death-year predictor — frames everything as "stage of life
 * to watch X organ system + take Y precaution," not "you die at year Z."
 */

import type { Chart, StarName, PlacedStar, Palace } from './types';

export interface HealthDecade {
  /** Inclusive age start (0, 10, 20, ..., 80). */
  ageStart: number;
  /** Inclusive age end. 80 maps to "80+". */
  ageEnd: number;
  /** Calendar-year range for this decade. */
  yearStart: number;
  yearEnd: number;
  /** 1=quiet, 2=normal, 3=watch, 4=high concern, 5=critical. */
  severity: 1 | 2 | 3 | 4 | 5;
  /** Short headline summarising the decade. */
  headline: string;
  /** Specific organ systems / disease categories flagged. */
  focusAreas: string[];
  /** Specific star-derived rationale lines (for transparency). */
  rationale: string[];
  /** Practical recommendations for this decade. */
  recommendations: string[];
}

// Star → traditional health correspondence. Multi-school synthesis from
// 紫雲派 / 中州派 — see Bob Yeh / 了無居士 / 紫雲 references.
const STAR_TO_HEALTH: Partial<Record<StarName, string[]>> = {
  紫微: ['脾胃', '整體免疫力'],
  天機: ['神經系統', '肝膽', '失眠焦慮'],
  太陽: ['心血管', '眼睛', '頭痛偏頭痛'],
  武曲: ['呼吸系統', '金屬利器外傷風險', '肺'],
  天同: ['泌尿系統', '腎', '糖尿病風險'],
  廉貞: ['血液循環', '心臟', '婦科 (女性)', '血光意外'],
  天府: ['脾胃', '糖尿病', '消化系統'],
  太陰: ['腎臟', '眼睛', '婦科 (女性)', '情緒障礙'],
  貪狼: ['肝臟', '生殖系統', '酒色之疾'],
  巨門: ['消化系統', '口齒咽喉', '慢性發炎'],
  天相: ['皮膚', '泌尿', '血壓'],
  天梁: ['脾胃', '骨骼關節', '慢性病'],
  七殺: ['急性意外', '骨傷', '手術風險'],
  破軍: ['重大手術', '消耗性疾病', '牙齒'],
  擎羊: ['刀傷血光', '手術', '頭部外傷'],
  陀羅: ['慢性勞損', '骨刺', '舊傷復發'],
  火星: ['燙傷', '高熱急症', '皮膚發炎'],
  鈴星: ['神經緊張', '慢性發炎', '失眠'],
};

// 化忌 amplifies the star's health domain to chronic / severe.
function jiAmplifier(starName: StarName): string {
  return `${starName}化忌 (該星所主之疾患易轉慢性或加重)`;
}

interface ScoreContext {
  /** Per-star contribution map (for severity scoring). */
  malefics: number;
  huaJi: number;
  huaJiStars: StarName[];
  starsPresent: Set<StarName>;
}

function scoreStars(stars: PlacedStar[]): ScoreContext {
  let malefics = 0;
  let huaJi = 0;
  const huaJiStars: StarName[] = [];
  const starsPresent = new Set<StarName>();
  for (const s of stars) {
    starsPresent.add(s.name);
    if (['擎羊', '陀羅', '火星', '鈴星'].includes(s.name)) malefics++;
    if (s.transformation === '忌') {
      huaJi++;
      huaJiStars.push(s.name);
    }
  }
  return { malefics, huaJi, huaJiStars, starsPresent };
}

interface DecadeStage {
  ageStart: number;
  ageEnd: number;
  /** Stage-stage multiplier — chronic disease bias rises with age. */
  stageWeight: number;
  /** Default headline before star-specific override. */
  defaultHeadline: string;
}

const STAGES: DecadeStage[] = [
  { ageStart: 0,  ageEnd: 9,  stageWeight: 1.0, defaultHeadline: '幼年期 — 主要關注生長發育與意外傷害' },
  { ageStart: 10, ageEnd: 19, stageWeight: 1.0, defaultHeadline: '青少年期 — 關注學業壓力、視力與運動傷害' },
  { ageStart: 20, ageEnd: 29, stageWeight: 1.1, defaultHeadline: '青年期 — 關注作息、情緒與意外風險' },
  { ageStart: 30, ageEnd: 39, stageWeight: 1.2, defaultHeadline: '壯年期 — 慢性病種子萌芽,須定期體檢' },
  { ageStart: 40, ageEnd: 49, stageWeight: 1.4, defaultHeadline: '中年期 — 三高、代謝疾病風險上升' },
  { ageStart: 50, ageEnd: 59, stageWeight: 1.6, defaultHeadline: '更年期前後 — 內分泌與心血管須留意' },
  { ageStart: 60, ageEnd: 69, stageWeight: 1.8, defaultHeadline: '初老期 — 慢性病管理為主要任務' },
  { ageStart: 70, ageEnd: 79, stageWeight: 2.0, defaultHeadline: '老年期 — 防跌倒、骨骼與心腦血管' },
  { ageStart: 80, ageEnd: 999, stageWeight: 2.2, defaultHeadline: '高齡期 — 整體機能維護與安寧照顧' },
];

const GENERIC_RECS: Record<number, string[]> = {
  1: ['維持規律作息與均衡飲食', '每年常規健康檢查'],
  2: ['維持規律作息與均衡飲食', '每年常規健康檢查', '注意情緒管理'],
  3: ['每年完整體檢, 包含血液與超聲波', '針對重點器官加做專科檢查', '建立規律運動習慣'],
  4: ['每半年體檢一次, 重點追蹤相關器官', '與專科醫師建立長期關係, 提前篩查', '飲食與作息嚴格控制, 避免高風險行為'],
  5: ['每季專科追蹤, 必要時請家庭醫師統籌', '建立緊急醫療聯絡計畫', '減少獨自進行高風險活動 (駕車長途、登山等)'],
};

function recsByAreas(areas: string[]): string[] {
  // Map specific organ areas to specific actions.
  const map: [string, string][] = [
    ['心血管', '低鹽飲食、控制血壓, 40 歲後做心電圖年檢'],
    ['心臟',   '血壓血脂監測, 必要時心臟超聲'],
    ['肝',     '節制飲酒, 年度肝功能 + 腹部超聲'],
    ['腎',     '飲水充足、避免長期止痛藥, 年度尿檢 + 腎功能'],
    ['眼',     '每兩年眼科檢查, 用眼節制, 太陽下戴墨鏡'],
    ['脾胃',   '少食生冷與油膩, 規律三餐'],
    ['消化',   '飲食定時、忌暴飲暴食, 40 歲後做胃鏡 / 腸鏡'],
    ['骨',     '補鈣 + 維生素 D, 重量訓練維持骨密度'],
    ['呼吸',   '戒菸、避免空污, 流感疫苗每年接種'],
    ['婦科',   '每年子宮頸抹片 + 乳房檢查'],
    ['血光',   '駕車與機械作業特別謹慎, 必要時購買意外險'],
    ['手術',   '事先做家族病史篩查, 避免延遲就醫'],
    ['情緒',   '建立情緒支持系統, 必要時尋求心理諮詢'],
    ['神經',   '規律睡眠 7-8 小時, 限制螢幕時間'],
    ['牙',     '每半年洗牙 + 口腔檢查'],
    ['皮膚',   '防曬 SPF 30+, 定期檢查痣與斑點'],
  ];
  const out: string[] = [];
  for (const [k, v] of map) {
    if (areas.some((a) => a.includes(k))) out.push(v);
  }
  return out;
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * v2: when the chart carries 大限 decades (engine ≥0.4), bands follow the
 * actual 大限 ladder — each decade's severity reflects the malefics/化忌
 * sitting in its 大限宮 plus the 限忌 star's health domain, on top of the
 * natal 疾厄/命宮 baseline. Charts without decades fall back to the fixed
 * 10-year stages.
 */
export function analyzeHealthTimeline(chart: Chart, birthYear: number): HealthDecade[] {
  const ji: Palace | undefined = chart.palaces.find((p) => p.name === '疾厄');
  const ming: Palace | undefined = chart.palaces.find((p) => p.name === '命宮');

  const jiCtx = ji ? scoreStars(ji.stars) : { malefics: 0, huaJi: 0, huaJiStars: [], starsPresent: new Set<StarName>() };
  const mingCtx = ming ? scoreStars(ming.stars) : { malefics: 0, huaJi: 0, huaJiStars: [], starsPresent: new Set<StarName>() };

  // Aggregate the natal "weight" — the more 煞 + 化忌 in 疾厄/命宮, the heavier
  // the lifetime baseline risk.
  const natalBurden = jiCtx.malefics * 1.5 + jiCtx.huaJi * 1.2 + mingCtx.malefics * 0.8 + mingCtx.huaJi * 0.6;

  // Build the focus-area set ONCE from natal stars — every decade inherits it,
  // but severity scales with the stage weight.
  const focusAreasSet = new Set<string>();
  const rationaleLines: string[] = [];
  if (ji) {
    for (const s of ji.stars) {
      const areas = STAR_TO_HEALTH[s.name];
      if (areas) {
        areas.forEach((a) => focusAreasSet.add(a));
        rationaleLines.push(`疾厄宮見${s.name}${s.transformation === '忌' ? '化忌' : ''} → ${areas.join('、')}`);
      }
      if (s.transformation === '忌') {
        rationaleLines.push(jiAmplifier(s.name));
      }
    }
  }
  if (ming) {
    for (const s of ming.stars) {
      if (s.transformation === '忌') {
        const areas = STAR_TO_HEALTH[s.name];
        if (areas) {
          areas.forEach((a) => focusAreasSet.add(a));
          rationaleLines.push(`命宮見${s.name}化忌 → 體質本身偏向${areas.join('、')}方面之不調`);
        }
      }
    }
  }
  const baseFocusAreas = [...focusAreasSet];
  const baseRationale = uniq(rationaleLines);

  // ── v2 path: bands from the actual 大限 ladder ─────────────────────
  if (chart.decades?.length) {
    const byBranch = new Map(chart.palaces.map((p) => [p.branch, p]));
    return chart.decades.map((d, i) => {
      const decadePalace = byBranch.get(d.branch);
      const dCtx = decadePalace ? scoreStars(decadePalace.stars) : { malefics: 0, huaJi: 0, huaJiStars: [], starsPresent: new Set<StarName>() };
      const jiStar = d.transformations.忌 as StarName;
      const jiAreas = STAR_TO_HEALTH[jiStar] ?? [];
      // 限忌 star sitting in natal 疾厄 (or the decade palace itself) is the
      // classical "this decade presses on health" signature.
      const jiInJiE = !!ji?.stars.some((s) => s.name === jiStar);
      const ageWeight = 1 + i * 0.12; // chronic bias still rises with age
      const rawScore = ageWeight + natalBurden * 0.5 + dCtx.malefics * 0.7 + dCtx.huaJi * 0.6 + (jiInJiE ? 0.8 : 0);
      const severity = (Math.max(1, Math.min(5, Math.round(rawScore)))) as 1|2|3|4|5;

      const focusAreas = uniq([...baseFocusAreas, ...(severity >= 3 ? jiAreas : [])]);
      const rationale = uniq([
        ...baseRationale,
        `${d.startAge}-${d.endAge}歲行${d.palaceName}宮(${d.stem}${d.branch})，限忌${jiStar}${jiInJiE ? '，且限忌星正坐本命疾厄' : ''}`,
        ...(dCtx.malefics ? [`大限宮中見煞星${dCtx.malefics}顆`] : []),
      ]);
      const stageRecs = GENERIC_RECS[severity] ?? GENERIC_RECS[3];
      const recommendations = uniq([...recsByAreas(focusAreas), ...stageRecs]).slice(0, 6);
      const headline = severity >= 4
        ? `行${d.palaceName}限 — 健康壓力偏高，留意${(jiAreas[0] ?? focusAreas[0]) ?? '整體狀態'}`
        : `行${d.palaceName}限 — ${severity >= 3 ? '按年體檢、重點追蹤' : '平穩期，維持良好習慣'}`;

      return {
        ageStart: Math.max(0, d.startAge - 1), // 虛歲 → 實歲 approximation
        ageEnd: d.endAge - 1,
        yearStart: birthYear + d.startAge - 1,
        yearEnd: birthYear + d.endAge - 1,
        severity,
        headline,
        focusAreas,
        rationale,
        recommendations,
      };
    });
  }

  // ── legacy fallback: fixed 10-year stages (pre-0.4 cached charts) ──
  const decades: HealthDecade[] = STAGES.map((stage) => {
    // Severity: stage weight × natal burden, clamped to 1-5.
    const rawScore = stage.stageWeight + natalBurden * 0.6;
    const severity = (Math.max(1, Math.min(5, Math.round(rawScore)))) as 1|2|3|4|5;

    const stageRecs = GENERIC_RECS[severity] ?? GENERIC_RECS[3];
    const areaRecs = recsByAreas(baseFocusAreas);
    const recommendations = uniq([...areaRecs, ...stageRecs]).slice(0, 6);

    // Build a stage-specific headline if heavy chart, otherwise the default.
    const heavy = severity >= 4 && baseFocusAreas.length > 0;
    const headline = heavy
      ? `${stage.defaultHeadline} · 須加強留意${baseFocusAreas.slice(0, 2).join('、')}`
      : stage.defaultHeadline;

    return {
      ageStart: stage.ageStart,
      ageEnd: stage.ageEnd,
      yearStart: birthYear + stage.ageStart,
      yearEnd: stage.ageEnd === 999 ? birthYear + 120 : birthYear + stage.ageEnd,
      severity,
      headline,
      focusAreas: baseFocusAreas,
      rationale: baseRationale,
      recommendations,
    };
  });

  return decades;
}
