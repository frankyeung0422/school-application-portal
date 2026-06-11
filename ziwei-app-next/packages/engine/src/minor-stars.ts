import {
  EARTHLY_BRANCHES,
  EarthlyBranch,
  HeavenlyStem,
  StarName,
} from './types';

/**
 * Minor star placement — 吉星 (祿存/天魁/天鉞/左輔/右弼/文昌/文曲/天馬) and
 * 煞星 (擎羊/陀羅/火星/鈴星/地空/地劫).
 *
 * Sources: 紫雲《紫微斗數導讀》ch.6 + standard 安星訣 shared across
 * 三合/中州 schools. These 14 placements are school-invariant except 火鈴
 * (some schools fix them by year branch only; we use the dominant
 * year-branch-起點 + 生時順數 rule, same as iztro).
 *
 * The alert engine (alerts.ts) has always keyed rules on 擎羊/火星/地空/地劫
 * etc. — before this module existed those rules could never fire because the
 * stars were never placed.
 */

/** 祿存 by year stem: 甲祿到寅宮, 乙祿居卯府, 丙戊祿在巳, 丁己祿在午, 庚祿定居申, 辛祿酉上補, 壬祿亥中藏, 癸祿居子戶. */
const LU_CUN_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
  己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
};

/** 天魁/天鉞 by year stem: 甲戊庚牛羊, 乙己鼠猴鄉, 丙丁豬雞位, 壬癸兔蛇藏, 六辛逢馬虎. */
const KUI_YUE_BY_STEM: Record<HeavenlyStem, [EarthlyBranch, EarthlyBranch]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};

/** 火星/鈴星 starting branches by year-branch trine: 寅午戌→丑卯, 申子辰→寅戌, 巳酉丑→卯戌, 亥卯未→酉戌. Count forward by hour. */
const HUO_LING_START: Record<EarthlyBranch, [EarthlyBranch, EarthlyBranch]> = {
  寅: ['丑', '卯'], 午: ['丑', '卯'], 戌: ['丑', '卯'],
  申: ['寅', '戌'], 子: ['寅', '戌'], 辰: ['寅', '戌'],
  巳: ['卯', '戌'], 酉: ['卯', '戌'], 丑: ['卯', '戌'],
  亥: ['酉', '戌'], 卯: ['酉', '戌'], 未: ['酉', '戌'],
};

/** 天馬 by year-branch trine: 申子辰馬居寅, 寅午戌馬居申, 巳酉丑馬居亥, 亥卯未馬居巳. */
const TIAN_MA_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  申: '寅', 子: '寅', 辰: '寅',
  寅: '申', 午: '申', 戌: '申',
  巳: '亥', 酉: '亥', 丑: '亥',
  亥: '巳', 卯: '巳', 未: '巳',
};

function at(idx: number): EarthlyBranch {
  return EARTHLY_BRANCHES[((idx % 12) + 12) % 12];
}

export interface MinorStarInput {
  yearStem: HeavenlyStem;
  yearBranch: EarthlyBranch;
  /** Lunar birth month 1-12 (leap months use the host month, as for 命宮). */
  lunarMonth: number;
  /** Hour-branch index: 子=0 … 亥=11. Same derivation as 命宮 (early 子時 counts as 子). */
  hourBranchIndex: number;
}

/**
 * Place the 14 standard minor stars. Returns star → branch.
 *
 * 安星訣 implemented:
 *  - 祿存 by year stem; 擎羊 = 祿存前一宮(順), 陀羅 = 祿存後一宮(逆)
 *  - 天魁/天鉞 by year stem (貴人訣)
 *  - 文昌: 戌宮起子時逆數到生時; 文曲: 辰宮起子時順數
 *  - 左輔: 辰宮起正月順數到生月; 右弼: 戌宮起正月逆數
 *  - 地劫: 亥宮起子時順數; 地空: 亥宮起子時逆數
 *  - 火星/鈴星: 年支三合起點, 子時起順數到生時
 *  - 天馬: 年支三合對驛馬位
 */
export function placeMinorStars(input: MinorStarInput): Map<StarName, EarthlyBranch> {
  const { yearStem, yearBranch, lunarMonth, hourBranchIndex: h } = input;
  const m = lunarMonth - 1;

  const result = new Map<StarName, EarthlyBranch>();

  const luCun = LU_CUN_BY_STEM[yearStem];
  const luCunIdx = EARTHLY_BRANCHES.indexOf(luCun);
  result.set('祿存', luCun);
  result.set('擎羊', at(luCunIdx + 1));
  result.set('陀羅', at(luCunIdx - 1));

  const [kui, yue] = KUI_YUE_BY_STEM[yearStem];
  result.set('天魁', kui);
  result.set('天鉞', yue);

  result.set('文昌', at(10 - h)); // 戌 = 10, 逆數
  result.set('文曲', at(4 + h));  // 辰 = 4, 順數

  result.set('左輔', at(4 + m));  // 辰起正月順行
  result.set('右弼', at(10 - m)); // 戌起正月逆行

  result.set('地劫', at(11 + h)); // 亥起子時順行
  result.set('地空', at(11 - h)); // 亥起子時逆行

  const [huoStart, lingStart] = HUO_LING_START[yearBranch];
  result.set('火星', at(EARTHLY_BRANCHES.indexOf(huoStart) + h));
  result.set('鈴星', at(EARTHLY_BRANCHES.indexOf(lingStart) + h));

  result.set('天馬', TIAN_MA_BY_BRANCH[yearBranch]);

  return result;
}
