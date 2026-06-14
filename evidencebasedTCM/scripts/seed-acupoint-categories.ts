/**
 * Seed functionalCategories for acupoints.
 * Categories: Five-Shu points (井/滎/輸/經/合), Yuan-Source, Luo-Connecting,
 * Xi-Cleft, Back-Shu, Front-Mu, Confluent (八脈交會穴), Window of Heaven,
 * Four Seas, Command (四總穴), Ghost points.
 * Idempotent — only updates points with empty functionalCategories.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Map from point code → categories
const CATEGORY_MAP: Record<string, string[]> = {
  // Five-Shu — Lung
  LU11: ["Jing-Well", "Ghost-Point"],
  LU10: ["Ying-Spring"],
  LU9: ["Shu-Stream", "Yuan-Source"],
  LU8: ["Jing-River"],
  LU5: ["He-Sea"],
  LU7: ["Luo-Connecting", "Confluent", "Command"],
  LU6: ["Xi-Cleft"],

  // Five-Shu — Large Intestine
  LI1: ["Jing-Well"],
  LI2: ["Ying-Spring"],
  LI3: ["Shu-Stream"],
  LI4: ["Yuan-Source", "Command", "Four-Command"],
  LI5: ["Jing-River"],
  LI6: ["Luo-Connecting"],
  LI7: ["Xi-Cleft"],
  LI11: ["He-Sea"],

  // Five-Shu — Stomach
  ST45: ["Jing-Well"],
  ST44: ["Ying-Spring"],
  ST43: ["Shu-Stream"],
  ST41: ["Jing-River"],
  ST36: ["He-Sea", "Command", "Four-Command", "Lower-He-Sea"],
  ST37: ["Lower-He-Sea"],
  ST39: ["Lower-He-Sea"],
  ST40: ["Luo-Connecting"],
  ST34: ["Xi-Cleft"],
  ST25: ["Front-Mu"],

  // Five-Shu — Spleen
  SP1: ["Jing-Well", "Ghost-Point"],
  SP2: ["Ying-Spring"],
  SP3: ["Shu-Stream", "Yuan-Source"],
  SP4: ["Luo-Connecting", "Confluent"],
  SP5: ["Jing-River"],
  SP6: ["Three-Yin-Intersection"],
  SP8: ["Xi-Cleft"],
  SP9: ["He-Sea"],
  SP10: ["Sea-of-Blood"],
  SP21: ["Major-Luo"],

  // Five-Shu — Heart
  HT9: ["Jing-Well"],
  HT8: ["Ying-Spring"],
  HT7: ["Shu-Stream", "Yuan-Source", "Command"],
  HT4: ["Jing-River"],
  HT3: ["He-Sea"],
  HT5: ["Luo-Connecting"],
  HT6: ["Xi-Cleft"],

  // Five-Shu — Small Intestine
  SI1: ["Jing-Well"],
  SI2: ["Ying-Spring", "Ghost-Point"],
  SI3: ["Shu-Stream", "Confluent"],
  SI4: ["Yuan-Source"],
  SI5: ["Jing-River"],
  SI7: ["Luo-Connecting"],
  SI6: ["Xi-Cleft"],
  SI8: ["He-Sea"],
  SI27: ["Lower-He-Sea"],

  // Five-Shu — Bladder
  BL67: ["Jing-Well"],
  BL66: ["Ying-Spring"],
  BL65: ["Shu-Stream"],
  BL60: ["Jing-River"],
  BL40: ["He-Sea", "Command"],
  BL58: ["Luo-Connecting"],
  BL63: ["Xi-Cleft"],
  BL64: ["Yuan-Source"],

  // Back-Shu points
  BL11: ["Back-Shu", "Hui-Meeting"],
  BL12: ["Back-Shu"],
  BL13: ["Back-Shu"],
  BL14: ["Back-Shu"],
  BL15: ["Back-Shu"],
  BL16: ["Back-Shu"],
  BL17: ["Back-Shu", "Hui-Meeting"],
  BL18: ["Back-Shu"],
  BL19: ["Back-Shu"],
  BL20: ["Back-Shu"],
  BL21: ["Back-Shu"],
  BL22: ["Back-Shu"],
  BL23: ["Back-Shu"],
  BL24: ["Back-Shu"],
  BL25: ["Back-Shu"],
  BL26: ["Back-Shu"],
  BL27: ["Back-Shu"],
  BL28: ["Back-Shu"],

  // Five-Shu — Kidney
  KI1: ["Jing-Well"],
  KI2: ["Ying-Spring"],
  KI3: ["Shu-Stream", "Yuan-Source"],
  KI4: ["Luo-Connecting"],
  KI5: ["Xi-Cleft"],
  KI7: ["Jing-River"],
  KI10: ["He-Sea"],
  KI6: ["Confluent"],
  KI27: ["Front-Mu"],

  // Five-Shu — Pericardium
  PC9: ["Jing-Well"],
  PC8: ["Ying-Spring", "Ghost-Point"],
  PC7: ["Shu-Stream", "Yuan-Source", "Ghost-Point"],
  PC5: ["Jing-River"],
  PC3: ["He-Sea"],
  PC6: ["Luo-Connecting", "Confluent"],
  PC4: ["Xi-Cleft"],

  // Five-Shu — Triple Energizer
  TE1: ["Jing-Well"],
  TE2: ["Ying-Spring"],
  TE3: ["Shu-Stream"],
  TE4: ["Yuan-Source"],
  TE5: ["Luo-Connecting", "Confluent"],
  TE6: ["Jing-River"],
  TE7: ["Xi-Cleft"],
  TE10: ["He-Sea"],

  // Five-Shu — Gallbladder
  GB44: ["Jing-Well"],
  GB43: ["Ying-Spring"],
  GB41: ["Shu-Stream", "Confluent"],
  GB38: ["Jing-River"],
  GB34: ["He-Sea", "Hui-Meeting"],
  GB37: ["Luo-Connecting"],
  GB36: ["Xi-Cleft"],
  GB40: ["Yuan-Source"],
  GB25: ["Front-Mu"],
  GB26: ["Dai-Mai"],

  // Five-Shu — Liver
  LV1: ["Jing-Well"],
  LV2: ["Ying-Spring"],
  LV3: ["Shu-Stream", "Yuan-Source", "Four-Command"],
  LV4: ["Jing-River"],
  LV5: ["Luo-Connecting"],
  LV6: ["Xi-Cleft"],
  LV8: ["He-Sea"],
  LV14: ["Front-Mu", "Hui-Meeting"],
  LV13: ["Front-Mu", "Hui-Meeting"],

  // Governing Vessel (Du Mai)
  GV4: ["Gate-of-Life"],
  GV14: ["Sea-of-Yang", "Three-Yang-Intersection"],
  GV20: ["Hundred-Convergences"],
  GV26: ["Ghost-Point"],

  // Conception Vessel (Ren Mai)
  CV4: ["Front-Mu"],
  CV6: ["Sea-of-Qi"],
  CV8: ["Life-Gate-Navel"],
  CV12: ["Front-Mu", "Hui-Meeting", "Sea-of-Water-Grain"],
  CV17: ["Front-Mu", "Hui-Meeting", "Sea-of-Qi"],
  CV22: ["Front-Mu", "Window-of-Heaven"],
  CV24: ["Sea-of-Saliva", "Ghost-Point"],

  // BL62 — Confluent (Yang Qiao) + Ghost Point
  BL62: ["Confluent", "Ghost-Point"],
  // GB39 — Hui-Meeting (Marrow)
  GB39: ["Hui-Meeting"],
  // ST6 — Ghost Point
  ST6: ["Ghost-Point"],
  // Window of Heaven
  LU3: ["Window-of-Heaven"],
  LI18: ["Window-of-Heaven"],
  ST9: ["Window-of-Heaven"],
  GV16: ["Window-of-Heaven"],
  SI16: ["Window-of-Heaven"],
  SI17: ["Window-of-Heaven"],
  TE16: ["Window-of-Heaven"],
  PC1: ["Window-of-Heaven"],
};

async function main() {
  console.log("Seeding acupoint functional categories...");
  let updated = 0;

  for (const [code, categories] of Object.entries(CATEGORY_MAP)) {
    const point = await prisma.acupuncturePoint.findUnique({
      where: { code },
      select: { id: true, functionalCategories: true },
    });
    if (!point) continue;
    if (point.functionalCategories.length > 0) continue; // already seeded

    // merge unique
    const merged = Array.from(new Set([...point.functionalCategories, ...categories]));
    await prisma.acupuncturePoint.update({
      where: { code },
      data: { functionalCategories: merged },
    });
    console.log(`  ${code}: ${merged.join(", ")}`);
    updated++;
  }

  console.log(`Done. ${updated} acupoints updated with functional categories.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
