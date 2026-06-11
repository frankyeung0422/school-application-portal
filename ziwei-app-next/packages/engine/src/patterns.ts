import {
  EARTHLY_BRANCHES,
  type Chart,
  type EarthlyBranch,
  type Palace,
  type PlacedStar,
} from './types';

/**
 * 格局 (pattern) detection — classical 紫微斗數 structures read off the natal
 * chart. Each rule is the mainstream 全書/三合 definition; school variants are
 * noted inline. Patterns are evidence-carrying so the AI layer can explain
 * WHY a pattern fired instead of just naming it.
 *
 * Requires engine ≥0.4 charts (minor stars placed); rules that reference
 * 祿存/火鈴/空劫 simply never fire on older cached charts.
 */

export type PatternKind = '吉' | '凶' | '中性';

export interface DetectedPattern {
  id: string;
  name: string;
  kind: PatternKind;
  /** 1 (minor) – 5 (chart-defining). */
  weight: 1 | 2 | 3 | 4 | 5;
  description: string;
  /** Star/palace facts that triggered the rule. */
  evidence: string[];
}

const BRIGHT = new Set(['廟', '旺', '得地']);

interface Ctx {
  chart: Chart;
  ming: Palace;
  /** 命宮 + 對宮(遷移) + 三合 (官祿/財帛) — the 三方四正 palaces. */
  sfsz: Palace[];
  /** Palaces adjacent to 命宮 (鄰宮, by branch). */
  neighbors: [Palace, Palace];
  starPalace: Map<string, Palace>;
}

function buildCtx(chart: Chart): Ctx | null {
  const ming = chart.palaces.find((p) => p.isMingong);
  if (!ming) return null;
  const byBranch = new Map<EarthlyBranch, Palace>();
  for (const p of chart.palaces) byBranch.set(p.branch, p);
  const idx = EARTHLY_BRANCHES.indexOf(ming.branch);
  const at = (off: number) => byBranch.get(EARTHLY_BRANCHES[((idx + off) % 12 + 12) % 12])!;
  const starPalace = new Map<string, Palace>();
  for (const p of chart.palaces) for (const s of p.stars) starPalace.set(s.name, p);
  return {
    chart,
    ming,
    sfsz: [ming, at(6), at(4), at(8)],
    neighbors: [at(1), at(-1)],
    starPalace,
  };
}

function inPalace(p: Palace, star: string): PlacedStar | undefined {
  return p.stars.find((s) => s.name === star);
}
function inGroup(group: Palace[], star: string): Palace | undefined {
  return group.find((p) => inPalace(p, star));
}
function isBright(s: PlacedStar | undefined): boolean {
  return !!s?.brightness && BRIGHT.has(s.brightness);
}

/** Detect all supported 格局 on a natal chart, strongest first. */
export function detectPatterns(chart: Chart): DetectedPattern[] {
  const ctx = buildCtx(chart);
  if (!ctx) return [];
  const { ming, sfsz, neighbors, starPalace } = ctx;
  const out: DetectedPattern[] = [];
  const add = (p: DetectedPattern) => out.push(p);

  const mingStar = (name: string) => inPalace(ming, name);

  // ── 吉格 ──────────────────────────────────────────────────────────
  if (mingStar('紫微') && mingStar('天府')) {
    add({
      id: 'zifu-tonggong', name: '紫府同宮', kind: '吉', weight: 5,
      description: '紫微天府同坐命宮（限寅申二宮），帝座與財庫共聚，主貴氣與格局宏大，一生多得提攜。',
      evidence: [`命宮(${ming.branch})見紫微、天府`],
    });
  }

  if (mingStar('紫微')) {
    const helpers = ['左輔', '右弼', '天魁', '天鉞'].filter((s) => inGroup(sfsz, s));
    if (helpers.length >= 2) {
      add({
        id: 'junchen-qinghui', name: '君臣慶會', kind: '吉', weight: 5,
        description: '紫微坐命而輔弼魁鉞於三方四正拱照，君得良臣，主有貴人扶持、可掌權柄。',
        evidence: [`命宮見紫微`, `三方四正會 ${helpers.join('、')}`],
      });
    }
  }

  if (!mingStar('天府') && !mingStar('天相')) {
    const fu = inGroup(sfsz.slice(1), '天府');
    const xiang = inGroup(sfsz.slice(1), '天相');
    if (fu && xiang) {
      add({
        id: 'fuxiang-chaoyuan', name: '府相朝垣', kind: '吉', weight: 4,
        description: '天府天相於三方朝拱命宮，主衣祿豐足、做事有底氣，宜公職或大機構發展。',
        evidence: [`天府在${fu.name}`, `天相在${xiang.name}`],
      });
    }
  }

  const sunP = starPalace.get('太陽');
  const moonP = starPalace.get('太陰');
  if (sunP && moonP) {
    const sun = inPalace(sunP, '太陽')!;
    const moon = inPalace(moonP, '太陰')!;
    if (isBright(sun) && isBright(moon) && sfsz.includes(sunP) && sfsz.includes(moonP)) {
      add({
        id: 'riyue-bingming', name: '日月並明', kind: '吉', weight: 4,
        description: '太陽太陰俱廟旺而同會命垣，陰陽調和，主早發聲名、貴顯雙全。',
        evidence: [`太陽${sun.brightness}在${sunP.name}(${sunP.branch})`, `太陰${moon.brightness}在${moonP.name}(${moonP.branch})`],
      });
    }
    if (sun.brightness === '陷' && moon.brightness === '陷') {
      add({
        id: 'riyue-fanbei', name: '日月反背', kind: '凶', weight: 3,
        description: '太陽太陰俱落陷，主辛勞起家、早年離鄉背井，宜技術立身、晚發。',
        evidence: [`太陽陷在${sunP.branch}`, `太陰陷在${moonP.branch}`],
      });
    }
  }

  if (ming.branch === '卯' && mingStar('太陽')) {
    add({
      id: 'rizhao-leimen', name: '日照雷門', kind: '吉', weight: 4,
      description: '太陽在卯坐命（日出東方），光明顯耀，主貴而有名、早年得志。',
      evidence: ['命宮在卯見太陽'],
    });
  }
  if (ming.branch === '亥' && mingStar('太陰')) {
    add({
      id: 'yuelang-tianmen', name: '月朗天門', kind: '吉', weight: 4,
      description: '太陰在亥坐命（月朗天門），主清貴聰慧、財帛豐盈，得異性與長輩之助。',
      evidence: ['命宮在亥見太陰'],
    });
  }
  if (ming.branch === '未' && sunP?.branch === '卯' && moonP?.branch === '亥') {
    add({
      id: 'mingzhu-chuhai', name: '明珠出海', kind: '吉', weight: 4,
      description: '命安未宮，日卯月亥拱照，明珠出海格，主大器晚成、名利雙收。',
      evidence: ['命宮在未', '太陽在卯、太陰在亥拱照'],
    });
  }

  {
    const four = ['天機', '太陰', '天同', '天梁'].map((s) => inGroup(sfsz, s));
    if (four.every(Boolean)) {
      add({
        id: 'jiyue-tongliang', name: '機月同梁', kind: '中性', weight: 3,
        description: '機月同梁會於三方四正，主謀略細密、宜幕僚文職公教，穩中求進。',
        evidence: four.map((p, i) => `${['天機', '太陰', '天同', '天梁'][i]}在${p!.name}`),
      });
    }
  }

  {
    const sha = inGroup(sfsz, '七殺');
    const po = inGroup(sfsz, '破軍');
    const tan = inGroup(sfsz, '貪狼');
    if (sha && po && tan) {
      add({
        id: 'shapolang', name: '殺破狼', kind: '中性', weight: 3,
        description: '七殺破軍貪狼會於三方四正，一生變動開創之局，敢拚敢闖，成敗起伏大。',
        evidence: [`七殺在${sha.name}`, `破軍在${po.name}`, `貪狼在${tan.name}`],
      });
    }
  }

  if (['寅', '申', '子', '午'].includes(ming.branch) && mingStar('七殺') && isBright(mingStar('七殺'))) {
    add({
      id: 'qisha-chaodou', name: '七殺朝斗', kind: '吉', weight: 4,
      description: '七殺廟旺坐命於四生四敗之地，朝斗仰斗，主威權出眾、宜武職管理，動中得財。',
      evidence: [`命宮在${ming.branch}見七殺${mingStar('七殺')!.brightness}`],
    });
  }

  if (['子', '午'].includes(ming.branch) && mingStar('巨門')) {
    add({
      id: 'shizhong-yinyu', name: '石中隱玉', kind: '吉', weight: 3,
      description: '巨門在子午坐命，石中隱玉格，主才華內蘊、以口才專業立身，中晚年顯達。',
      evidence: [`命宮在${ming.branch}見巨門`],
    });
  }

  {
    const need = ['太陽', '天梁', '文昌', '祿存'];
    const hit = need.map((s) => inGroup(sfsz, s));
    if (hit.every(Boolean)) {
      add({
        id: 'yangliang-changlu', name: '陽梁昌祿', kind: '吉', weight: 4,
        description: '太陽天梁文昌祿存會於三方四正，科甲之格，主考運極佳，宜學術、考試、專業資格進身。',
        evidence: need.map((s, i) => `${s}在${hit[i]!.name}`),
      });
    }
  }

  {
    const tanP = starPalace.get('貪狼');
    if (tanP) {
      const huo = inPalace(tanP, '火星');
      const ling = inPalace(tanP, '鈴星');
      if (huo || ling) {
        add({
          id: huo ? 'huotan' : 'lingtan', name: huo ? '火貪格' : '鈴貪格', kind: '吉', weight: 4,
          description: `貪狼與${huo ? '火星' : '鈴星'}同宮，橫發之格，主突來的機遇與爆發力，但須防橫發橫破。`,
          evidence: [`貪狼與${huo ? '火星' : '鈴星'}同在${tanP.name}(${tanP.branch})`],
        });
      }
    }
  }

  {
    const maP = starPalace.get('天馬');
    if (maP && sfsz.includes(maP)) {
      const luCunHere = inPalace(maP, '祿存');
      const huaLuHere = maP.stars.some((s) => s.transformation === '祿');
      if (luCunHere || huaLuHere) {
        add({
          id: 'luma-jiaochi', name: '祿馬交馳', kind: '吉', weight: 4,
          description: '祿與天馬同宮會命，祿馬交馳，主奔波中進財、遠方得利，宜外地外務發展。',
          evidence: [`${luCunHere ? '祿存' : '化祿'}與天馬同在${maP.name}(${maP.branch})`],
        });
      }
    }
  }

  {
    const luCun = inGroup(sfsz, '祿存');
    const huaLu = sfsz.find((p) => p.stars.some((s) => s.transformation === '祿'));
    if (luCun && huaLu) {
      add({
        id: 'shuanglu-chaoyuan', name: '雙祿朝垣', kind: '吉', weight: 4,
        description: '祿存與化祿俱會命垣，雙祿交流，主財源穩定豐厚、一生衣食無虞。',
        evidence: [`祿存在${luCun.name}`, `化祿在${huaLu.name}`],
      });
    }
  }

  {
    const sanQi = (['祿', '權', '科'] as const).map((h) =>
      sfsz.find((p) => p.stars.some((s) => s.transformation === h)),
    );
    if (sanQi.every(Boolean)) {
      add({
        id: 'sanqi-jiahui', name: '三奇加會', kind: '吉', weight: 5,
        description: '化祿化權化科齊會命宮三方四正，三奇加會，主際遇非凡、能成大事，名利權三全。',
        evidence: (['祿', '權', '科'] as const).map((h, i) => `化${h}在${sanQi[i]!.name}`),
      });
    }
  }

  // 夾宮 patterns — the two palaces adjacent to 命宮.
  const [n1, n2] = neighbors;
  const pairIn = (a: string, b: string) =>
    (inPalace(n1, a) && inPalace(n2, b)) || (inPalace(n1, b) && inPalace(n2, a));

  if (pairIn('左輔', '右弼')) {
    add({
      id: 'zuoyou-jiaming', name: '左右夾命', kind: '吉', weight: 3,
      description: '左輔右弼夾命，貴人左右相扶，主一生多助力、處事得體。',
      evidence: [`鄰宮${n1.branch}/${n2.branch}見左輔、右弼`],
    });
  }
  if (pairIn('天魁', '天鉞')) {
    add({
      id: 'kuiyue-jiaming', name: '魁鉞夾命', kind: '吉', weight: 3,
      description: '天魁天鉞夾命，貴人夾持，主逢凶化吉、機會臨門時必有人引薦。',
      evidence: [`鄰宮${n1.branch}/${n2.branch}見天魁、天鉞`],
    });
  }
  if (pairIn('擎羊', '陀羅') && ming.stars.some((s) => s.transformation === '忌')) {
    add({
      id: 'yangtuo-jiaji', name: '羊陀夾忌', kind: '凶', weight: 5,
      description: '化忌坐命而擎羊陀羅相夾，敗局也，主進退維谷、易招小人是非與財困，行事務必保守。',
      evidence: [
        `命宮見${ming.stars.find((s) => s.transformation === '忌')!.name}化忌`,
        `鄰宮${n1.branch}/${n2.branch}見擎羊、陀羅`,
      ],
    });
  }
  if (pairIn('火星', '鈴星')) {
    add({
      id: 'huoling-jiaming', name: '火鈴夾命', kind: '凶', weight: 4,
      description: '火星鈴星夾命，主性急多衝突、環境逼迫，一生防意外與急禍（貪狼坐命則反主奇格）。',
      evidence: [`鄰宮${n1.branch}/${n2.branch}見火星、鈴星`],
    });
  }
  if (pairIn('地空', '地劫') || (mingStar('地空') && mingStar('地劫'))) {
    add({
      id: 'kongjie-jiaming', name: '空劫夾命', kind: '凶', weight: 4,
      description: '地空地劫夾命（或同坐命垣），主財來財去、理想多於現實，宜技術與精神領域立身，忌投機。',
      evidence: [mingStar('地空') && mingStar('地劫') ? `命宮同見地空、地劫` : `鄰宮${n1.branch}/${n2.branch}見地空、地劫`],
    });
  }

  if (ming.branch === '午' && mingStar('擎羊')) {
    add({
      id: 'matou-daijian', name: '馬頭帶箭', kind: '中性', weight: 3,
      description: '擎羊坐命於午，馬頭帶箭格，主威鎮他鄉、宜武職外勤，但起伏激烈，不發少年。',
      evidence: ['命宮在午見擎羊'],
    });
  }

  const MAIN_14 = new Set([
    '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
    '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  ]);
  if (!ming.stars.some((s) => MAIN_14.has(s.name))) {
    add({
      id: 'ming-wu-zhengyao', name: '命無正曜', kind: '中性', weight: 2,
      description: '命宮無十四正星，借對宮（遷移）星曜安命論之，主環境影響大、人生可塑性強。',
      evidence: [`命宮(${ming.branch})無主星，借${sfsz[1].name}星曜`],
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}
