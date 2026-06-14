/**
 * Seed moxa, pregnancy contraindication, and needle angle flags for acupoints.
 * Source: 《針灸學》(第3版) 石學敏主編 + WHO standard.
 * Idempotent — skips points that already have moxaApplicable set.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface AcupointFlags {
  code: string;
  moxaApplicable: boolean;
  moxaContraindicated: boolean;
  pregnancyContraindicated: boolean;
  needleAngle: string;
}

// 禁灸穴 (classical moxibustion contraindicated points)
const MOXA_FORBIDDEN = new Set([
  "LU7", "LU8", "LI1", "LI3", "LI4", "ST1", "ST2", "ST3", "ST4",
  "ST5", "ST6", "ST7", "ST9", "SP10", "HT1", "HT3", "SI9", "BL1",
  "BL2", "BL54", "KI3", "PC3", "PC8", "TE22", "TE23", "GB1", "GB2",
  "GB21", "LV5", "GV8", "GV9", "GV10", "GV11", "GV16", "CV1", "CV2",
  "CV7", "CV8",
]);

// 孕婦禁針穴 (contraindicated in pregnancy)
const PREGNANCY_FORBIDDEN = new Set([
  "LI4", "SP6", "SP10", "BL23", "BL31", "BL32", "BL33", "BL34",
  "BL60", "BL67", "KI3", "KI6", "GB21", "GB34", "LV3", "GV1",
  "GV4", "CV3", "CV4", "CV5", "CV6", "CV7",
]);

// Needle angles: map code prefix → default angle (overrides can be specified per point)
const ANGLE_OVERRIDES: Record<string, string> = {
  // Specific points with non-standard angles
  BL1: "直刺 0.5–1寸（沿眼眶內緣刺）",
  BL2: "斜刺 0.3–0.5寸",
  ST1: "直刺 0.5–1寸（緩慢進針）",
  ST7: "直刺 0.5–1寸",
  CV1: "直刺 1–1.5寸",
  CV8: "禁針（隔鹽灸）",
  GV16: "斜刺 0.5–1寸（向下斜刺）",
  GV20: "平刺 0.5–1寸",
  GV25: "斜刺 0.3–0.5寸",
  GV26: "斜刺 0.3–0.5寸（向上斜刺）",
  LU1: "斜刺 0.5–0.8寸（向外側）",
  LU5: "直刺 0.5–1寸",
  LU7: "斜刺 0.5–0.8寸",
  LI4: "直刺 0.5–1寸",
  LI15: "直刺 或 斜刺 0.8–1.5寸",
  ST36: "直刺 1–2寸",
  ST40: "直刺 1–1.5寸",
  SP6: "直刺 1–1.5寸",
  SP10: "直刺 1–1.5寸",
  HT7: "直刺 0.3–0.5寸",
  SI3: "直刺 0.5–0.8寸（微握拳）",
  BL23: "直刺 0.5–1寸",
  BL40: "直刺 1–1.5寸",
  BL60: "直刺 0.5–0.8寸",
  KI1: "直刺 0.3–0.5寸",
  KI3: "直刺 0.5–0.8寸",
  KI6: "直刺 0.3–0.5寸",
  PC6: "直刺 0.5–1寸",
  PC8: "直刺 0.3–0.5寸",
  TE5: "直刺 0.5–0.8寸",
  GB20: "斜刺 0.5–0.8寸（向鼻尖方向）",
  GB21: "斜刺 0.5–0.8寸",
  GB30: "直刺 2–3寸",
  GB34: "直刺 1–1.5寸",
  GB39: "直刺 0.5–0.8寸",
  LV3: "直刺 0.5–0.8寸",
  LV8: "直刺 1–1.5寸",
  CV4: "直刺 0.8–1.2寸",
  CV6: "直刺 0.8–1.2寸",
  CV12: "直刺 1–1.5寸",
  CV17: "平刺 0.3–0.5寸",
  GV4: "斜刺 0.5–1寸",
  GV14: "斜刺 0.5–1寸（向上斜刺）",
  EX_HN1: "平刺 0.3–0.5寸",
  EX_HN3: "平刺 0.3–0.5寸（向下斜刺）",
  EX_LE6: "直刺 1.5–2寸",
};

function getDefaultAngle(code: string): string {
  if (ANGLE_OVERRIDES[code]) return ANGLE_OVERRIDES[code];
  if (code.startsWith("GV") || code.startsWith("CV")) return "直刺 0.5–1寸";
  if (code.startsWith("BL") && parseInt(code.slice(2)) >= 11 && parseInt(code.slice(2)) <= 54)
    return "斜刺 0.5–0.8寸（向脊椎方向）";
  return "直刺 0.5–1寸";
}

async function main() {
  console.log("Seeding acupoint flags (moxa/pregnancy/needle angle)...");
  const points = await prisma.acupuncturePoint.findMany({
    where: { moxaApplicable: null },
    select: { id: true, code: true },
  });

  console.log(`  Found ${points.length} points needing flags...`);
  let updated = 0;

  for (const point of points) {
    const moxaContra = MOXA_FORBIDDEN.has(point.code);
    const pregContra = PREGNANCY_FORBIDDEN.has(point.code);
    const angle = getDefaultAngle(point.code);

    await prisma.acupuncturePoint.update({
      where: { id: point.id },
      data: {
        moxaApplicable: !moxaContra,
        moxaContraindicated: moxaContra,
        pregnancyContraindicated: pregContra,
        needleAngle: angle,
      },
    });
    updated++;
  }

  console.log(`Done. ${updated} acupoints updated with moxa/pregnancy flags.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
