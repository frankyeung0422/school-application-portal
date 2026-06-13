/**
 * One-off insert for influenza/cold/bronchitis/pharyngitis conditions and
 * their pattern mappings. The matching seeds are also added to
 * prisma/seeds/conditions.ts for future fresh seeding; this script lets you
 * apply them to an existing DB without re-seeding everything.
 *
 * Idempotent — skips by westernName / (conditionId, patternId).
 *
 * Run: npx tsx scripts/add-influenza-conditions.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type Frequency = "COMMON" | "OCCASIONAL" | "RARE";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CONDITIONS: Array<{
  westernName: string;
  icd10Code: string;
  icd11Code: string;
  snomedCode: string;
  description: string;
  patterns: Array<{ pinyin: string; freq: Frequency; notes: string }>;
}> = [
  {
    westernName: "Influenza",
    icd10Code: "J11",
    icd11Code: "1F02",
    snomedCode: "6142004",
    description:
      "流行性感冒是由流感病毒引起的急性呼吸道傳染病，症狀包括高熱、頭痛、肌肉痠痛、乏力、咳嗽、咽痛、鼻塞流涕，較普通感冒為重，全身症狀明顯。中醫多歸屬「時行感冒」、「溫病」範疇，常因感受風熱、風寒之邪所致。",
    patterns: [
      { pinyin: "Feng Re", freq: "COMMON", notes: "風熱犯衛，發熱重、惡寒輕、咽痛、舌紅苔黃，銀翹散為代表" },
      { pinyin: "Feng Han", freq: "COMMON", notes: "風寒束表，惡寒重、無汗或自汗、頭身痛，桂枝湯/麻黃湯加減" },
      { pinyin: "Fei Qi Xu", freq: "OCCASIONAL", notes: "氣虛體質易反覆感冒，自汗畏風" },
    ],
  },
  {
    westernName: "Common Cold",
    icd10Code: "J00",
    icd11Code: "CA00",
    snomedCode: "82272006",
    description:
      "普通感冒是上呼吸道病毒感染，以鼻塞、流涕、噴嚏、咽痛、輕度發熱、頭痛為主症，全身症狀較流感為輕。中醫稱「感冒」，依病邪屬性分為風寒感冒、風熱感冒兩大類。",
    patterns: [
      { pinyin: "Feng Han", freq: "COMMON", notes: "風寒感冒：清涕、無汗、頭痛、舌淡苔白，桂枝湯/麻黃湯為代表" },
      { pinyin: "Feng Re", freq: "COMMON", notes: "風熱感冒：黃涕、咽痛、口渴、舌紅苔黃，銀翹散為代表" },
      { pinyin: "Fei Qi Xu", freq: "OCCASIONAL", notes: "肺氣虛者衛外不固，易反覆感冒" },
    ],
  },
  {
    westernName: "Acute Bronchitis",
    icd10Code: "J20",
    icd11Code: "CA42",
    snomedCode: "10509002",
    description:
      "急性支氣管炎為氣管支氣管黏膜的急性炎症，多由病毒或細菌感染引起，主症為咳嗽、咳痰，常繼發於感冒之後。中醫歸屬「咳嗽」、「外感咳嗽」範疇，多因風邪犯肺、肺失宣降所致。",
    patterns: [
      { pinyin: "Feng Re", freq: "COMMON", notes: "風熱犯肺，咳嗽痰黃、咽痛、發熱，麻杏石甘湯為代表" },
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON", notes: "痰濕蘊肺，咳嗽痰多色白，二陳湯為代表" },
      { pinyin: "Feng Han", freq: "OCCASIONAL", notes: "風寒咳嗽：咳痰清稀、惡寒，三拗湯/桂枝湯加減" },
    ],
  },
  {
    westernName: "Acute Pharyngitis",
    icd10Code: "J02",
    icd11Code: "CA02",
    snomedCode: "363746003",
    description:
      "急性咽炎是咽部黏膜及淋巴組織的急性炎症，常由病毒感染引起，症見咽部紅腫、疼痛、灼熱、吞嚥不適，常伴發熱頭痛。中醫稱「喉痺」、「風熱喉痺」，屬風熱犯咽範疇。",
    patterns: [
      { pinyin: "Feng Re", freq: "COMMON", notes: "風熱喉痺，咽紅腫痛、灼熱、發熱，銀翹散加減" },
      { pinyin: "Shi Re", freq: "OCCASIONAL", notes: "肺胃熱盛，咽痛劇烈、口臭口渴、便秘" },
    ],
  },
];

async function main() {
  console.log("[add-influenza-conditions] Inserting cold/flu/bronchitis/pharyngitis conditions…\n");

  let cAdded = 0, cSkipped = 0, mappingAdded = 0;
  const missingPatterns = new Set<string>();

  for (const c of CONDITIONS) {
    let cond = await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } });
    if (cond) {
      console.log(`  ↷ condition exists: ${c.westernName} (${cond.id})`);
      cSkipped++;
    } else {
      cond = await prisma.conditionMapping.create({
        data: {
          westernName: c.westernName,
          icd10Code: c.icd10Code,
          icd11Code: c.icd11Code,
          snomedCode: c.snomedCode,
          description: c.description,
        },
      });
      console.log(`  ✓ created condition: ${c.westernName} (${cond.id})`);
      cAdded++;
    }

    for (const pr of c.patterns) {
      const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } });
      if (!pat) {
        missingPatterns.add(pr.pinyin);
        continue;
      }
      try {
        await prisma.conditionPatternMapping.create({
          data: {
            conditionId: cond.id,
            patternId: pat.id,
            frequency: pr.freq,
            notes: pr.notes,
          },
        });
        mappingAdded++;
        console.log(`     + pattern link: ${pr.pinyin} (${pr.freq})`);
      } catch {
        // unique([conditionId, patternId]) — already exists, skip
      }
    }
  }

  console.log(
    `\n[add-influenza-conditions] +${cAdded} new condition(s), ${cSkipped} already present, +${mappingAdded} pattern link(s).`,
  );
  if (missingPatterns.size > 0) {
    console.log(`  ⚠ Missing patterns (skipped links): ${[...missingPatterns].sort().join(", ")}`);
  }

  const cTotal = await prisma.conditionMapping.count();
  console.log(`  DB total conditions: ${cTotal}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
