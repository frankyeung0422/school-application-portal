/**
 * Seed FormulaLineage — classical formula derivation relationships.
 * Source: 《方劑學》(第7版) 鄧中甲主編.
 * Idempotent — skips pairs already present.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface LineageEntry {
  sourcePinyin: string;
  derivedPinyin: string;
  relationship: string;
  changeDescription: string;
  classicalSource?: string;
}

const LINEAGES: LineageEntry[] = [
  // 桂枝湯 family
  {
    sourcePinyin: "Guizhi Tang",
    derivedPinyin: "Guizhi Jia Shaoyao Tang",
    relationship: "modification",
    changeDescription: "倍芍藥量，治太陰腹滿時痛",
    classicalSource: "《傷寒論》",
  },
  {
    sourcePinyin: "Guizhi Tang",
    derivedPinyin: "Xiao Jian Zhong Tang",
    relationship: "modification",
    changeDescription: "倍芍藥、加飴糖，建中緩急",
    classicalSource: "《傷寒論》",
  },
  {
    sourcePinyin: "Xiao Jian Zhong Tang",
    derivedPinyin: "Huang Qi Jian Zhong Tang",
    relationship: "modification",
    changeDescription: "加黃芪，補氣健脾",
    classicalSource: "《金匱要略》",
  },
  {
    sourcePinyin: "Guizhi Tang",
    derivedPinyin: "Dang Gui Si Ni Tang",
    relationship: "modification",
    changeDescription: "去生薑大棗加當歸細辛通草，溫經散寒",
    classicalSource: "《傷寒論》",
  },

  // 麻黃湯 family
  {
    sourcePinyin: "Mahuang Tang",
    derivedPinyin: "Da Qing Long Tang",
    relationship: "modification",
    changeDescription: "加石膏、薑棗，外寒內熱",
    classicalSource: "《傷寒論》",
  },
  {
    sourcePinyin: "Mahuang Tang",
    derivedPinyin: "Xiao Qing Long Tang",
    relationship: "modification",
    changeDescription: "去杏仁加細辛、五味子、乾薑、芍藥、半夏，外寒內飲",
    classicalSource: "《傷寒論》",
  },
  {
    sourcePinyin: "Mahuang Tang",
    derivedPinyin: "Mahuang Xing Ren Gan Cao Shi Gao Tang",
    relationship: "modification",
    changeDescription: "去桂枝加石膏，清肺定喘",
    classicalSource: "《傷寒論》",
  },

  // 六味地黃丸 family
  {
    sourcePinyin: "Liuwei Dihuang Wan",
    derivedPinyin: "Zhibai Dihuang Wan",
    relationship: "modification",
    changeDescription: "加知母、黃柏，清虛熱降相火",
    classicalSource: "《醫宗金鑒》",
  },
  {
    sourcePinyin: "Liuwei Dihuang Wan",
    derivedPinyin: "Qi Ju Dihuang Wan",
    relationship: "modification",
    changeDescription: "加枸杞子、菊花，滋腎明目",
    classicalSource: "《醫級》",
  },
  {
    sourcePinyin: "Liuwei Dihuang Wan",
    derivedPinyin: "Maizwei Dihuang Wan",
    relationship: "modification",
    changeDescription: "加麥冬、五味子，滋腎斂肺",
    classicalSource: "《醫部全錄》",
  },
  {
    sourcePinyin: "Liuwei Dihuang Wan",
    derivedPinyin: "Jin Gui Shen Qi Wan",
    relationship: "modification",
    changeDescription: "加附子、桂枝，補腎助陽",
    classicalSource: "《金匱要略》",
  },

  // 四君子湯 family
  {
    sourcePinyin: "Sijunzi Tang",
    derivedPinyin: "Yi Gong San",
    relationship: "modification",
    changeDescription: "加陳皮，健脾和胃",
    classicalSource: "《和劑局方》",
  },
  {
    sourcePinyin: "Sijunzi Tang",
    derivedPinyin: "Liu Jun Zi Tang",
    relationship: "modification",
    changeDescription: "加陳皮、半夏，健脾化痰",
    classicalSource: "《醫學正傳》",
  },
  {
    sourcePinyin: "Liu Jun Zi Tang",
    derivedPinyin: "Xiang Sha Liu Jun Zi Tang",
    relationship: "modification",
    changeDescription: "加木香、砂仁，健脾行氣止痛",
    classicalSource: "《古今名醫方論》",
  },
  {
    sourcePinyin: "Sijunzi Tang",
    derivedPinyin: "Shen Ling Bai Zhu San",
    relationship: "modification",
    changeDescription: "加山藥、蓮子、砂仁、桔梗、薏苡仁、扁豆，健脾滲濕止瀉",
    classicalSource: "《和劑局方》",
  },
  {
    sourcePinyin: "Sijunzi Tang",
    derivedPinyin: "Bu Zhong Yi Qi Tang",
    relationship: "modification",
    changeDescription: "加黃芪為君、升麻、柴胡、當歸，補中益氣升陽舉陷",
    classicalSource: "《脾胃論》",
  },

  // 四物湯 family
  {
    sourcePinyin: "Siwu Tang",
    derivedPinyin: "Tao Hong Siwu Tang",
    relationship: "modification",
    changeDescription: "加桃仁、紅花，活血化瘀",
    classicalSource: "《醫宗金鑒》",
  },
  {
    sourcePinyin: "Siwu Tang",
    derivedPinyin: "Shenghua Tang",
    relationship: "modification",
    changeDescription: "去地黃、芍藥，加桃仁、炮薑、炙甘草，化瘀生新",
    classicalSource: "《傅青主女科》",
  },

  // 八珍湯 (combination)
  {
    sourcePinyin: "Sijunzi Tang",
    derivedPinyin: "Bazhen Tang",
    relationship: "combination",
    changeDescription: "合四物湯，氣血雙補",
    classicalSource: "《瑞竹堂方》",
  },
  {
    sourcePinyin: "Siwu Tang",
    derivedPinyin: "Bazhen Tang",
    relationship: "combination",
    changeDescription: "合四君子湯，氣血雙補",
    classicalSource: "《瑞竹堂方》",
  },

  // 小柴胡湯 family
  {
    sourcePinyin: "Xiao Chaihu Tang",
    derivedPinyin: "Da Chaihu Tang",
    relationship: "modification",
    changeDescription: "加大黃、枳實，和解少陽兼瀉陽明",
    classicalSource: "《傷寒論》",
  },
  {
    sourcePinyin: "Xiao Chaihu Tang",
    derivedPinyin: "Chaihu Shu Gan San",
    relationship: "modification",
    changeDescription: "加陳皮、川芎、香附，疏肝行氣",
    classicalSource: "《景岳全書》",
  },

  // 平胃散 family
  {
    sourcePinyin: "Pingwei San",
    derivedPinyin: "Huoxiang Zhengqi San",
    relationship: "modification",
    changeDescription: "加藿香、紫蘇、白芷等，外感暑濕",
    classicalSource: "《和劑局方》",
  },

  // 溫膽湯 family
  {
    sourcePinyin: "Er Chen Tang",
    derivedPinyin: "Wendan Tang",
    relationship: "modification",
    changeDescription: "加竹茹、枳實，清膽和胃化痰",
    classicalSource: "《三因極一病證方論》",
  },

  // 白虎湯 family
  {
    sourcePinyin: "Baihu Tang",
    derivedPinyin: "Baihu Jia Renshen Tang",
    relationship: "modification",
    changeDescription: "加人參，清熱益氣生津",
    classicalSource: "《傷寒論》",
  },
  {
    sourcePinyin: "Baihu Tang",
    derivedPinyin: "Zhuye Shigao Tang",
    relationship: "modification",
    changeDescription: "去知母加竹葉、半夏、麥冬、人參，清熱益氣生津",
    classicalSource: "《傷寒論》",
  },
];

async function main() {
  console.log("Seeding formula lineages...");
  let inserted = 0;
  let skipped = 0;

  for (const entry of LINEAGES) {
    const [source, derived] = await Promise.all([
      prisma.formula.findFirst({
        where: { pinyinName: { contains: entry.sourcePinyin, mode: "insensitive" } },
        select: { id: true, pinyinName: true },
      }),
      prisma.formula.findFirst({
        where: { pinyinName: { contains: entry.derivedPinyin, mode: "insensitive" } },
        select: { id: true, pinyinName: true },
      }),
    ]);

    if (!source || !derived) {
      console.log(`  SKIP (not found): ${entry.sourcePinyin} → ${entry.derivedPinyin}`);
      skipped++;
      continue;
    }

    try {
      await prisma.formulaLineage.create({
        data: {
          sourceFormulaId: source.id,
          derivedFormulaId: derived.id,
          relationship: entry.relationship,
          changeDescription: entry.changeDescription,
          classicalSource: entry.classicalSource ?? null,
        },
      });
      console.log(`  ${source.pinyinName} → ${derived.pinyinName} (${entry.relationship})`);
      inserted++;
    } catch {
      // unique constraint — already exists
      skipped++;
    }
  }

  console.log(`Done. ${inserted} lineages inserted, ${skipped} skipped.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
