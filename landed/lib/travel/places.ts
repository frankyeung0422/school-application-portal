// Where Hong Kong flies: airports and the cities they serve, with the names
// people actually type (東京 / 东京 / Tokyo / TYO / 曼谷 / bangkok). Pure;
// tests/travel.test.ts. resolvePlace reuses the product-search fuzzy engine,
// so typos and Traditional/Simplified work the same way everywhere.

import { FUZZY_MIN, editDistance, foldText, parseQuery, scoreTitle, typoBudget } from "../search/fuzzy";

export type Region = "HK" | "GBA" | "CN" | "TW" | "JP" | "KR" | "SEA" | "SA" | "ME" | "OC" | "EU" | "NA";

export interface Place {
  /** City code (TYO) or the airport code when the city has one airport. */
  code: string;
  /** Airport codes Google Flights should search, e.g. ["NRT", "HND"]. */
  airports: string[];
  name: string;
  nameZh: string;
  country: string;
  region: Region;
  aliases?: string[];
}

const P = (code: string, airports: string[], name: string, nameZh: string, country: string, region: Region, aliases: string[] = []): Place => ({
  code,
  airports,
  name,
  nameZh,
  country,
  region,
  aliases,
});

export const PLACES: Place[] = [
  P("HKG", ["HKG"], "Hong Kong", "香港", "HK", "HK", ["hk", "赤鱲角"]),
  P("MFM", ["MFM"], "Macau", "澳門", "MO", "GBA", ["macao"]),
  P("SZX", ["SZX"], "Shenzhen", "深圳", "CN", "GBA"),
  P("CAN", ["CAN"], "Guangzhou", "廣州", "CN", "GBA", ["canton"]),
  // Mainland China
  P("BJS", ["PEK", "PKX"], "Beijing", "北京", "CN", "CN", ["peking"]),
  P("SHA", ["PVG", "SHA"], "Shanghai", "上海", "CN", "CN"),
  P("CTU", ["CTU", "TFU"], "Chengdu", "成都", "CN", "CN"),
  P("CKG", ["CKG"], "Chongqing", "重慶", "CN", "CN"),
  P("XIY", ["XIY"], "Xi'an", "西安", "CN", "CN", ["xian"]),
  P("HGH", ["HGH"], "Hangzhou", "杭州", "CN", "CN"),
  P("NKG", ["NKG"], "Nanjing", "南京", "CN", "CN"),
  P("XMN", ["XMN"], "Xiamen", "廈門", "CN", "CN"),
  P("KMG", ["KMG"], "Kunming", "昆明", "CN", "CN"),
  P("SYX", ["SYX"], "Sanya", "三亞", "CN", "CN"),
  P("HAK", ["HAK"], "Haikou", "海口", "CN", "CN"),
  P("TAO", ["TAO"], "Qingdao", "青島", "CN", "CN"),
  P("DLC", ["DLC"], "Dalian", "大連", "CN", "CN"),
  P("HRB", ["HRB"], "Harbin", "哈爾濱", "CN", "CN"),
  P("WUH", ["WUH"], "Wuhan", "武漢", "CN", "CN"),
  P("CSX", ["CSX"], "Changsha", "長沙", "CN", "CN"),
  P("KWL", ["KWL"], "Guilin", "桂林", "CN", "CN"),
  // Taiwan
  P("TPE", ["TPE", "TSA"], "Taipei", "台北", "TW", "TW", ["臺北", "taibei"]),
  P("KHH", ["KHH"], "Kaohsiung", "高雄", "TW", "TW"),
  P("RMQ", ["RMQ"], "Taichung", "台中", "TW", "TW", ["臺中"]),
  // Japan
  P("TYO", ["NRT", "HND"], "Tokyo", "東京", "JP", "JP", ["narita", "haneda", "成田", "羽田"]),
  P("OSA", ["KIX", "ITM"], "Osaka", "大阪", "JP", "JP", ["kansai", "關西", "京都", "kyoto"]),
  P("NGO", ["NGO"], "Nagoya", "名古屋", "JP", "JP"),
  P("FUK", ["FUK"], "Fukuoka", "福岡", "JP", "JP"),
  P("CTS", ["CTS"], "Sapporo", "札幌", "JP", "JP", ["hokkaido", "北海道", "chitose"]),
  P("OKA", ["OKA"], "Okinawa", "沖繩", "JP", "JP", ["naha", "那霸"]),
  P("KMJ", ["KMJ"], "Kumamoto", "熊本", "JP", "JP"),
  P("KOJ", ["KOJ"], "Kagoshima", "鹿兒島", "JP", "JP"),
  P("TAK", ["TAK"], "Takamatsu", "高松", "JP", "JP"),
  P("SDJ", ["SDJ"], "Sendai", "仙台", "JP", "JP"),
  P("HIJ", ["HIJ"], "Hiroshima", "廣島", "JP", "JP"),
  // Korea
  P("SEL", ["ICN", "GMP"], "Seoul", "首爾", "KR", "KR", ["incheon", "仁川", "漢城"]),
  P("PUS", ["PUS"], "Busan", "釜山", "KR", "KR", ["pusan"]),
  P("CJU", ["CJU"], "Jeju", "濟州", "KR", "KR", ["濟州島"]),
  // South-east Asia
  P("BKK", ["BKK", "DMK"], "Bangkok", "曼谷", "TH", "SEA"),
  P("CNX", ["CNX"], "Chiang Mai", "清邁", "TH", "SEA"),
  P("HKT", ["HKT"], "Phuket", "布吉", "TH", "SEA", ["普吉"]),
  P("SIN", ["SIN"], "Singapore", "新加坡", "SG", "SEA", ["星加坡"]),
  P("KUL", ["KUL"], "Kuala Lumpur", "吉隆坡", "MY", "SEA", ["kl"]),
  P("PEN", ["PEN"], "Penang", "檳城", "MY", "SEA"),
  P("BKI", ["BKI"], "Kota Kinabalu", "亞庇", "MY", "SEA", ["沙巴", "sabah"]),
  P("MNL", ["MNL"], "Manila", "馬尼拉", "PH", "SEA"),
  P("CEB", ["CEB"], "Cebu", "宿霧", "PH", "SEA"),
  P("DPS", ["DPS"], "Bali", "峇里", "ID", "SEA", ["denpasar", "巴厘島", "峇里島"]),
  P("CGK", ["CGK"], "Jakarta", "雅加達", "ID", "SEA"),
  P("SGN", ["SGN"], "Ho Chi Minh City", "胡志明市", "VN", "SEA", ["saigon", "西貢"]),
  P("HAN", ["HAN"], "Hanoi", "河內", "VN", "SEA"),
  P("DAD", ["DAD"], "Da Nang", "峴港", "VN", "SEA", ["danang"]),
  P("PNH", ["PNH"], "Phnom Penh", "金邊", "KH", "SEA"),
  P("REP", ["SAI"], "Siem Reap", "暹粒", "KH", "SEA", ["angkor", "吳哥"]),
  // South Asia / Middle East
  P("DEL", ["DEL"], "Delhi", "德里", "IN", "SA", ["new delhi", "新德里"]),
  P("BOM", ["BOM"], "Mumbai", "孟買", "IN", "SA", ["bombay"]),
  P("KTM", ["KTM"], "Kathmandu", "加德滿都", "NP", "SA"),
  P("CMB", ["CMB"], "Colombo", "科倫坡", "LK", "SA"),
  P("MLE", ["MLE"], "Maldives", "馬爾代夫", "MV", "SA", ["male", "馬累"]),
  P("DXB", ["DXB"], "Dubai", "杜拜", "AE", "ME", ["迪拜"]),
  P("DOH", ["DOH"], "Doha", "多哈", "QA", "ME"),
  P("IST", ["IST"], "Istanbul", "伊斯坦堡", "TR", "ME"),
  // Oceania
  P("SYD", ["SYD"], "Sydney", "悉尼", "AU", "OC", ["雪梨"]),
  P("MEL", ["MEL"], "Melbourne", "墨爾本", "AU", "OC"),
  P("BNE", ["BNE"], "Brisbane", "布里斯本", "AU", "OC"),
  P("PER", ["PER"], "Perth", "珀斯", "AU", "OC"),
  P("AKL", ["AKL"], "Auckland", "奧克蘭", "NZ", "OC"),
  // Europe
  P("LON", ["LHR", "LGW"], "London", "倫敦", "GB", "EU", ["heathrow", "gatwick"]),
  P("MAN", ["MAN"], "Manchester", "曼徹斯特", "GB", "EU"),
  P("PAR", ["CDG", "ORY"], "Paris", "巴黎", "FR", "EU"),
  P("FRA", ["FRA"], "Frankfurt", "法蘭克福", "DE", "EU"),
  P("MUC", ["MUC"], "Munich", "慕尼黑", "DE", "EU"),
  P("AMS", ["AMS"], "Amsterdam", "阿姆斯特丹", "NL", "EU"),
  P("ZRH", ["ZRH"], "Zurich", "蘇黎世", "CH", "EU"),
  P("ROM", ["FCO"], "Rome", "羅馬", "IT", "EU"),
  P("MIL", ["MXP"], "Milan", "米蘭", "IT", "EU"),
  P("MAD", ["MAD"], "Madrid", "馬德里", "ES", "EU"),
  P("BCN", ["BCN"], "Barcelona", "巴塞隆拿", "ES", "EU", ["巴塞羅那"]),
  P("HEL", ["HEL"], "Helsinki", "赫爾辛基", "FI", "EU"),
  // North America
  P("YVR", ["YVR"], "Vancouver", "溫哥華", "CA", "NA"),
  P("YTO", ["YYZ"], "Toronto", "多倫多", "CA", "NA"),
  P("SFO", ["SFO"], "San Francisco", "三藩市", "US", "NA", ["舊金山"]),
  P("LAX", ["LAX"], "Los Angeles", "洛杉磯", "US", "NA", ["la"]),
  P("NYC", ["JFK", "EWR"], "New York", "紐約", "US", "NA"),
  P("SEA", ["SEA"], "Seattle", "西雅圖", "US", "NA"),
  P("BOS", ["BOS"], "Boston", "波士頓", "US", "NA"),
  P("HNL", ["HNL"], "Honolulu", "檀香山", "US", "NA", ["hawaii", "夏威夷"]),
];

const BY_CODE = new Map<string, Place>();
for (const p of PLACES) {
  BY_CODE.set(p.code, p);
  for (const a of p.airports) if (!BY_CODE.has(a)) BY_CODE.set(a, p);
}

export function placeByCode(code: string): Place | null {
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

const searchText = (p: Place) => [p.name, p.nameZh, p.code, ...p.airports, ...(p.aliases ?? [])];

/**
 * "東京" / "tokyo" / "TYO" / "NRT" / "bangkock" → the place. Null when nothing
 * is close enough — we never guess a destination.
 */
export function resolvePlace(text: string): Place | null {
  return matchPlace(text)?.place ?? null;
}

/**
 * Like resolvePlace, and says whether the text *is* the place — its name, a
 * code, or a typo of a name ("bangkock") — rather than only containing it
 * ("東京新宿", a district of it).
 */
export function matchPlace(text: string): { place: Place; exact: boolean } | null {
  const t = text.trim();
  if (!t) return null;
  const byCode = /^[a-z]{3}$/i.test(t) ? placeByCode(t) : null;
  if (byCode) return { place: byCode, exact: true };
  const folded = foldText(t);
  for (const p of PLACES) if (searchText(p).some((s) => foldText(s) === folded)) return { place: p, exact: true };
  const query = parseQuery(t);
  let best: { p: Place; score: number } | null = null;
  for (const p of PLACES) {
    for (const s of searchText(p)) {
      const { score } = scoreTitle(query, s);
      if (score >= FUZZY_MIN && (!best || score > best.score)) best = { p, score };
    }
  }
  if (!best) return null;
  const typoOfName = searchText(best.p).some((s) => {
    const name = foldText(s);
    return /^[a-z ]+$/.test(folded) && editDistance(folded, name, typoBudget(name.length)) <= typoBudget(name.length);
  });
  return { place: best.p, exact: typoOfName };
}

export function placeLabel(p: Place): string {
  return `${p.nameZh} ${p.name} (${p.code})`;
}
