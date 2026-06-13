/**
 * Batch expansion #6 — add commonly-cited herbs (minerals, animal products,
 * and Ginkgo leaf) so formulas in expand-5 link more completely and so
 * evidence about these substances can auto-link.
 *
 * Idempotent — skips by pinyinName.
 *
 * Run: npx tsx scripts/expand-6-mineral-and-cited.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H {
  p: string; c: string; lat: string; eng: string;
  cat: string; nat: "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
  flav: string[]; merid: string[]; dose: string; desc: string; pharm: string;
}

const HERBS: H[] = [
  { p: "Long Gu", c: "龍骨", lat: "Os Draconis (Fossilia Ossis Mastodi)", eng: "Dragon Bone (Fossilized Mammal Bone)",
    cat: "Spirit Calming", nat: "NEUTRAL", flav: ["Sweet", "Astringent"],
    merid: ["Heart", "Liver", "Kidney"], dose: "9-15g (先煎)",
    desc: "鎮驚安神，平肝潛陽，收斂固澀。煅龍骨收濕斂瘡。用於心神不安、心悸失眠、驚癇癲狂、肝陽眩暈、自汗盜汗、遺精崩漏、瘡瘍久潰不斂。為鎮肝熄風湯主藥之一。",
    pharm: "主要成分為碳酸鈣、磷酸鈣。具有鎮靜、抗驚厥、收斂、止血作用。" },
  { p: "Mu Li", c: "牡蠣", lat: "Concha Ostreae", eng: "Oyster Shell",
    cat: "Spirit Calming", nat: "COOL", flav: ["Salty", "Astringent"],
    merid: ["Liver", "Gallbladder", "Kidney"], dose: "9-30g (先煎)",
    desc: "重鎮安神，平肝潛陽，軟堅散結，收斂固澀。煅用收斂制酸。用於驚悸失眠、眩暈耳鳴、瘰癧痰核、癥瘕痞塊、自汗盜汗、遺精崩帶、胃痛吞酸。常與龍骨相須為用。",
    pharm: "含碳酸鈣、磷酸鈣、硫酸鈣及微量元素。具有抗胃酸、鎮靜、增強免疫、抗腫瘤作用。" },
  { p: "Gui Ban", c: "龜板", lat: "Plastrum Testudinis", eng: "Tortoise Plastron",
    cat: "Yin Tonifying", nat: "COOL", flav: ["Salty", "Sweet"],
    merid: ["Liver", "Kidney", "Heart"], dose: "9-24g (先煎)",
    desc: "滋陰潛陽，益腎強骨，養血補心，固經止崩。用於陰虛潮熱、骨蒸盜汗、頭暈目眩、虛風內動、筋骨痿軟、心虛健忘、崩漏經多。為滋陰潛陽要藥。",
    pharm: "含氨基酸、膠原蛋白、鈣磷無機物。具有抗腫瘤、增強免疫、抗骨質疏鬆、促紅細胞生成作用。" },
  { p: "E Jiao", c: "阿膠", lat: "Colla Corii Asini", eng: "Donkey-Hide Gelatin",
    cat: "Blood Tonifying", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Lung", "Liver", "Kidney"], dose: "3-9g (烊化)",
    desc: "補血滋陰，潤燥止血。用於血虛萎黃、眩暈心悸、肌痿無力、心煩不眠、虛風內動、肺燥咳嗽、勞嗽咯血、吐血尿血、便血崩漏、妊娠胎漏。複方阿膠漿主藥。",
    pharm: "含明膠蛋白、多種氨基酸（甘氨酸、脯氨酸、賴氨酸）、鈣、鐵。具有促進造血、止血、增強免疫、抗疲勞、抗輻射作用。" },
  { p: "Yin Xing Ye", c: "銀杏葉", lat: "Folium Ginkgo / Ginkgo biloba leaf", eng: "Ginkgo Leaf",
    cat: "Blood Activating", nat: "NEUTRAL", flav: ["Sweet", "Bitter", "Astringent"],
    merid: ["Heart", "Lung"], dose: "9-12g",
    desc: "活血化瘀通絡，斂肺平喘，化濁降脂。用於瘀血阻絡、胸痺心痛、中風、半身不遂、肺虛咳喘、高脂血症。提取物EGb 761（含黃酮苷與萜內酯）為標準化製劑。",
    pharm: "含銀杏黃酮苷（24%）和萜內酯（6% — bilobalide, ginkgolides A/B/C）。具有抗血小板（PAF拮抗）、改善腦微循環、抗氧化、神經保護、認知改善作用。多項RCT支持EGb 761用於癡呆與週圍動脈疾病。" },
  { p: "Hua Shi", c: "滑石", lat: "Talcum", eng: "Talc",
    cat: "Dampness Draining", nat: "COLD", flav: ["Sweet", "Bland"],
    merid: ["Bladder", "Lung", "Stomach"], dose: "10-20g (布包)",
    desc: "利尿通淋，清熱解暑，祛濕斂瘡。用於濕熱淋證、暑濕煩渴、濕熱泄瀉、濕疹濕瘡、痱子。為三仁湯主藥之一。",
    pharm: "主要成分為Mg₃(Si₄O₁₀)(OH)₂。內服增加尿量，外用吸附水分及細菌毒素，止癢防腐。" },
];

async function main() {
  console.log(`\n[expand-6] Add ${HERBS.length} commonly-cited herbs (minerals + animal + Ginkgo)\n`);

  let hc = 0;
  for (const h of HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.p } });
    if (dup) { console.log(`  ↷ herb: ${h.p}`); continue; }
    await prisma.herb.create({
      data: {
        pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng,
        category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid,
        dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm,
        status: "PUBLISHED",
      },
    });
    console.log(`  ✓ herb: ${h.c} (${h.p}) — ${h.cat}`);
    hc++;
  }

  console.log(`\n[expand-6] +${hc} herbs\n`);

  const total = await prisma.herb.count();
  console.log(`  Total herbs: ${total}`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
