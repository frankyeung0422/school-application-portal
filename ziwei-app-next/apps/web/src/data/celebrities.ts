/**
 * Celebrity seed data for programmatic /celebrity/[slug] SEO pages.
 *
 * Rules:
 *  - Public-domain birth data only (Wikipedia primary source)
 *  - Slug = pinyin-friendly, lowercase, hyphen-separated
 *  - When unsure of birth time (most celebrities), default to noon and disclose
 *
 * Add more entries to scale SEO real estate. Each entry = one indexed page.
 */

import type { BirthInfo } from '@ziwei/engine';

export interface Celebrity {
  slug: string;
  name: string;
  nameZh: string;
  bio: string; // 1-2 sentence summary
  birth: BirthInfo;
  birthTimeKnown: boolean;
  sourceUrl: string; // Wikipedia or equivalent
  knownFor: string[];
  region: 'HK' | 'TW' | 'CN' | 'overseas';
}

export const CELEBRITIES: Celebrity[] = [
  {
    slug: 'chow-yun-fat',
    name: 'Chow Yun-fat',
    nameZh: '周潤發',
    bio: '香港演員, 1980年代香港電影黃金時期代表人物。',
    birth: { year: 1955, month: 5, day: 18, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/周潤發',
    knownFor: ['英雄本色', '臥虎藏龍', '加勒比海盜'],
    region: 'HK',
  },
  {
    slug: 'jay-chou',
    name: 'Jay Chou',
    nameZh: '周杰倫',
    bio: '台灣流行音樂歌手、作曲家、製作人, 華語樂壇代表人物。',
    birth: { year: 1979, month: 1, day: 18, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/周杰倫',
    knownFor: ['七里香', '稻香', '不能說的秘密'],
    region: 'TW',
  },
  {
    slug: 'tsai-ing-wen',
    name: 'Tsai Ing-wen',
    nameZh: '蔡英文',
    bio: '中華民國前總統 (2016-2024), 政治學者出身。',
    birth: { year: 1956, month: 8, day: 31, hour: 12, minute: 0, gender: 'F', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/蔡英文',
    knownFor: ['首位民選女性總統', '兩任元首'],
    region: 'TW',
  },
  {
    slug: 'andy-lau',
    name: 'Andy Lau',
    nameZh: '劉德華',
    bio: '香港歌手、演員, 「四大天王」之一, 出道四十餘年。',
    birth: { year: 1961, month: 9, day: 27, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/劉德華',
    knownFor: ['無間道', '天若有情', '冰雨'],
    region: 'HK',
  },
  {
    slug: 'tony-leung-chiu-wai',
    name: 'Tony Leung Chiu-wai',
    nameZh: '梁朝偉',
    bio: '香港演員, 五屆香港電影金像獎影帝, 戛納影帝。',
    birth: { year: 1962, month: 6, day: 27, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/梁朝偉',
    knownFor: ['花樣年華', '一代宗師', '無間道'],
    region: 'HK',
  },
  {
    slug: 'maggie-cheung',
    name: 'Maggie Cheung',
    nameZh: '張曼玉',
    bio: '香港演員, 五屆香港電影金像獎影后, 戛納影后。',
    birth: { year: 1964, month: 9, day: 20, hour: 12, minute: 0, gender: 'F', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/張曼玉',
    knownFor: ['花樣年華', '甜蜜蜜', '阮玲玉'],
    region: 'HK',
  },
  {
    slug: 'jacky-cheung',
    name: 'Jacky Cheung',
    nameZh: '張學友',
    bio: '香港歌手、演員, 「四大天王」之一, 「歌神」稱號。',
    birth: { year: 1961, month: 7, day: 10, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/張學友',
    knownFor: ['吻別', '只想一生跟你走', '雪狼湖'],
    region: 'HK',
  },
  {
    slug: 'aaron-kwok',
    name: 'Aaron Kwok',
    nameZh: '郭富城',
    bio: '香港歌手、演員, 「四大天王」之一, 以舞蹈聞名。',
    birth: { year: 1965, month: 10, day: 26, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/郭富城',
    knownFor: ['對你愛不完', '寒戰', '父子'],
    region: 'HK',
  },
  {
    slug: 'leon-lai',
    name: 'Leon Lai',
    nameZh: '黎明',
    bio: '香港歌手、演員, 「四大天王」之一。',
    birth: { year: 1966, month: 12, day: 11, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/黎明',
    knownFor: ['今夜你會不會來', '甜蜜蜜', '半生緣'],
    region: 'HK',
  },
  {
    slug: 'jolin-tsai',
    name: 'Jolin Tsai',
    nameZh: '蔡依林',
    bio: '台灣流行音樂歌手, 「亞洲流行天后」, 多次金曲獎得主。',
    birth: { year: 1980, month: 9, day: 15, hour: 12, minute: 0, gender: 'F', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/蔡依林',
    knownFor: ['舞孃', '日不落', '玫瑰少年'],
    region: 'TW',
  },
  {
    slug: 'a-mei',
    name: 'A-Mei',
    nameZh: '張惠妹',
    bio: '台灣原住民流行歌手, 華語樂壇天后級人物。',
    birth: { year: 1972, month: 8, day: 9, hour: 12, minute: 0, gender: 'F', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/張惠妹',
    knownFor: ['聽海', '記得', '掉了'],
    region: 'TW',
  },
  {
    slug: 'jiang-jieshi',
    name: 'Chiang Kai-shek',
    nameZh: '蔣中正',
    bio: '中華民國前總統 (1948-1975), 北伐軍事領袖、國民黨總裁。',
    birth: { year: 1887, month: 10, day: 31, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/蔣中正',
    knownFor: ['中華民國總統', '北伐', '抗日戰爭'],
    region: 'TW',
  },
  {
    slug: 'sun-yat-sen',
    name: 'Sun Yat-sen',
    nameZh: '孫中山',
    bio: '中華民國國父, 三民主義倡導者, 推翻清朝的辛亥革命領導人。',
    birth: { year: 1866, month: 11, day: 12, hour: 12, minute: 0, gender: 'M', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/孫中山',
    knownFor: ['辛亥革命', '三民主義', '中華民國國父'],
    region: 'TW',
  },
  {
    slug: 'eileen-chang',
    name: 'Eileen Chang',
    nameZh: '張愛玲',
    bio: '中國現代文學作家, 上海出生, 後居美國, 代表作《傾城之戀》。',
    birth: { year: 1920, month: 9, day: 30, hour: 12, minute: 0, gender: 'F', calendar: 'solar' },
    birthTimeKnown: false,
    sourceUrl: 'https://zh.wikipedia.org/wiki/張愛玲',
    knownFor: ['傾城之戀', '色,戒', '半生緣'],
    region: 'overseas',
  },
  // TODO: extend to 50 celebrities for full SEO real estate per plan §J
];
