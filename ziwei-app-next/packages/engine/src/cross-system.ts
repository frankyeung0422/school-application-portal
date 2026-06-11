import { EARTHLY_BRANCHES, type Chart, type EarthlyBranch, type Palace } from './types';
import type { BaziChart, WuXing } from './bazi';
import type { QizhengChart } from './qizheng';
import { branchRelation } from './branch-relations';

/**
 * 三盤合參 (cross-system corroboration) — the natal-level agreement analysis
 * practitioners actually perform when they hold 紫微/八字/果老 for the same
 * person: each system votes independently per life domain, and confidence
 * comes from agreement, not from any single chart.
 *
 * Practitioner heuristic encoded here (see 命理合參 literature): 三盤皆穩 ⇒
 * 放心; 一盤不穩 ⇒ 提點; 兩盤以上同示弱象 ⇒ 高信度警訊. The alert engine does
 * this for PERIOD deltas; this module does it for the NATAL baseline and is
 * fed to the AI 師傅 so its synthesis follows the same logic.
 */

export type SignalLevel = '穩' | '平' | '弱';

export interface SystemSignal {
  system: '紫微' | '八字' | '果老';
  level: SignalLevel;
  reason: string;
}

export interface DomainReading {
  domain: '元氣' | '財富' | '感情' | '健康';
  signals: SystemSignal[];
  /** Systems voting 弱. */
  strainCount: number;
  verdict: '穩定' | '留意' | '高信度警訊';
}

export interface ElementHarmony {
  baziFavorable: WuXing[];
  bureauElement: WuXing;
  bureauAligned: boolean | null;
  mingLordElement: WuXing | null;
  mingLordAligned: boolean | null;
  summary: string;
}

export interface CrossSystemReading {
  domains: DomainReading[];
  elementHarmony: ElementHarmony;
  /** Compact Chinese block for LLM prompts. */
  summaryText: string;
}

const ZIWEI_MALEFICS = new Set(['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫']);
const QIZHENG_MALEFICS = new Set(['火', '土', '羅睺', '計都', '月孛']);

const BUREAU_ELEMENT: Record<string, WuXing> = {
  水二局: '水', 木三局: '木', 金四局: '金', 土五局: '土', 火六局: '火',
};
/** 七政 → 五行 (日為太陽火、月為太陰水 by convention). */
const GOVERNOR_ELEMENT: Record<string, WuXing> = {
  日: '火', 月: '水', 火: '火', 水: '水', 木: '木', 金: '金', 土: '土',
};

function maleficLoad(p: Palace | undefined): { count: number; names: string[] } {
  if (!p) return { count: 0, names: [] };
  const names: string[] = p.stars.filter((s) => ZIWEI_MALEFICS.has(s.name)).map((s) => s.name);
  if (p.stars.some((s) => s.transformation === '忌')) names.push('化忌');
  return { count: names.length, names };
}

function levelFromCount(count: number, weakAt: number): SignalLevel {
  if (count >= weakAt) return '弱';
  if (count >= 1) return '平';
  return '穩';
}

function verdictOf(signals: SystemSignal[]): DomainReading['verdict'] {
  const strain = signals.filter((s) => s.level === '弱').length;
  if (strain >= 2) return '高信度警訊';
  if (strain === 1 || signals.filter((s) => s.level === '平').length >= 2) return '留意';
  return '穩定';
}

function palaceOf(chart: Chart, name: string): Palace | undefined {
  return chart.palaces.find((p) => p.name === name);
}
function qiHouse(chart: QizhengChart, name: string) {
  return chart.houses.find((h) => h.name === name);
}
function qiHouseMalefics(chart: QizhengChart, name: string): string[] {
  return (qiHouse(chart, name)?.bodies ?? []).filter((b) => QIZHENG_MALEFICS.has(b));
}

export function analyzeCrossSystem(
  ziwei: Chart,
  bazi: BaziChart,
  qizheng: QizhengChart,
): CrossSystemReading {
  const domains: DomainReading[] = [];

  // ── 元氣 (overall vitality / self) ────────────────────────────────
  {
    const ming = palaceOf(ziwei, '命宮');
    const load = maleficLoad(ming);
    const ziweiSignal: SystemSignal = {
      system: '紫微',
      level: levelFromCount(load.count, 3),
      reason: load.count ? `命宮見${load.names.join('、')}` : '命宮無煞忌',
    };

    const s = bazi.strength;
    const baziSignal: SystemSignal = s
      ? {
          system: '八字',
          level: s.verdict === '弱' || s.followerCandidate === '從弱' ? '弱' : s.verdict === '偏弱' ? '平' : '穩',
          reason: `日主${s.verdict}${s.deLing ? '、得令' : '、失令'}${s.deDi ? '' : '、無根'}`,
        }
      : { system: '八字', level: '平', reason: '舊版盤無強弱資料' };

    const lord = qizheng.bodies.find((b) => b.name === qizheng.mingLord);
    const qiSignal: SystemSignal = {
      system: '果老',
      level: lord ? (lord.dignity === '陷' || lord.dignity === '落' ? '弱' : lord.dignity === '廟' || lord.dignity === '旺' ? '穩' : '平') : '平',
      reason: lord ? `命主${qizheng.mingLord}${lord.dignity}於${lord.sign}` : '命主無定位',
    };

    const signals = [ziweiSignal, baziSignal, qiSignal];
    domains.push({ domain: '元氣', signals, strainCount: signals.filter((x) => x.level === '弱').length, verdict: verdictOf(signals) });
  }

  // ── 財富 ──────────────────────────────────────────────────────────
  {
    const cai = palaceOf(ziwei, '財帛');
    const load = maleficLoad(cai);
    const kongJie = cai ? cai.stars.filter((x) => x.name === '地空' || x.name === '地劫').length : 0;
    const ziweiSignal: SystemSignal = {
      system: '紫微',
      level: kongJie >= 2 ? '弱' : levelFromCount(load.count, 2),
      reason: load.count ? `財帛宮見${load.names.join('、')}` : '財帛宮無煞忌',
    };

    const s = bazi.strength;
    const caiXing = [bazi.pillars.year, bazi.pillars.month, bazi.pillars.hour]
      .filter((p) => p.stemTenGod === '正財' || p.stemTenGod === '偏財').length;
    const weakWithWealth = s && (s.verdict === '弱' || s.verdict === '偏弱') && caiXing >= 2;
    const baziSignal: SystemSignal = {
      system: '八字',
      level: weakWithWealth ? '弱' : '穩',
      reason: weakWithWealth ? `財多身${s!.verdict}（財多身弱，富屋貧人之象）` : caiXing ? `財星${caiXing}透，身堪任財` : '財星不透，財際遇平順',
    };

    const mal = qiHouseMalefics(qizheng, '財帛');
    const qiSignal: SystemSignal = {
      system: '果老',
      level: mal.length >= 2 ? '弱' : mal.length ? '平' : '穩',
      reason: mal.length ? `財帛宮見${mal.join('、')}` : '財帛宮無凶曜',
    };

    const signals = [ziweiSignal, baziSignal, qiSignal];
    domains.push({ domain: '財富', signals, strainCount: signals.filter((x) => x.level === '弱').length, verdict: verdictOf(signals) });
  }

  // ── 感情 ──────────────────────────────────────────────────────────
  {
    const fu = palaceOf(ziwei, '夫妻');
    const load = maleficLoad(fu);
    const ziweiSignal: SystemSignal = {
      system: '紫微',
      level: levelFromCount(load.count, 2),
      reason: load.count ? `夫妻宮見${load.names.join('、')}` : '夫妻宮無煞忌',
    };

    // 配偶宮 = 日支; clash/punish/harm from any other natal branch strains it,
    // and a day branch sitting on 空亡 hollows it.
    const dayBranch = bazi.pillars.day.branch;
    const others: EarthlyBranch[] = [bazi.pillars.year.branch, bazi.pillars.month.branch, bazi.pillars.hour.branch];
    const strains = others
      .map((b) => ({ b, rel: branchRelation(dayBranch, b) }))
      .filter((x) => x.rel === '沖' || x.rel === '刑' || x.rel === '害');
    const dayVoid = bazi.strength?.voidBranches.includes(dayBranch) ?? false;
    const baziSignal: SystemSignal = {
      system: '八字',
      level: strains.length && dayVoid ? '弱' : strains.length || dayVoid ? '平' : '穩',
      reason: strains.length
        ? `日支${dayBranch}逢${strains.map((x) => `${x.b}${x.rel}`).join('、')}${dayVoid ? '，且坐空亡' : ''}`
        : dayVoid ? `日支${dayBranch}坐空亡` : '配偶宮安穩',
    };

    const mal = qiHouseMalefics(qizheng, '夫妻');
    const qiSignal: SystemSignal = {
      system: '果老',
      level: mal.length >= 2 ? '弱' : mal.length ? '平' : '穩',
      reason: mal.length ? `夫妻宮見${mal.join('、')}` : '夫妻宮無凶曜',
    };

    const signals = [ziweiSignal, baziSignal, qiSignal];
    domains.push({ domain: '感情', signals, strainCount: signals.filter((x) => x.level === '弱').length, verdict: verdictOf(signals) });
  }

  // ── 健康 ──────────────────────────────────────────────────────────
  {
    const ji = palaceOf(ziwei, '疾厄');
    const load = maleficLoad(ji);
    const ziweiSignal: SystemSignal = {
      system: '紫微',
      level: levelFromCount(load.count, 2),
      reason: load.count ? `疾厄宮見${load.names.join('、')}` : '疾厄宮無煞忌',
    };

    const s = bazi.strength;
    const baziSignal: SystemSignal = s
      ? {
          system: '八字',
          level: s.verdict === '弱' ? '弱' : s.verdict === '偏弱' ? '平' : '穩',
          reason: s.verdict === '弱' || s.verdict === '偏弱' ? `日主${s.verdict}，抗耗能力較低` : '日主有力，底氣足',
        }
      : { system: '八字', level: '平', reason: '舊版盤無強弱資料' };

    const mal = qiHouseMalefics(qizheng, '疾厄');
    const qiSignal: SystemSignal = {
      system: '果老',
      level: mal.length >= 2 ? '弱' : mal.length ? '平' : '穩',
      reason: mal.length ? `疾厄宮見${mal.join('、')}` : '疾厄宮無凶曜',
    };

    const signals = [ziweiSignal, baziSignal, qiSignal];
    domains.push({ domain: '健康', signals, strainCount: signals.filter((x) => x.level === '弱').length, verdict: verdictOf(signals) });
  }

  // ── 五行喜忌 harmony across systems ──────────────────────────────
  const favorable = bazi.strength?.favorableElements ?? [];
  const bureauElement = BUREAU_ELEMENT[ziwei.bureau.bureau];
  const mingLordElement = GOVERNOR_ELEMENT[qizheng.mingLord] ?? null;
  const bureauAligned = favorable.length ? favorable.includes(bureauElement) : null;
  const mingLordAligned = favorable.length && mingLordElement ? favorable.includes(mingLordElement) : null;
  const harmonyBits: string[] = [];
  if (bureauAligned !== null) {
    harmonyBits.push(bureauAligned
      ? `紫微${ziwei.bureau.bureau}屬${bureauElement}，正合八字喜用`
      : `紫微${ziwei.bureau.bureau}屬${bureauElement}，非八字喜用（兩盤取向不同，宜以動態行運互補解讀）`);
  }
  if (mingLordAligned !== null && mingLordElement) {
    harmonyBits.push(mingLordAligned
      ? `果老命主${qizheng.mingLord}屬${mingLordElement}，與八字喜用相應`
      : `果老命主${qizheng.mingLord}屬${mingLordElement}，與八字喜用相異`);
  }
  const elementHarmony: ElementHarmony = {
    baziFavorable: favorable,
    bureauElement,
    bureauAligned,
    mingLordElement,
    mingLordAligned,
    summary: harmonyBits.join('；') || '（八字喜用資料不足，未作比對）',
  };

  // ── compact prompt block ─────────────────────────────────────────
  const lines = domains.map((d) => {
    const sig = d.signals.map((x) => `${x.system}${x.level}(${x.reason})`).join('；');
    return `${d.domain}: ${d.verdict} — ${sig}`;
  });
  lines.push(`五行合參: ${elementHarmony.summary}`);
  const summaryText = lines.join('\n');

  return { domains, elementHarmony, summaryText };
}
