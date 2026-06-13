/**
 * Batch expansion: Add new herbs from theqi.com herb categories + new acupoints from meridian data.
 * Additive — skips duplicates by pinyinName/code.
 *
 * Run: npx tsx scripts/expand-herbs-and-acupoints.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H {
  p: string; c: string; lat: string; eng: string;
  cat: string; nat: "WARM"|"HOT"|"COOL"|"COLD"|"NEUTRAL";
  flav: string[]; merid: string[]; dose: string; desc: string; pharm: string;
}

// New herbs NOT yet in our DB — clinically important ones from theqi.com
const HERBS: H[] = [
  { p:"Bai Zhi",c:"白芷",lat:"Angelica dahurica",eng:"Angelica Root",cat:"Exterior Releasing",nat:"WARM",flav:["Pungent"],merid:["Lung","Stomach","Spleen"],dose:"3-10g",desc:"祛風解表，散寒止痛，通鼻竅，消腫排膿。用於感冒頭痛、眉稜骨痛、鼻塞鼻淵、齒痛、帶下、瘡瘍腫毒。為治陽明頭痛要藥。（來源：theqi.com 中藥學）",pharm:"含白芷素、歐前胡素等。具有鎮痛、抗炎、解痙、抑菌、光敏作用。" },
  { p:"Xi Xin",c:"細辛",lat:"Asarum sieboldii",eng:"Asarum",cat:"Interior Warming",nat:"WARM",flav:["Pungent"],merid:["Lung","Heart","Kidney"],dose:"1-3g",desc:"祛風散寒，通竅止痛，溫肺化飲。用於風寒表證、頭痛齒痛、鼻塞鼻淵、風濕痹痛、痰飲咳喘。用量不宜過大，古訓「細辛不過錢」。（來源：theqi.com 中藥學）",pharm:"含甲基丁香酚。具有解熱鎮痛、局部麻醉、抗炎、抗過敏作用。注意：馬兜鈴酸腎毒性。" },
  { p:"Sang Ye",c:"桑葉",lat:"Morus alba",eng:"Mulberry Leaf",cat:"Exterior Releasing",nat:"COLD",flav:["Bitter","Sweet"],merid:["Lung","Liver"],dose:"5-10g",desc:"疏散風熱，清肺潤燥，平肝明目，涼血止血。用於風熱感冒、肺熱燥咳、頭暈頭痛、目赤昏花。（來源：theqi.com 中藥學）",pharm:"含桑葉多糖、γ-氨基丁酸。具有降血糖、降血壓、抗氧化、降脂作用。現代用於糖尿病。" },
  { p:"Ju Hua",c:"菊花",lat:"Chrysanthemum morifolium",eng:"Chrysanthemum Flower",cat:"Exterior Releasing",nat:"COOL",flav:["Pungent","Sweet","Bitter"],merid:["Lung","Liver"],dose:"5-10g",desc:"疏散風熱，平肝明目，清熱解毒。用於風熱感冒、頭痛眩暈、目赤腫痛、眼目昏花、瘡癰腫毒。白菊花偏清肝明目，黃菊花偏疏散風熱。（來源：theqi.com 中藥學）",pharm:"含菊甙、腺嘌呤、菊色素。具有降壓、擴張冠脈、抑菌、抗炎作用。" },
  { p:"Sheng Ma",c:"升麻",lat:"Cimicifuga foetida",eng:"Bugbane Rhizome",cat:"Exterior Releasing",nat:"COOL",flav:["Pungent","Sweet"],merid:["Lung","Spleen","Large Intestine","Stomach"],dose:"3-10g",desc:"發表透疹，清熱解毒，升舉陽氣。用於麻疹不透、時氣火毒、頭痛咽痛、口瘡、中氣下陷、久瀉脫肛、子宮下垂。為升提中氣要藥。（來源：theqi.com 中藥學）",pharm:"含升麻素、異阿魏酸。具有解熱、抗炎、鎮痛、抗病毒、抗腫瘤作用。" },
  { p:"Fu Zi",c:"附子",lat:"Aconitum carmichaelii",eng:"Aconite Root (Processed)",cat:"Interior Warming",nat:"HOT",flav:["Pungent"],merid:["Heart","Kidney","Spleen"],dose:"3-15g",desc:"回陽救逆，補火助陽，散寒止痛。用於亡陽虛脫、肢冷脈微、陽虛水腫、心腹冷痛、虛寒吐瀉、陰寒水腫。為回陽救逆第一要藥。有大毒，須炮製後用，先煎30-60分鐘。（來源：theqi.com 中藥學）",pharm:"含烏頭鹼（炮製後水解為苯甲酰烏頭原鹼，毒性降至1/200）。具有強心、抗休克、鎮痛、抗炎作用。" },
  { p:"Rou Gui",c:"肉桂",lat:"Cinnamomum cassia",eng:"Cinnamon Bark",cat:"Interior Warming",nat:"HOT",flav:["Pungent","Sweet"],merid:["Kidney","Spleen","Heart","Liver"],dose:"1-5g",desc:"補火助陽，引火歸元，散寒止痛，溫通經脈。用於腎陽虛衰、命門火衰、陽痿宮冷、虛陽上浮、腹痛泄瀉、寒疝腹痛、痛經閉經。後下或研末沖服。（來源：theqi.com 中藥學）",pharm:"含桂皮醛。具有擴張血管、促進血液循環、健胃、鎮痛、鎮靜、抗菌作用。" },
  { p:"Wu Zhu Yu",c:"吳茱萸",lat:"Evodia rutaecarpa",eng:"Evodia Fruit",cat:"Interior Warming",nat:"HOT",flav:["Pungent","Bitter"],merid:["Liver","Spleen","Stomach"],dose:"2-5g",desc:"散寒止痛，降逆止嘔，助陽止瀉。用於厥陰頭痛、寒疝腹痛、寒濕腳氣、經行腹痛、脘腹脹痛、嘔吐吞酸、五更泄瀉。（來源：theqi.com 中藥學）",pharm:"含吳茱萸鹼、吳茱萸次鹼。具有鎮痛、止嘔、升壓、抗血栓作用。" },
  { p:"Jie Geng",c:"桔梗",lat:"Platycodon grandiflorus",eng:"Balloon Flower Root",cat:"Phlegm Resolving",nat:"NEUTRAL",flav:["Bitter","Pungent"],merid:["Lung"],dose:"3-10g",desc:"宣肺祛痰，利咽排膿。用於咳嗽痰多、胸悶不暢、咽痛音啞、肺癰吐膿、瘡瘍膿成不潰。為舟楫之劑，能載藥上行。（來源：theqi.com 中藥學）",pharm:"含桔梗皂苷。具有祛痰、鎮咳、抗炎、增強免疫、降血糖作用。" },
  { p:"Chuan Bei Mu",c:"川貝母",lat:"Fritillaria cirrhosa",eng:"Sichuan Fritillaria Bulb",cat:"Phlegm Resolving",nat:"COOL",flav:["Bitter","Sweet"],merid:["Lung","Heart"],dose:"3-10g",desc:"清熱潤肺，化痰止咳，散結消癰。用於肺熱燥咳、乾咳少痰、陰虛勞嗽、咳痰帶血、瘰癧、乳癰、肺癰。為潤肺止咳化痰要藥。（來源：theqi.com 中藥學）",pharm:"含川貝鹼。具有鎮咳、祛痰、平喘、降壓作用。川貝與浙貝區分：川貝潤肺，浙貝清熱。" },
  { p:"Xuan Shen",c:"玄參",lat:"Scrophularia ningpoensis",eng:"Figwort Root",cat:"Heat Clearing",nat:"COLD",flav:["Bitter","Sweet","Salty"],merid:["Lung","Stomach","Kidney"],dose:"10-15g",desc:"清熱涼血，滋陰降火，解毒散結。用於溫熱病熱入營血、身熱夜甚、心煩不眠、骨蒸勞熱、咽喉腫痛、目赤、瘰癧痰核。（來源：theqi.com 中藥學）",pharm:"含哈帕苷、肉桂酸。具有降壓、降血糖、抗炎、抗菌作用。" },
  { p:"Mu Dan Pi",c:"牡丹皮",lat:"Paeonia suffruticosa",eng:"Tree Peony Root Bark",cat:"Heat Clearing",nat:"COOL",flav:["Bitter","Pungent"],merid:["Heart","Liver","Kidney"],dose:"6-12g",desc:"清熱涼血，活血散瘀，退虛熱。用於溫病熱入血分、發斑、吐衄、陰虛發熱、無汗骨蒸、經閉痛經、癰腫瘡毒、跌打傷痛。（來源：theqi.com 中藥學）",pharm:"含丹皮酚。具有抗炎、抗過敏、鎮痛、降壓、抗凝血、抗菌作用。" },
  { p:"Cang Zhu",c:"蒼朮",lat:"Atractylodes lancea",eng:"Atractylodes Rhizome",cat:"Aromatic Dampness Dissolving",nat:"WARM",flav:["Pungent","Bitter"],merid:["Spleen","Stomach"],dose:"5-10g",desc:"燥濕健脾，祛風散寒，明目。用於濕阻中焦、脘腹脹滿、泄瀉水腫、風濕痹痛、風寒感冒、夜盲。與白朮區分：蒼朮偏燥濕，白朮偏補脾。（來源：theqi.com 中藥學）",pharm:"含蒼朮素、β-桉醇。具有健胃、鎮靜、降血糖、抗菌作用。" },
  { p:"Hou Po",c:"厚朴",lat:"Magnolia officinalis",eng:"Magnolia Bark",cat:"Aromatic Dampness Dissolving",nat:"WARM",flav:["Bitter","Pungent"],merid:["Spleen","Stomach","Lung","Large Intestine"],dose:"3-10g",desc:"燥濕消痰，下氣除滿。用於濕滯傷中、脘痞吐瀉、食積氣滯、腹脹便秘、痰飲喘咳。為消除脹滿要藥。（來源：theqi.com 中藥學）",pharm:"含厚朴酚、和厚朴酚。具有中樞抑制、肌肉鬆弛、抗菌、抗潰瘍作用。" },
  { p:"Sha Ren",c:"砂仁",lat:"Amomum villosum",eng:"Amomum Fruit",cat:"Aromatic Dampness Dissolving",nat:"WARM",flav:["Pungent"],merid:["Spleen","Stomach","Kidney"],dose:"3-6g",desc:"化濕開胃，溫脾止瀉，理氣安胎。用於濕濁中阻、脘腹脹痛、食欲不振、嘔吐泄瀉、妊娠惡阻、胎動不安。後下。（來源：theqi.com 中藥學）",pharm:"含乙酸龍腦酯等揮發油。具有促進消化液分泌、增強胃腸蠕動作用。" },
  { p:"Niu Xi",c:"牛膝",lat:"Achyranthes bidentata",eng:"Achyranthes Root",cat:"Blood Activating",nat:"NEUTRAL",flav:["Bitter","Sour"],merid:["Liver","Kidney"],dose:"5-15g",desc:"活血通經，補肝腎，強筋骨，利尿通淋，引血下行。用於經閉痛經、腰膝酸痛、筋骨無力、淋證、水腫、頭痛眩暈、齒痛、口瘡、吐血衄血。為引藥下行要藥。（來源：theqi.com 中藥學）",pharm:"含蛻皮甾酮、三萜皂苷。具有降壓、抗炎、鎮痛、利尿、改善記憶作用。" },
  { p:"Qin Jiao",c:"秦艽",lat:"Gentiana macrophylla",eng:"Large-Leaf Gentian Root",cat:"Wind-Dampness Expelling",nat:"COOL",flav:["Bitter","Pungent"],merid:["Stomach","Liver","Gallbladder"],dose:"5-10g",desc:"祛風濕，通絡止痛，退虛熱，清濕熱。用於風濕痹痛、筋脈拘攣、骨節疼痛、日晡潮熱、小兒疳積發熱、濕熱黃疸。為治痹要藥，寒熱虛實皆可用。（來源：theqi.com 中藥學）",pharm:"含龍膽苦苷、秦艽鹼甲。具有抗炎、鎮痛、鎮靜、降壓、抗過敏作用。" },
  { p:"Wei Ling Xian",c:"威靈仙",lat:"Clematis chinensis",eng:"Clematis Root",cat:"Wind-Dampness Expelling",nat:"WARM",flav:["Pungent","Salty"],merid:["Bladder"],dose:"6-10g",desc:"祛風濕，通經絡，止痹痛，消骨鯁。用於風濕痹痛、肢體麻木、筋脈拘攣、屈伸不利、骨鯁咽喉。性走竄，善通十二經絡。（來源：theqi.com 中藥學）",pharm:"含皂苷、白頭翁素。具有鎮痛、抗炎、抗菌作用。" },
  { p:"Mu Gua",c:"木瓜",lat:"Chaenomeles speciosa",eng:"Chinese Quince",cat:"Wind-Dampness Expelling",nat:"WARM",flav:["Sour"],merid:["Liver","Spleen"],dose:"6-12g",desc:"舒筋活絡，和胃化濕。用於風濕痹痛、筋脈拘攣、腰膝關節酸重疼痛、吐瀉轉筋、腳氣水腫。為治筋脈攣急要藥。（來源：theqi.com 中藥學）",pharm:"含皂苷、蘋果酸、齊墩果酸。具有抗炎、保肝、抗菌作用。" },
  { p:"Jin Yin Hua (Ren Dong)",c:"忍冬藤",lat:"Lonicera japonica",eng:"Honeysuckle Vine",cat:"Heat Clearing",nat:"COLD",flav:["Sweet"],merid:["Heart","Lung"],dose:"15-30g",desc:"清熱解毒，疏風通絡。用於溫病發熱、風濕熱痹、關節紅腫熱痛。為金銀花之藤莖，偏於通絡治痹。（來源：theqi.com 中藥學）",pharm:"含綠原酸、木犀草苷。具有抗菌、抗病毒、抗炎、解熱作用。" },
  { p:"Da Huang",c:"大黃",lat:"Rheum palmatum",eng:"Rhubarb Root",cat:"Purgatives",nat:"COLD",flav:["Bitter"],merid:["Spleen","Stomach","Large Intestine","Liver","Heart"],dose:"3-15g",desc:"瀉下攻積，清熱瀉火，涼血解毒，逐瘀通經，利膽退黃。用於實熱便秘、積滯腹痛、瀉痢不爽、濕熱黃疸、血熱吐衄、目赤咽腫、癰腫疔瘡、瘀血經閉、跌打損傷。為瀉下通便要藥。（來源：theqi.com 中藥學）",pharm:"含蒽醌衍生物（大黃素、大黃酸、蘆薈大黃素）。具有瀉下、抗菌、抗腫瘤、降脂、保腎、止血作用。" },
];

// New acupoints from Lung + Stomach meridians
interface AP {
  code: string; p: string; c: string; eng: string; merid: string;
  loc: string; depth: string; act: string; ind: string;
}

const ACUPOINTS: AP[] = [
  { code:"LU1",p:"Zhong Fu",c:"中府",eng:"Central Treasury",merid:"Lung",loc:"胸壁外上部，平第一肋間隙，距胸骨正中線6寸",depth:"0.5-0.8 cun, oblique insertion",act:"宣肺理氣，清瀉肺熱，健脾化痰",ind:"咳嗽、氣喘、胸痛、肩背痛、腹脹" },
  { code:"LU9",p:"Tai Yuan",c:"太淵",eng:"Supreme Abyss",merid:"Lung",loc:"腕橫紋上，橈動脈橈側凹陷中",depth:"0.3-0.5 cun, perpendicular insertion",act:"補肺益氣，止咳化痰，通調血脈",ind:"咳嗽、氣喘、咽喉腫痛、胸痛、腕臂痛、無脈症" },
  { code:"LU11",p:"Shao Shang",c:"少商",eng:"Lesser Shang",merid:"Lung",loc:"拇指橈側指甲角旁0.1寸",depth:"0.1 cun, prick to bleed",act:"清熱解毒，開竅蘇厥，利咽消腫",ind:"咽喉腫痛、中風昏迷、高熱、癲狂" },
  { code:"ST2",p:"Si Bai",c:"四白",eng:"Four Whites",merid:"Stomach",loc:"目正視，瞳孔直下，眶下孔凹陷處",depth:"0.3-0.5 cun, perpendicular insertion",act:"祛風明目，通絡止痛",ind:"目赤痛癢、眼瞼動、面痛、頭痛眩暈" },
  { code:"ST6",p:"Jia Che",c:"頰車",eng:"Jaw Bone",merid:"Stomach",loc:"下頜角前上方一橫指，咬肌隆起處",depth:"0.3-0.5 cun, perpendicular or oblique",act:"疏風清熱，開關通絡",ind:"齒痛、面痛、腮腺炎、口眼歪斜" },
  { code:"ST7",p:"Xia Guan",c:"下關",eng:"Below the Joint",merid:"Stomach",loc:"顴弓下緣，下頜骨髁突前方凹陷處",depth:"0.5-1.0 cun, perpendicular insertion",act:"消腫止痛，聰耳通絡",ind:"牙痛、面痛、耳聾、耳鳴、口眼歪斜" },
  { code:"ST8",p:"Tou Wei",c:"頭維",eng:"Head Corner",merid:"Stomach",loc:"額角髮際上0.5寸，距頭正中線4.5寸",depth:"0.5-1.0 cun, transverse insertion",act:"疏風清熱，明目止痛",ind:"頭痛、目眩、迎風流淚" },
  { code:"ST44",p:"Nei Ting",c:"內庭",eng:"Inner Court",merid:"Stomach",loc:"第2、3趾間趾蹼緣後方赤白肉際處",depth:"0.3-0.5 cun, perpendicular insertion",act:"清胃瀉熱，理氣止痛",ind:"齒痛、咽喉腫痛、鼻衄、口歪、胃痛吐酸、腹痛泄瀉、痢疾、足背腫痛" },
];

async function main() {
  console.log(`\n[expand] Adding ${HERBS.length} herbs + ${ACUPOINTS.length} acupoints…\n`);

  let hc = 0;
  for (const h of HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.p } });
    if (dup) { console.log(`  ↷ herb: ${h.p}`); continue; }
    await prisma.herb.create({
      data: {
        pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng,
        category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid,
        dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED",
      },
    });
    console.log(`  ✓ herb: ${h.c} (${h.p})`);
    hc++;
  }

  let ac = 0;
  for (const a of ACUPOINTS) {
    const dup = await prisma.acupuncturePoint.findFirst({ where: { code: a.code } });
    if (dup) { console.log(`  ↷ acu: ${a.code}`); continue; }
    await prisma.acupuncturePoint.create({
      data: {
        code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng,
        meridian: a.merid, location: a.loc, depth: a.depth,
        actions: a.act, indications: a.ind, status: "PUBLISHED",
      },
    });
    console.log(`  ✓ acu: ${a.code} ${a.c}`);
    ac++;
  }

  console.log(`\n[expand] +${hc} herbs +${ac} acupoints`);
  const stats = await Promise.all([prisma.herb.count(), prisma.acupuncturePoint.count()]);
  console.log(`  DB: ${stats[0]} herbs · ${stats[1]} acupoints\n`);
  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
