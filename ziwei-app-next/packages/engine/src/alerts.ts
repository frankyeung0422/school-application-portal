/**
 * Rule-based ziwei alert engine. Ported from the legacy ziwei-app server's
 * alertSystem.js (~490 LOC of hand-curated rules from 紫雲派 practitioners).
 * Pure: takes a computed Chart, returns Alert[] sorted by severity desc.
 */

import type { Chart, Palace, PlacedStar } from './types';
import { EARTHLY_BRANCHES } from './types';
import { CLASH_PAIRS, PUNISHMENT_GROUPS, HARM_PAIRS } from './branch-relations';
import { detectPatterns } from './patterns';
import { decadeAtYear } from './decade-luck';
import { minorLimitAtYear } from './minor-limit';

export type AlertType = 'health' | 'accident' | 'financial' | 'relationship' | 'career' | 'legal';

export interface ZiweiAlert {
  id: string;
  type: AlertType;
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  palace: string;
  stars: string[];
  period: string;
  recommendations: string[];
}

// Branch order for 太歲 naming — canonical, shared with branch-relations indices.
const BRANCHES = EARTHLY_BRANCHES;

function hasStar(stars: PlacedStar[], name: string): boolean {
  return stars.some((s) => s.name === name);
}
function starHasHuaJi(stars: PlacedStar[], name: string): boolean {
  return stars.some((s) => s.name === name && s.transformation === '忌');
}
function hasHuaJiAny(stars: PlacedStar[]): boolean {
  return stars.some((s) => s.transformation === '忌');
}
function hasHuaLuAny(stars: PlacedStar[]): boolean {
  return stars.some((s) => s.transformation === '祿');
}
function maleficsPresent(stars: PlacedStar[]): string[] {
  return (['擎羊', '陀羅', '火星', '鈴星'] as const).filter((m) => hasStar(stars, m));
}

function recommendationsFor(type: AlertType, severity: number): string[] {
  const base: Record<AlertType, string[]> = {
    health: [
      '建議定期進行全面健康檢查',
      '注意飲食均衡, 保持規律作息',
      '適當運動但避免過度勞累',
    ],
    accident: [
      '出行注意交通安全, 遵守交通規則',
      '避免深夜獨自外出',
      '注意居家安全, 檢查電器與門窗',
    ],
    financial: [
      '投資宜保守穩健, 避免高風險投機',
      '做好財務規劃, 建立緊急備用金',
      '避免借貸擔保, 謹防詐騙',
    ],
    relationship: [
      '多與伴侶溝通, 增進彼此了解',
      '遇到分歧時保持耐心, 避免衝動',
      '安排共同活動, 增進感情',
    ],
    legal: [
      '處理合同文件時務必仔細閱讀條款',
      '避免涉入法律糾紛',
      '重要文件建議請律師審閱',
    ],
    career: [
      '職場中保持低調, 避免與上司同事衝突',
      '做好本職工作, 不宜貿然跳槽',
      '注意職場人際關係',
    ],
  };
  const high: Partial<Record<AlertType, string[]>> = {
    health: [
      '務必盡快進行全面體檢, 特別關注相關器官',
      '避免高風險活動和極限運動',
      '可佩戴護身符或平安符以求心安',
    ],
    accident: [
      '駕車時務必格外小心, 避免疲勞駕駛',
      '避免極限運動、高空作業等危險活動',
      '出遠門前檢查車輛狀況, 購買旅行保險',
      '特別注意農曆二、五、八月的安全',
      '可到廟宇祈福、安太歲以求平安',
    ],
    financial: [
      '嚴禁賭博和高風險投機行為',
      '避免大額投資和合夥經營',
      '檢視保險保障是否足夠',
      '避免為他人作保或借貸大額款項',
    ],
    relationship: [
      '如有嚴重感情問題, 建議尋求婚姻諮詢',
      '避免異性曖昧關係, 以免引起誤會',
      '重要決定宜三思而後行',
    ],
  };
  if (severity >= 4 && high[type]) return [...(high[type] as string[]), ...base[type]];
  return base[type];
}

function hash(...parts: string[]): string {
  const s = parts.join('|');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `a_${(h >>> 0).toString(16)}`;
}

interface TaiSuiResult {
  type: '犯太歲' | '沖太歲' | '刑太歲' | '害太歲' | null;
  severity: number;
  description: string | null;
}

function checkTaiSui(birthYear: number, currentYear: number): TaiSuiResult {
  // Year branch index — anchored so 1984 (甲子) maps to branch 0.
  const birthB = ((birthYear - 4) % 12 + 12) % 12;
  const curB = ((currentYear - 4) % 12 + 12) % 12;

  if (birthB === curB) {
    return {
      type: '犯太歲',
      severity: 3,
      description: `今年為本命年 (${BRANCHES[curB]}年), 犯太歲。運勢易有波動, 凡事宜謹慎行事, 避免重大變動。建議安太歲、多行善事以化解。`,
    };
  }
  for (const [a, b] of CLASH_PAIRS) {
    if ((birthB === a && curB === b) || (birthB === b && curB === a)) {
      return {
        type: '沖太歲',
        severity: 4,
        description: `今年生肖與太歲相沖 (${BRANCHES[birthB]}沖${BRANCHES[curB]}), 沖太歲之年變動較大, 易有意外損傷、破財或人事紛爭。宜安太歲、佩戴護身符, 謹慎出行。`,
      };
    }
  }
  for (const g of PUNISHMENT_GROUPS) {
    if (g.includes(birthB) && g.includes(curB) && birthB !== curB) {
      return {
        type: '刑太歲',
        severity: 3,
        description: `今年與太歲形成相刑 (${BRANCHES[birthB]}刑${BRANCHES[curB]}), 刑太歲之年易有口舌是非、官非訴訟或健康問題。宜多忍讓, 避免爭執, 注意法律文件。`,
      };
    }
  }
  for (const [a, b] of HARM_PAIRS) {
    if ((birthB === a && curB === b) || (birthB === b && curB === a)) {
      return {
        type: '害太歲',
        severity: 3,
        description: `今年與太歲形成相害 (${BRANCHES[birthB]}害${BRANCHES[curB]}), 害太歲之年人際關係易生嫌隙, 小人暗中作梗, 健康亦需留意。宜廣結善緣、避免與人交惡。`,
      };
    }
  }
  return { type: null, severity: 0, description: null };
}

/**
 * Scan a computed ziwei Chart for dangerous patterns and return alerts
 * sorted by severity (high → low). Pure function, no IO.
 */
export function analyzeZiweiAlerts(chart: Chart, birthYear: number): ZiweiAlert[] {
  const alerts: ZiweiAlert[] = [];
  const currentYear = new Date().getFullYear();
  const period = `${currentYear}年`;

  const byName = (name: string): Palace | undefined =>
    chart.palaces.find((p) => p.name === name);

  function add(
    type: AlertType,
    severity: 1 | 2 | 3 | 4 | 5,
    title: string,
    description: string,
    palaceName: string,
    stars: string[],
  ): void {
    alerts.push({
      id: hash(type, palaceName, [...stars].sort().join(','), period),
      type, severity, title, description,
      palace: palaceName, stars, period,
      recommendations: recommendationsFor(type, severity),
    });
  }

  // ── Health / accident rules ───────────────────────────────────────
  const ji = byName('疾厄');
  if (ji) {
    const s = ji.stars;
    if (hasStar(s, '擎羊') && hasStar(s, '火星')) {
      if (hasHuaJiAny(s)) {
        add('accident', 5, '嚴重意外傷害警告',
          '疾厄宮中擎羊、火星與化忌同宮, 此為極凶組合, 主急性意外傷害、手術血光之災。流年行經此宮時尤為危險, 務必格外小心。',
          '疾厄', ['擎羊', '火星', '化忌']);
      } else {
        add('accident', 4, '意外傷害風險提醒',
          '疾厄宮中擎羊與火星同宮, 主意外受傷、車禍、燙傷等血光之災風險增加。出行和日常活動需格外留意安全。',
          '疾厄', ['擎羊', '火星']);
      }
    }
    if (starHasHuaJi(s, '破軍') && maleficsPresent(s).length >= 2) {
      add('health', 4, '重大手術風險警告',
        '疾厄宮中破軍化忌與多顆煞星同宮, 主重大手術、嚴重疾病或身體遭受破壞性損傷。建議盡早進行全面體檢, 防患於未然。',
        '疾厄', ['破軍化忌', ...maleficsPresent(s)]);
    }
    if (starHasHuaJi(s, '天機')) {
      add('health', 3, '神經系統與肝臟健康提醒',
        '疾厄宮中天機化忌, 主神經系統疾病、肝膽問題、失眠或精神緊張。宜注意作息規律, 避免過度用腦和精神壓力。',
        '疾厄', ['天機化忌']);
    }
    if (starHasHuaJi(s, '太陰')) {
      add('health', 3, '腎臟與眼睛健康提醒',
        '疾厄宮中太陰化忌, 主腎臟疾病、眼疾、憂鬱症或女性婦科問題。宜注意情緒管理, 定期檢查腎功能和視力。',
        '疾厄', ['太陰化忌']);
    }
    if (starHasHuaJi(s, '太陽')) {
      add('health', 3, '心血管與眼睛健康提醒',
        '疾厄宮中太陽化忌, 主心臟疾病、高血壓、眼疾或頭部問題。宜注意血壓管理, 定期進行心血管檢查。',
        '疾厄', ['太陽化忌']);
    }
    if ((starHasHuaJi(s, '廉貞')) && maleficsPresent(s).length > 0) {
      add('accident', 5, '暴力傷害高危警告',
        `疾厄宮中廉貞化忌與煞星 (${maleficsPresent(s).join('、')}) 同宮, 廉貞化忌為「囚星化忌」, 凶性極強。主暴力傷害、嚴重意外或急症開刀。務必遠離危險場所和衝突。`,
        '疾厄', ['廉貞化忌', ...maleficsPresent(s)]);
    }
  }

  const ming = byName('命宮');
  if (ming) {
    const s = ming.stars;
    if (hasStar(s, '擎羊') && hasStar(s, '火星') && hasHuaJiAny(s)) {
      add('accident', 5, '命宮嚴重凶險警告',
        '命宮中擎羊、火星與化忌會聚, 此為極度危險組合, 主重大意外、急症或災厄。此年需特別謹慎, 避免一切高風險活動。',
        '命宮', ['擎羊', '火星', '化忌']);
    }
    if (starHasHuaJi(s, '廉貞') && maleficsPresent(s).length > 0) {
      add('accident', 5, '命宮暴力傷害高危警告',
        `命宮中廉貞化忌與煞星 (${maleficsPresent(s).join('、')}) 同宮, 主暴力傷害、嚴重意外或急症開刀。務必遠離衝突。`,
        '命宮', ['廉貞化忌', ...maleficsPresent(s)]);
    }
  }

  for (const name of ['命宮', '遷移'] as const) {
    const p = byName(name);
    if (!p) continue;
    if (hasStar(p.stars, '七殺') && hasStar(p.stars, '擎羊') && hasStar(p.stars, '火星')) {
      add('accident', 5, '嚴重意外災厄警告',
        `${name}中七殺、擎羊、火星會聚, 此為「七殺遇煞」極凶格局, 主嚴重車禍、意外事故或暴力傷害。${name === '遷移' ? '遷移宮主出行, 外出務必格外小心。' : '此年運勢凶險, 務必低調行事。'}`,
        name, ['七殺', '擎羊', '火星']);
    }
  }

  // ── Financial rules ──────────────────────────────────────────────
  const cai = byName('財帛');
  if (cai) {
    const s = cai.stars;
    const hasKong = hasStar(s, '地空');
    const hasJie = hasStar(s, '地劫');
    if (hasKong && hasJie) {
      add('financial', 5, '嚴重破產風險警告',
        '財帛宮中地空、地劫同宮, 此為「空劫夾財」極凶格局, 主嚴重財務損失、投資全數虧損甚至破產。絕對避免投機和大額投資。',
        '財帛', ['地空', '地劫']);
    } else if (hasKong) {
      add('financial', 3, '突發財務損失提醒',
        '財帛宮中見地空, 主突發性財務損失、錢財不翼而飛或投資落空。理財宜保守, 避免投機行為。',
        '財帛', ['地空']);
    } else if (hasJie) {
      add('financial', 3, '突發財務損失提醒',
        '財帛宮中見地劫, 主錢財被劫、突然破財或遭遇詐騙。理財宜保守, 避免將大額資金交予他人。',
        '財帛', ['地劫']);
    }
    if (starHasHuaJi(s, '武曲')) {
      add('financial', 4, '嚴重財務阻滯警告',
        '財帛宮中武曲化忌, 武曲為財星, 化忌主財路嚴重受阻、投資虧損、借貸困難。此年理財務必格外謹慎, 不宜進行重大投資。',
        '財帛', ['武曲化忌']);
    }
    if (starHasHuaJi(s, '破軍')) {
      add('financial', 3, '破壞性消費警告',
        '財帛宮中破軍化忌, 主衝動消費、破壞性花費或因變動導致財務損失。宜控制消費欲望, 避免大額衝動購買。',
        '財帛', ['破軍化忌']);
    }
    if (hasHuaLuAny(s) && hasJie) {
      add('financial', 3, '財來財去提醒',
        '財帛宮中化祿與地劫同宮, 主「財來財去」, 雖有進財機會但難以守住, 錢財容易從手中流失。宜做好儲蓄規劃。',
        '財帛', ['化祿', '地劫']);
    }
  }
  const tian = byName('田宅');
  if (tian && hasStar(tian.stars, '地空') && hasStar(tian.stars, '地劫')) {
    add('financial', 5, '不動產重大損失警告',
      '田宅宮中地空、地劫同宮, 主不動產重大損失、房產糾紛或家產敗盡。避免不動產投機, 謹慎處理房產事務。',
      '田宅', ['地空', '地劫']);
  }

  // ── Relationship rules ──────────────────────────────────────────
  const fu = byName('夫妻');
  if (fu) {
    const s = fu.stars;
    const jiStars = s.filter((x) => x.transformation === '忌').map((x) => `${x.name}化忌`);
    if (jiStars.length > 0) {
      add('relationship', 3, '婚姻感情衝突提醒',
        `夫妻宮中見化忌 (${jiStars.join('、')}), 主感情易生摩擦、溝通不暢或第三者介入。宜多包容體諒, 保持良好溝通。`,
        '夫妻', jiStars);
    }
    if (hasStar(s, '廉貞') && hasStar(s, '貪狼')) {
      add('relationship', 3, '桃花外遇風險提醒',
        '夫妻宮中廉貞、貪狼同宮, 此為「桃花星組合」, 主感情生活複雜、容易發生婚外情或三角關係。宜端正感情態度, 避免曖昧。',
        '夫妻', ['廉貞', '貪狼']);
    }
    if (hasStar(s, '破軍')) {
      add('relationship', 2, '婚姻變動提醒',
        '夫妻宮中見破軍, 破軍主變動和破壞, 暗示感情關係中可能經歷較大波折或多次婚姻。宜珍惜現有感情, 避免衝動決定。',
        '夫妻', ['破軍']);
    }
    if (hasStar(s, '擎羊') || hasStar(s, '陀羅')) {
      const sha = hasStar(s, '擎羊') ? '擎羊' : '陀羅';
      add('relationship', 3, '夫妻摩擦加劇提醒',
        `夫妻宮中見${sha}煞星, 主夫妻間容易發生口角爭執、冷戰甚至肢體衝突。宜控制情緒, 遇到分歧時冷靜溝通。`,
        '夫妻', [sha]);
    }
  }

  // ── 凶格 from the pattern engine (羊陀夾忌 / 火鈴夾命 / 空劫夾命 …) ──
  const XIONG_PATTERN_TYPE: Record<string, AlertType> = {
    'yangtuo-jiaji': 'financial',
    'huoling-jiaming': 'accident',
    'kongjie-jiaming': 'financial',
    'riyue-fanbei': 'career',
  };
  for (const pat of detectPatterns(chart)) {
    if (pat.kind !== '凶') continue;
    const type = XIONG_PATTERN_TYPE[pat.id] ?? 'health';
    add(type, pat.weight as 1|2|3|4|5, `${pat.name} — 本命凶格`,
      `${pat.description} 依據: ${pat.evidence.join('；')}。此為本命結構性格局，宜長期以對應策略化解，而非單一年份之憂。`,
      '命宮', [pat.name]);
  }

  // ── 大限忌 — the active decade's 限忌 star landing in a sensitive natal palace ──
  if (chart.decades?.length) {
    const decade = decadeAtYear(chart.decades, birthYear, currentYear);
    if (decade) {
      const jiStar = decade.transformations.忌;
      const hostPalace = chart.palaces.find((p) => p.stars.some((s) => s.name === jiStar));
      const DECADE_JI_TYPE: Record<string, AlertType> = {
        疾厄: 'health', 命宮: 'health', 財帛: 'financial', 夫妻: 'relationship', 官祿: 'career', 遷移: 'accident',
      };
      const type = hostPalace ? DECADE_JI_TYPE[hostPalace.name] : undefined;
      if (hostPalace && type) {
        add(type, 3, `大限忌入${hostPalace.name} — ${decade.startAge}-${decade.endAge}歲大限`,
          `現行大限（${decade.startAge}-${decade.endAge}歲，行${decade.palaceName}宮）限忌為${jiStar}，落於本命${hostPalace.name}。這十年間${hostPalace.name}所主之事多有阻滯反覆，宜以十年為期布局化解，不宜急進。`,
          hostPalace.name, [`限忌${jiStar}`]);
      }
    }
  }

  // ── Tai Sui clash for the current civil year ────────────────────
  const t = checkTaiSui(birthYear, currentYear);
  if (t.type && t.description) {
    add(
      t.severity >= 4 ? 'accident' : 'health',
      Math.max(1, Math.min(5, t.severity)) as 1|2|3|4|5,
      `${t.type} — ${currentYear}年太歲警告`,
      t.description,
      '太歲', [t.type],
    );
  }

  // Dedupe by id (keep highest severity if collision).
  const dedup = new Map<string, ZiweiAlert>();
  for (const a of alerts) {
    const cur = dedup.get(a.id);
    if (!cur || a.severity > cur.severity) dedup.set(a.id, a);
  }
  return [...dedup.values()].sort((a, b) => b.severity - a.severity);
}

// ── Scoped, multi-system period alerts ──────────────────────────────
//
// `analyzeZiweiAlerts` above stays the natal/this-year ziwei analyzer (unchanged).
// `analyzeAlerts` adds PERIOD-DELTA alerts across all three systems for a given
// day/month/year, drawing on the TransitSnapshot. The period is folded into the
// alert id so the same pattern dedups within a period but re-fires in the next.

import type { BaziChart } from './bazi';
import type { QizhengChart } from './qizheng';
import type { TransitSnapshot } from './transits';

export type AlertScope = 'natal' | 'year' | 'month' | 'day';
export type AlertSystem = 'ziwei' | 'bazi' | 'qizheng' | 'cross';

export interface ScopedAlert extends ZiweiAlert {
  scope: AlertScope;
  system: AlertSystem;
}

export interface AnalyzeAlertsInput {
  ziwei: Chart;
  bazi: BaziChart;
  qizheng: QizhengChart;
  birthYear: number;
  scope: AlertScope;
  /** Required for year/month/day; carries the periodKey + flow signals. */
  snapshot?: TransitSnapshot;
}

const PALACE_ALERT_TYPE: Record<string, AlertType> = {
  疾厄: 'health',
  命宮: 'health',
  財帛: 'financial',
  夫妻: 'relationship',
};

// Transiting malefic → the life area it threatens when it hits a sensitive point.
const MALEFIC_ALERT_TYPE: Record<string, AlertType> = {
  火: 'accident',
  土: 'health',
  羅睺: 'health',
  計都: 'health',
  月孛: 'relationship',
};

/**
 * Period-delta alerts across 紫微 + 八字 + 果老 for the snapshot's period.
 * For scope='natal' it delegates to `analyzeZiweiAlerts` (tagged as ScopedAlert).
 */
export function analyzeAlerts(input: AnalyzeAlertsInput): ScopedAlert[] {
  const { scope, snapshot } = input;

  if (scope === 'natal') {
    return analyzeZiweiAlerts(input.ziwei, input.birthYear).map((a) => ({
      ...a,
      scope: 'natal' as const,
      system: 'ziwei' as const,
    }));
  }
  if (!snapshot) return [];

  const periodKey = snapshot.periodKey;
  const period = snapshot.periodLabel;
  const out: ScopedAlert[] = [];
  const seen = new Set<string>();
  const typesBySystem = new Map<AlertType, Set<AlertSystem>>();

  const push = (
    system: AlertSystem,
    type: AlertType,
    severity: 1 | 2 | 3 | 4 | 5,
    title: string,
    description: string,
    target: string,
    stars: string[],
  ): void => {
    const id = hash(system, type, target, [...stars].sort().join(','), periodKey);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id, type, severity, title, description,
      palace: target, stars, period,
      recommendations: recommendationsFor(type, severity),
      scope, system,
    });
    if (!typesBySystem.has(type)) typesBySystem.set(type, new Set());
    typesBySystem.get(type)!.add(system);
  };

  // ── 紫微 流忌 onto a sensitive palace (month/day flows carry transforms) ──
  const zf = snapshot.ziwei;
  if ('transformedNatalStars' in zf) {
    for (const ts of zf.transformedNatalStars) {
      if (ts.hua !== '忌') continue;
      const type = PALACE_ALERT_TYPE[ts.palace];
      if (!type) continue;
      const severe = ts.palace === '疾厄' || ts.palace === '命宮';
      push('ziwei', type, severe ? 4 : 3,
        `流忌入${ts.palace} — ${period}`,
        `本期流${ts.star}化忌沖入${ts.palace}宮，主該領域易生波折阻滯。宜謹慎守成，避免在此期間做重大決定。`,
        ts.palace, [`${ts.star}化忌`]);
    }
  }

  // ── 歲限並臨 — 流年 and 小限 land on the same palace (year scope only) ──
  if (scope === 'year' && 'age' in zf && zf.hostPalace) {
    const minor = minorLimitAtYear(input.ziwei, zf.year);
    if (minor && minor.branch === zf.branch) {
      const palaceType = PALACE_ALERT_TYPE[zf.hostPalace.name] ?? 'career';
      push('ziwei', palaceType, 4,
        `歲限並臨${zf.hostPalace.name} — ${period}`,
        `本年流年與小限同入「${zf.hostPalace.name}」（${zf.branch}宮），歲限並臨，該宮所主之事吉凶俱顯、力量加倍。若該宮見煞忌，務必謹慎守成；見吉星則可放手把握。`,
        zf.hostPalace.name, ['歲限並臨']);
    }
  }

  // ── 八字 period 十神壓力 + 沖日支 ──
  const bf = snapshot.bazi;
  const pressureGods = new Set(['七殺', '傷官', '正官']);
  if ('branchRelationToNatal' in bf) {
    if (pressureGods.has(bf.tenGod)) {
      const dayClash = bf.branchRelationToNatal.find((r) => r.pillar === 'day' && r.relation === '沖');
      if (dayClash) {
        const type: AlertType = bf.tenGod === '正官' ? 'legal' : bf.tenGod === '七殺' ? 'career' : 'relationship';
        push('bazi', type, 4,
          `${bf.tenGod}沖日支 — ${period}`,
          `本期天干透${bf.tenGod}、地支${bf.branch}沖本命日支，主自身或配偶宮受剋，壓力陡增、易有口舌官非或健康耗損。宜低調退守。`,
          '日柱', [bf.tenGod, `${bf.branch}沖日支`]);
      }
    }
    const wealthClash = bf.branchRelationToNatal.find(
      (r) => (r.relation === '沖' || r.relation === '刑') && r.pillar !== 'day',
    );
    if (wealthClash && (bf.tenGod === '偏財' || bf.tenGod === '正財')) {
      push('bazi', 'financial', 3,
        `財星受沖 — ${period}`,
        `本期財星逢${wealthClash.relation}，主財務波動、進出失衡。理財宜保守，避免大額投機與借貸擔保。`,
        `${wealthClash.pillar}柱`, [bf.tenGod, wealthClash.relation]);
    }
  } else if (pressureGods.has(bf.yearTenGod)) {
    // year scope — lighter, no branch-relation detail
    push('bazi', bf.yearTenGod === '正官' ? 'legal' : 'career', 2,
      `流年${bf.yearTenGod} — ${period}`,
      `本年行${bf.yearTenGod}運，事業職場壓力較大，宜守成務實、避免冒進與正面衝突。`,
      '流年', [bf.yearTenGod]);
  }

  // ── 果老 凶曜行運沖剋命度 / 命主 ──
  for (const a of snapshot.qizheng.aspects) {
    if (!a.malefic || !a.applying) continue;
    if (a.orbDeg > 2) continue;
    if (a.kind !== '合' && a.kind !== '沖' && a.kind !== '刑') continue;
    if (a.natal !== '命度' && a.natal !== '命主') continue;
    const type = MALEFIC_ALERT_TYPE[a.transiting] ?? 'health';
    const severity: 1 | 2 | 3 | 4 | 5 = a.orbDeg < 0.5 && a.kind === '沖' ? 5 : 4;
    push('qizheng', type, severity,
      `${a.transiting}${a.kind}${a.natal} — ${period}`,
      `本期${a.transiting}行運以${a.kind}（誤差${a.orbDeg}°、入相）加臨本命${a.natal}，凶曜剋身之象，主${type === 'accident' ? '意外血光' : type === 'relationship' ? '感情人事波折' : '健康耗損'}。宜避險守身。`,
      a.natal, [`${a.transiting}${a.kind}`]);
  }

  // ── 三盤共識 (cross-system consensus) ──
  for (const [type, systems] of typesBySystem) {
    if (systems.size < 2) continue;
    const related = out.filter((o) => o.type === type && o.system !== 'cross');
    const maxSev = Math.max(...related.map((o) => o.severity));
    const severity = Math.min(5, maxSev + 1) as 1 | 2 | 3 | 4 | 5;
    push('cross', type, severity,
      `三盤共示${type === 'health' ? '健康' : type === 'accident' ? '意外' : type === 'financial' ? '財務' : type === 'relationship' ? '感情' : type === 'career' ? '事業' : '官非'}警示 — ${period}`,
      `紫微、八字、果老中有 ${systems.size} 盤於本期同示「${type}」方向之警訊，為高信度共識訊號，務必格外留意。`,
      '三盤合參', [...systems].filter((s) => s !== 'cross'));
  }

  return out.sort((a, b) => b.severity - a.severity);
}
