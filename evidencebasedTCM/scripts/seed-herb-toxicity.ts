/**
 * Seed toxicityClass for herbs based on 《中藥學》 (2nd ed.) toxicity classification.
 * Categories: 無毒 | 小毒 | 有毒 | 大毒
 * Idempotent — only updates herbs that have no toxicityClass set.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// [pinyinName substring, toxicityClass]
const TOXICITY_DATA: [string, string][] = [
  // 大毒 (highly toxic)
  ["Chuanwu", "大毒"],
  ["Caowu", "大毒"],
  ["Badou", "大毒"],
  ["Maqianzi", "大毒"],
  ["Banshuishilong葛", "大毒"],

  // 有毒 (toxic)
  ["Fuzi", "有毒"],
  ["Banxia", "有毒"],
  ["Nanxing", "有毒"],
  ["Changshan", "有毒"],
  ["Shanshuixian", "有毒"],
  ["Baifu", "有毒"],
  ["Cangerhzi", "有毒"],
  ["Shijunzi", "有毒"],
  ["Kulianpi", "有毒"],
  ["Muxiang", "有毒"],
  ["Xixin", "有毒"],
  ["Quanxie", "有毒"],
  ["Wugong", "有毒"],
  ["Zhusha", "有毒"],
  ["Xionghuang", "有毒"],
  ["Qingfen", "有毒"],
  ["Shuiyin", "有毒"],
  ["Shengpiniao", "有毒"],

  // 小毒 (mildly toxic)
  ["Kuxingren", "小毒"],
  ["Taoren", "小毒"],
  ["Wuyao", "小毒"],
  ["Chuanlianzi", "小毒"],
  ["Pipaye", "小毒"],
  ["Zhizi", "小毒"],
  ["Shuizhi", "小毒"],
  ["Mengchong", "小毒"],
  ["Dilong", "小毒"],
  ["Dafupi", "小毒"],
  ["Huajiao", "小毒"],
  ["Laifuzi", "小毒"],
];

async function main() {
  console.log("Seeding herb toxicity classes...");
  let updated = 0;

  for (const [pinyinSubstr, toxClass] of TOXICITY_DATA) {
    const result = await prisma.herb.updateMany({
      where: {
        pinyinName: { contains: pinyinSubstr, mode: "insensitive" },
        toxicityClass: null,
      },
      data: { toxicityClass: toxClass },
    });
    if (result.count > 0) {
      console.log(`  ${pinyinSubstr} → ${toxClass} (${result.count} herb(s))`);
      updated += result.count;
    }
  }

  // Mark all remaining herbs with no toxicity set as 無毒
  const noToxResult = await prisma.herb.updateMany({
    where: { toxicityClass: null },
    data: { toxicityClass: "無毒" },
  });
  console.log(`  (remaining ${noToxResult.count} herbs marked 無毒)`);
  updated += noToxResult.count;

  console.log(`Done. ${updated} herbs updated.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
