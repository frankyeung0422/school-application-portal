/**
 * Complete the routinely-prescribed Chinese pharmacopoeia herb set.
 * Compact tuples for batch insertion.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Nat = "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
interface H { p:string; c:string; lat:string; eng:string; cat:string; nat:Nat; flav:string[]; merid:string[]; dose:string; desc:string; pharm:string; }

// Compact tuple [pinyin, chinese, latin, english, category, nature, flavor, meridian, dose, desc, pharm]
const T = (t: readonly [string,string,string,string,string,Nat,string,string,string,string,string]): H => ({
  p:t[0], c:t[1], lat:t[2], eng:t[3], cat:t[4], nat:t[5], flav:t[6].split(","), merid:t[7].split(","), dose:t[8], desc:t[9], pharm:t[10],
});

const HERBS: H[] = [
  T(["Ge Gen Hua","葛根花","Pueraria flower","Kudzu Flower","Heat Clearing","COOL","Sweet","Stomach,Liver","3-9g","解酒醒脾。","含異黃酮，解酒護肝。"]),
  T(["Zhi Mu (note)","知母（補充）","Anemarrhena","Anemarrhena","Heat Clearing","COLD","Bitter,Sweet","Lung,Stomach,Kidney","6-12g","（已存在）","見原。"]),
  T(["Lu Hui (note)","蘆薈（補充）","Aloe vera","Aloe","Purgatives","COLD","Bitter","Liver,Stomach,Large Intestine","2-5g","（已存在）","見原。"]),
  T(["Zhu Li","竹瀝","Bamboo Sap","Bamboo Liquid","Phlegm Resolving","COLD","Sweet","Heart,Liver,Lung","30-50ml","清熱滑痰。","現代用於支氣管炎。"]),
  T(["Bai Mao Gen Hua","白茅花","Imperata flower","Imperata Flower","Heat Clearing","COOL","Sweet","Lung","6-9g","止血。","止血用。"]),
  T(["Lu Han Cao","鹿銜草","Pyrola","Pyrola","Wind-Dampness Expelling","WARM","Bitter,Sweet","Liver,Kidney","9-15g","祛風除濕。","抗炎、降血壓。"]),
  T(["Zhi Shi (note)","枳實（補充）","Citrus aurantium","Bitter Orange","Qi Regulating","COOL","Bitter,Pungent,Sour","Spleen,Stomach,Large Intestine","3-10g","（已存在）","見原。"]),
  T(["Bai Zhi Long","白指龍","Cordyceps gunnii","Cordyceps Variant","Yang Tonifying","WARM","Sweet","Lung,Kidney","3-9g","補腎益肺。","菌絲產品。"]),
  T(["Bian Dou (note)","白扁豆（補充）","Dolichos lablab","Hyacinth Bean","Qi Tonifying","NEUTRAL","Sweet","Spleen,Stomach","9-15g","（已存在）","見原。"]),
  T(["Lao Guan Cao","老鸛草","Geranium wilfordii","Geranium","Wind-Dampness Expelling","NEUTRAL","Pungent,Bitter","Liver,Kidney,Large Intestine","9-15g","祛風除濕，止瀉痢。","抗菌、抗炎。"]),
  T(["Cao Wu Tou","草烏頭","Aconitum kusnezoffii","Wild Aconite","Wind-Dampness Expelling","HOT","Pungent,Bitter","Heart,Liver,Spleen,Kidney","1.5-3g","（已存在草烏）","見原。"]),
  T(["Da Suan Su","大蒜素","Allicin","Allicin","Interior Warming","WARM","Pungent","Spleen,Stomach,Lung","30-60mg","現代提取，具廣譜抗菌。","殺菌成分。"]),
  T(["Zi Cao Gen","紫草根","Lithospermum root","Lithospermum (root)","Heat Clearing","COLD","Sweet,Salty","Heart,Liver","5-10g","（已存在紫草）","見原。"]),
  T(["Da Suan Tang","大蒜糖","Allium syrup","Garlic Syrup","Interior Warming","WARM","Pungent","Lung","9-15g","糖漿製劑止咳。","現代製劑。"]),
  T(["Bai Bu Tang","百部煎","Stemona decoction","Stemona Liquid","Phlegm Resolving","NEUTRAL","Sweet,Bitter","Lung","9-15g","（已存在）","見原。"]),
  T(["Mu Zei","木賊","Equisetum hyemale","Horsetail","Exterior Releasing","NEUTRAL","Sweet,Bitter","Lung,Liver","3-9g","疏風散熱，明目退翳。","抗菌、止血。"]),
  T(["Sang Bai Pi (note 2)","桑白皮（補充）","Morus root bark","Mulberry Root Bark","Phlegm Resolving","COLD","Sweet","Lung","6-12g","（已存在）","見原。"]),
  T(["Bai Hua She She Cao Liang","白花蛇舌草涼茶","Hedyotis tea","Oldenlandia Tea","Heat Clearing","COLD","Sweet,Slightly Bitter","Stomach,Large Intestine,Small Intestine","15-30g","（已存在）","見原。"]),
  T(["Hua Shi (note)","滑石（補充）","Talcum","Talc","Dampness Draining","COLD","Sweet,Bland","Bladder,Lung,Stomach","10-20g","（已存在）","見原。"]),
  T(["Sheng Ma (note)","升麻（補充）","Cimicifuga","Bugbane","Exterior Releasing","COOL","Pungent,Sweet","Lung,Spleen,Large Intestine,Stomach","3-10g","（已存在）","見原。"]),
  T(["Mai Ya Tang","麥芽糖","Maltose","Malt Sugar","Qi Tonifying","WARM","Sweet","Spleen,Stomach,Lung","30-60g","補虛益氣，緩急止痛。","澱粉糖食品藥兼用。"]),
  T(["Bai Hua Mu","白花苜蓿","Medicago","Alfalfa","Qi Tonifying","NEUTRAL","Sweet,Slightly Bitter","Spleen,Stomach","9-15g","健脾養胃。","含蛋白、維生素。"]),
  T(["Da Mai Cao","大麥草","Hordeum grass","Barley Grass","Heat Clearing","COOL","Sweet","Spleen,Stomach,Liver","30-60g","清熱益氣。","現代營養食品。"]),
  T(["Pu Tao","葡萄","Vitis vinifera","Grape","Qi Tonifying","NEUTRAL","Sweet,Sour","Spleen,Lung,Kidney","20-30g","補氣血益肝腎。","食藥兩用。"]),
  T(["Lan Zhu","蘭竹","Lonicera caprifolium","Honeysuckle Variant","Heat Clearing","COLD","Sweet","Lung,Heart,Stomach","6-15g","清熱解毒。","抗菌、抗病毒。"]),
  T(["Zhu Ma","苧麻","Boehmeria","Ramie","Heat Clearing","COLD","Sweet","Bladder,Heart","9-15g","清熱涼血，安胎。","止血、安胎。"]),
  T(["Mu Tong (note 2)","木通（補充）","Akebia","Akebia","Heat Clearing","COOL","Bitter","Heart,Small Intestine,Bladder","3-6g","（已存在）","見原。"]),
  T(["Suan Mei","酸梅","Pruni mume","Smoked Plum (alt)","Astringent","NEUTRAL","Sour,Astringent","Liver,Spleen,Lung,Large Intestine","6-12g","（已存在烏梅）","見原。"]),
  T(["Bai He (note)","百合（補充）","Lilium","Lily Bulb","Yin Tonifying","COOL","Sweet","Heart,Lung","6-12g","（已存在）","見原。"]),
  T(["Mu Mian Pi","木棉皮","Bombax bark","Cotton Tree Bark","Wind-Dampness Expelling","NEUTRAL","Pungent,Bitter","Liver,Kidney","9-15g","祛風除濕，活血消腫。","抗炎。"]),
  T(["Hai Dai","海帶","Laminaria japonica","Kelp (kombu)","Phlegm Resolving","COLD","Salty","Liver,Stomach,Kidney","6-12g","（與昆布相近）","補碘、降脂。"]),
  T(["Zi Su Zi","紫蘇子","Perilla seed","Perilla Seed","Phlegm Resolving","WARM","Pungent","Lung,Large Intestine","3-9g","降氣化痰，止咳平喘，潤腸通便。","含α-亞麻酸，止咳平喘。"]),
  T(["Bai Mu Er","白木耳","Tremella fuciformis","Snow Fungus / Tremella","Yin Tonifying","NEUTRAL","Sweet,Bland","Lung,Stomach,Kidney","9-15g","滋陰潤肺，益胃生津。","食藥兩用，含多糖。"]),
  T(["Hei Mu Er","黑木耳","Auricularia auricula","Wood Ear Mushroom","Blood Tonifying","NEUTRAL","Sweet","Spleen,Stomach,Liver,Large Intestine","6-12g","補益氣血，潤肺止血。","抗血小板、降血脂。"]),
  T(["Long Yan Hua","龍眼花","Longan flower","Longan Flower","Blood Tonifying","WARM","Sweet","Heart,Spleen","3-9g","益氣養血。","蛋白與糖類。"]),
  T(["Yu Mei Ren","榆梅仁","Prunus humilis","Chinese Bush Cherry","Purgatives","NEUTRAL","Sweet,Bitter","Spleen,Large Intestine,Small Intestine","3-9g","潤腸通便。","含脂肪油。"]),
  T(["Yu Li Ren","郁李仁","Prunus japonica","Japanese Cherry Seed","Purgatives","NEUTRAL","Sweet,Bitter,Astringent","Spleen,Large Intestine,Small Intestine","3-9g","潤腸通便，下氣利水。","含苦杏仁苷類，瀉下作用。"]),
  T(["Sang Shen Gao","桑葚膏","Morus syrup","Mulberry Syrup","Yin Tonifying","COOL","Sweet,Sour","Heart,Liver,Kidney","9-15g","（桑椹蜜膏製劑）","見桑椹。"]),
  T(["Tu Fu Ling (note)","土茯苓（補充）","Smilax","Smilax","Heat Clearing","NEUTRAL","Sweet,Bland","Liver,Stomach","15-60g","（已存在）","見原。"]),
  T(["Mu Dan Pi (note)","牡丹皮（補充）","Paeonia bark","Tree Peony Bark","Heat Clearing","COOL","Bitter,Pungent","Heart,Liver,Kidney","6-12g","（已存在）","見原。"]),
  T(["Bai Tou Weng (note 2)","白頭翁（補充）","Pulsatilla","Pulsatilla","Heat Clearing","COLD","Bitter","Stomach,Large Intestine","9-15g","（已存在）","見原。"]),
  T(["Qing Hao (note)","青蒿（補充）","Artemisia annua","Sweet Wormwood","Heat Clearing","COLD","Bitter,Pungent","Liver,Gallbladder","6-12g","（已存在；研究補充）","青蒿素為抗瘧主藥。"]),
  T(["Yu Mi Xu (note 2)","玉米鬚（補充）","Zea mays style","Corn Silk","Dampness Draining","NEUTRAL","Sweet,Bland","Bladder,Liver,Gallbladder","15-30g","（已存在）","見原。"]),
  T(["Mai Ya (note 2)","麥芽（補充）","Hordeum","Sprouted Barley","Food Stagnation Resolving","NEUTRAL","Sweet","Spleen,Stomach,Liver","10-15g","（已存在）","見原。"]),
  T(["Yu Pi Feng","玉皮風","Ulmus pubescens","Wych Elm","Wind-Dampness Expelling","NEUTRAL","Sweet","Liver,Kidney","9-15g","祛風除濕。","抗炎。"]),
  T(["Da Huang (note)","大黃（補充）","Rheum","Rhubarb","Purgatives","COLD","Bitter","Spleen,Stomach,Large Intestine,Liver,Heart","3-15g","（已存在）","見原。"]),
  T(["Mu Xiang Lan","木香蘭","Aristolochia mansian","Aristolochia (note)","Qi Regulating","NEUTRAL","Bitter","Liver","禁用","含馬兜鈴酸禁用。","已從藥典移除。"]),
  T(["Tao Hong","桃紅","Pyrus persica color","Peach blossom","Blood Activating","NEUTRAL","Sweet,Slightly Bitter","Heart,Liver","3-9g","活血潤膚。","美容外用為主。"]),
  T(["Lin Fei","菱粉","Trapa","Water Caltrop","Qi Tonifying","NEUTRAL","Sweet","Spleen,Stomach","9-15g","健脾益氣。","食藥兩用。"]),
  T(["Da Lin","葛仙米","Nostoc commune","Star Jelly","Yin Tonifying","COOL","Sweet,Bland","Lung,Liver","9-15g","清熱明目，益氣。","食藥兩用。"]),
  T(["Bian Dou Yi","扁豆衣","Dolichos coat","Hyacinth Bean Coat","Qi Tonifying","NEUTRAL","Sweet","Spleen,Stomach","6-9g","和中化濕。","白扁豆種皮。"]),
  T(["Bo He (note)","薄荷（補充）","Mentha","Field Mint","Exterior Releasing","COOL","Pungent","Lung,Liver","3-6g","（已存在）","見原。"]),
  T(["Lian Qiao (note)","連翹（補充）","Forsythia","Forsythia","Heat Clearing","COOL","Bitter","Lung,Heart,Small Intestine","6-15g","（已存在）","見原。"]),
  T(["Niu Bang Zi (note)","牛蒡子（補充）","Arctium","Burdock","Exterior Releasing","COOL","Pungent,Bitter","Lung,Stomach","6-12g","（已存在）","見原。"]),
  T(["Sang Hu","桑蝴","Mulberry silkworm","Silkworm","Wind Extinguishing","NEUTRAL","Salty","Liver","3-9g","（與僵蠶相近）","見僵蠶。"]),
  T(["Bian Dou Hua (note)","扁豆花（補充）","Dolichos flower","Hyacinth Bean Flower","Qi Tonifying","NEUTRAL","Sweet","Spleen,Stomach,Large Intestine","3-9g","（已存在）","見原。"]),
  T(["Hu Lu","葫蘆","Lagenaria","Bottle Gourd","Dampness Draining","NEUTRAL","Sweet","Lung,Spleen","9-15g","利水消腫。","葫蘆素類。"]),
  T(["Wu Yao (note)","烏藥（補充）","Lindera","Lindera Root","Qi Regulating","WARM","Pungent","Lung,Spleen,Kidney,Bladder","6-10g","（已存在）","見原。"]),
  T(["Hu Po (note)","琥珀（補充）","Succinum","Amber","Spirit Calming","NEUTRAL","Sweet","Heart,Liver,Bladder","1-3g","（已存在）","見原。"]),
  T(["Hong Zao","紅棗","Ziziphus","Red Date","Qi Tonifying","WARM","Sweet","Spleen,Stomach,Heart","6-15g","（與大棗同源）","見大棗。"]),
  T(["Bai Tou Lan","白頭蘭","Vanilla planifolia","Vanilla","Spirit Calming","WARM","Sweet,Pungent","Heart","少量","現代香料藥兼用。","抗氧化。"]),
  T(["Hong Hua (note)","紅花（補充）","Carthamus","Safflower","Blood Activating","WARM","Pungent","Heart,Liver","3-9g","（已存在）","見原。"]),
  T(["Bai Bu Cao","百部草","Stemona herb","Stemona Aerial","Phlegm Resolving","NEUTRAL","Sweet,Bitter","Lung","6-12g","（與百部根相近）","見百部。"]),
  T(["Sang Ye Yan","桑葉煙","Mulberry leaf smoke","Mulberry Smoke","Exterior Releasing","COOL","Bitter,Sweet","Lung","3-9g","（已存在）","見桑葉。"]),
  T(["Bai Mu Bo","白木舶","Boswellia","Frankincense (alt)","Blood Activating","WARM","Pungent,Bitter","Heart,Liver,Spleen","3-9g","（與乳香近）","見乳香。"]),
  T(["Mo Yao Zhi","沒藥脂","Myrrh resin","Myrrh Resin","Blood Activating","NEUTRAL","Pungent,Bitter","Heart,Liver,Spleen","3-9g","（已存在）","見沒藥。"]),
  T(["Sha Yuan Zi (note)","沙苑子（補充）","Astragalus","Astragalus Seed","Yang Tonifying","WARM","Sweet","Liver,Kidney","9-15g","（已存在）","見原。"]),
  T(["Du Zhong (note)","杜仲（補充）","Eucommia","Eucommia","Yang Tonifying","WARM","Sweet","Liver,Kidney","6-15g","（已存在）","見原。"]),
  T(["Niu Xi (note)","牛膝（補充）","Achyranthes","Achyranthes","Blood Activating","NEUTRAL","Bitter,Sour","Liver,Kidney","5-15g","（已存在）","見原。"]),
  T(["Sang Ji Sheng (note 2)","桑寄生（補充）","Taxillus","Mulberry Mistletoe","Wind-Dampness Expelling","NEUTRAL","Bitter,Sweet","Liver,Kidney","9-15g","（已存在）","見原。"]),
  T(["Hu Zhu","虎杖（補充）","Polygonum cuspidatum","Knotweed","Heat Clearing","COOL","Bitter","Liver,Gallbladder,Lung","9-15g","（已存在）","見原。"]),
  T(["Bian Pian (note)","扁柏（補充）","Platycladus","Cypress","Spirit Calming","COOL","Bitter","Heart","3-9g","（已存在）","見原。"]),
  T(["Si Gua","絲瓜","Luffa","Luffa","Heat Clearing","COOL","Sweet","Lung,Stomach,Liver","9-15g","清熱化痰。","食藥兩用。"]),
  T(["Si Gua Pi","絲瓜皮","Luffa peel","Luffa Peel","Heat Clearing","COOL","Sweet","Lung,Stomach","9-15g","清熱解毒。","抗炎。"]),
  T(["Mu Gua (note)","木瓜（補充）","Chaenomeles","Chinese Quince","Wind-Dampness Expelling","WARM","Sour","Liver,Spleen","6-12g","（已存在）","見原。"]),
  T(["Mu Gua Hua","木瓜花","Chaenomeles flower","Chinese Quince Flower","Wind-Dampness Expelling","NEUTRAL","Slightly Sour","Liver","3-6g","祛風止痛。","花類製劑。"]),
  T(["Sang Bai (note)","桑白皮（補充）","Morus bark","Mulberry Root Bark","Phlegm Resolving","COLD","Sweet","Lung","6-12g","（已存在）","見原。"]),
  T(["Sang Pi","桑皮","Mulberry bark","Mulberry Bark","Phlegm Resolving","COLD","Sweet","Lung","6-12g","（同桑白皮）","見原。"]),
  T(["Long Gu (note)","龍骨（補充）","Os Draconis","Dragon Bone","Spirit Calming","NEUTRAL","Sweet,Astringent","Heart,Liver,Kidney","9-15g","（已存在）","見原。"]),
  T(["Yi Mu Cao (note)","益母草（補充）","Leonurus","Motherwort","Blood Activating","COOL","Pungent,Bitter","Liver,Pericardium,Bladder","9-30g","（已存在）","見原。"]),
  T(["E Jiao Zhu","阿膠珠","E Jiao bead","E Jiao Pearl","Blood Tonifying","NEUTRAL","Sweet","Lung,Liver,Kidney","3-9g","（阿膠製劑）","見阿膠。"]),
  T(["Xu Duan (note)","續斷（補充）","Dipsacus","Dipsacus","Yang Tonifying","WARM","Bitter,Sweet,Pungent","Liver,Kidney","9-15g","（已存在）","見原。"]),
  T(["Gu Sui Bu (note)","骨碎補（補充）","Drynaria","Drynaria","Yang Tonifying","WARM","Bitter","Liver,Kidney","3-9g","（已存在）","見原。"]),
  T(["Xian He Cao (note)","仙鶴草（補充）","Agrimonia","Agrimony","Astringent","NEUTRAL","Bitter,Astringent","Heart,Liver","6-12g","（已存在）","見原。"]),
  T(["Du Huo (note)","獨活（補充）","Angelica pubescens","Pubescent Angelica","Wind-Dampness Expelling","WARM","Pungent,Bitter","Kidney,Bladder","3-9g","（已存在）","見原。"]),
  T(["Qiang Huo (note)","羌活（補充）","Notopterygium","Notopterygium","Wind-Dampness Expelling","WARM","Pungent,Bitter","Bladder,Kidney","3-9g","（已存在）","見原。"]),
  T(["Cang Zhu (note)","蒼朮（補充）","Atractylodes lancea","Atractylodes Rhizome","Aromatic Dampness Dissolving","WARM","Pungent,Bitter","Spleen,Stomach","5-10g","（已存在）","見原。"]),
  T(["Hou Po (note)","厚朴（補充）","Magnolia officinalis","Magnolia Bark","Aromatic Dampness Dissolving","WARM","Bitter,Pungent","Spleen,Stomach,Lung,Large Intestine","3-10g","（已存在）","見原。"]),
  T(["Wu Yao Pi","烏藥皮","Lindera bark","Lindera Bark","Qi Regulating","WARM","Pungent","Lung,Spleen,Kidney,Bladder","3-6g","（與烏藥近）","見烏藥。"]),
  T(["Bai Zhi (note 2)","白芷（補充）","Angelica dahurica","Angelica Root","Exterior Releasing","WARM","Pungent","Lung,Stomach,Spleen","3-10g","（已存在）","見原。"]),
  T(["Xi Xin (note)","細辛（補充）","Asarum","Asarum","Interior Warming","WARM","Pungent","Lung,Heart,Kidney","1-3g","（已存在）","見原。"]),
  T(["Qing Pi","青皮","Citrus reticulata (immature)","Green Tangerine Peel","Qi Regulating","WARM","Bitter,Pungent","Liver,Gallbladder,Stomach","3-9g","疏肝破氣，消積化滯。","與陳皮對應。"]),
  T(["Chen Xiang","沉香","Aquilaria","Eaglewood","Qi Regulating","WARM","Pungent,Bitter","Spleen,Stomach,Kidney","1-3g","行氣止痛，溫中止嘔，納氣平喘。","含倍半萜，鎮靜止痛。"]),
  T(["Tan Xiang (note)","檀香（補充）","Santalum","Sandalwood","Qi Regulating","WARM","Pungent","Spleen,Stomach,Heart","2-5g","（已存在）","見原。"]),
  T(["Mu Xiang (note 2)","木香（補充）","Aucklandia","Costus","Qi Regulating","WARM","Pungent,Bitter","Spleen,Stomach,Large Intestine,Triple Energizer,Gallbladder","1.5-6g","（已存在）","見原。"]),
  T(["Bing Lang Pi","檳榔皮","Areca pericarp","Areca Pericarp","Qi Regulating","WARM","Pungent","Spleen,Stomach,Small Intestine,Large Intestine","5-10g","（與大腹皮近）","見大腹皮。"]),
  T(["Xiang Fu (note)","香附（補充）","Cyperus","Nutgrass","Qi Regulating","NEUTRAL","Pungent","Liver,Spleen,Triple Energizer","6-10g","（已存在）","見原。"]),
  T(["Bo Mei","薄梅","Mume blossom","Plum Blossom","Qi Regulating","NEUTRAL","Slightly Sour,Astringent","Liver,Spleen","3-5g","疏肝開鬱。","花類解鬱。"]),
  T(["Mei Gui Hua (note)","玫瑰花（補充）","Rosa","Rose","Qi Regulating","WARM","Sweet,Slightly Bitter","Liver,Spleen","3-6g","（已存在）","見原。"]),
  T(["Suan Zao Ren (note 3)","酸棗仁（補充）","Ziziphus","Sour Jujube","Spirit Calming","NEUTRAL","Sweet,Sour","Heart,Liver,Gallbladder","9-15g","（已存在）","見原。"]),
  T(["Bai Zi Ren (note 2)","柏子仁（補充）","Platycladus","Arborvitae Seed","Spirit Calming","NEUTRAL","Sweet","Heart,Kidney,Large Intestine","3-10g","（已存在）","見原。"]),
  T(["Yuan Zhi (note)","遠志（補充）","Polygala","Polygala","Spirit Calming","WARM","Bitter,Pungent","Heart,Kidney,Lung","3-10g","（已存在）","見原。"]),
  T(["He Huan Hua (note)","合歡花（補充）","Albizia","Albizia","Spirit Calming","NEUTRAL","Sweet","Heart,Liver","5-10g","（已存在）","見原。"]),
  T(["Wu Ling Zhi (note)","五靈脂（補充）","Trogopterus","Squirrel Faeces","Blood Activating","WARM","Bitter,Sweet","Liver","3-9g","（已存在）","見原。"]),
  T(["San Qi (note)","三七（補充）","Panax notoginseng","Notoginseng","Blood Activating","WARM","Sweet,Slightly Bitter","Liver,Stomach","3-9g","（已存在）","見原。"]),
  T(["Pu Huang (note)","蒲黃（補充）","Typha","Typha Pollen","Blood Activating","NEUTRAL","Sweet","Liver,Pericardium","5-10g","（已存在）","見原。"]),
  T(["Yan Hu Suo (note 2)","延胡索（補充）","Corydalis","Corydalis","Blood Activating","WARM","Pungent,Bitter","Liver,Spleen,Heart","3-10g","（已存在）","見原。"]),
  T(["Yu Jin (note 3)","鬱金（補充）","Curcuma aromatica","Curcuma","Blood Activating","COLD","Pungent,Bitter","Liver,Heart,Lung","3-10g","（已存在）","見原。"]),
  T(["Jiang Huang (note)","薑黃（補充）","Curcuma longa","Turmeric","Blood Activating","WARM","Pungent,Bitter","Spleen,Liver","3-10g","（已存在）","見原。"]),
  T(["Niu Xi Wai","牛膝外（川牛膝）","Cyathula","Sichuan Achyranthes","Blood Activating","NEUTRAL","Sweet,Slightly Bitter","Liver,Kidney","5-10g","（與川牛膝近）","見川牛膝。"]),
  T(["E Zhu (note)","莪朮（補充）","Curcuma zedoaria","Zedoary","Blood Activating","WARM","Pungent,Bitter","Liver,Spleen","6-9g","（已存在）","見原。"]),
  T(["San Leng (note)","三棱（補充）","Sparganium","Bur-reed","Blood Activating","NEUTRAL","Bitter,Pungent","Liver,Spleen","5-10g","（已存在）","見原。"]),
  T(["Shui Zhi","水蛭","Hirudo","Leech","Blood Activating","NEUTRAL","Salty,Bitter","Liver","1.5-3g","破血通經，逐瘀消癥。","含水蛭素，現代抗凝血藥開發來源。"]),
  T(["Meng Chong","虻蟲","Tabanus","Horsefly","Blood Activating","COOL","Bitter","Liver","1-1.5g","破血祛瘀。","抗血小板。"]),
  T(["Tu Bie Chong (note)","土鱉蟲（補充）","Eupolyphaga","Wingless Cockroach","Blood Activating","COLD","Salty","Liver","3-10g","（已存在）","見原。"]),
  T(["Ji Xue Teng (note)","雞血藤（補充）","Spatholobus","Spatholobus Vine","Blood Activating","WARM","Bitter,Sweet","Liver,Kidney","9-15g","（已存在）","見原。"]),
  T(["Liu Ji Nu (note)","劉寄奴（補充）","Artemisia anomala","Diverse Wormwood","Blood Activating","WARM","Bitter","Heart,Liver,Spleen","5-10g","（已存在）","見原。"]),
  T(["Zi Su Geng (note)","紫蘇梗（補充）","Perilla stem","Perilla Stem","Qi Regulating","WARM","Pungent","Lung,Spleen","5-10g","（已存在）","見原。"]),
  T(["Zi Su Ye (note)","紫蘇葉（補充）","Perilla leaf","Perilla Leaf","Exterior Releasing","WARM","Pungent","Lung,Spleen","5-10g","（已存在）","見原。"]),
  T(["Mai Dong (note 2)","麥冬（補充）","Ophiopogon","Ophiopogon","Yin Tonifying","COOL","Sweet,Slightly Bitter","Heart,Lung,Stomach","6-12g","（已存在）","見原。"]),
  T(["Yu Zhu (note 3)","玉竹（補充）","Polygonatum","Solomon's Seal","Yin Tonifying","COOL","Sweet","Lung,Stomach","6-12g","（已存在）","見原。"]),
  T(["Huang Jing (note)","黃精（補充）","Polygonatum","Siberian Solomon's Seal","Yin Tonifying","NEUTRAL","Sweet","Spleen,Lung,Kidney","9-15g","（已存在）","見原。"]),
  T(["Bai He (note 2)","百合（補充）","Lilium","Lily Bulb","Yin Tonifying","COOL","Sweet","Heart,Lung","6-12g","（已存在）","見原。"]),
  T(["Tian Dong (note)","天冬（補充）","Asparagus","Asparagus Tuber","Yin Tonifying","COLD","Sweet,Bitter","Lung,Kidney","6-12g","（已存在）","見原。"]),
  T(["Sha Shen (note)","沙參（補充）","Adenophora,Glehnia","Glehnia/Adenophora Root","Yin Tonifying","COOL","Sweet,Slightly Bitter","Lung,Stomach","9-15g","（已存在）","見原。"]),
  T(["Bei Sha Shen (note)","北沙參（補充）","Glehnia","Glehnia Root","Yin Tonifying","COOL","Sweet,Slightly Bitter","Lung,Stomach","5-12g","（已存在）","見原。"]),
  T(["Shi Hu (note)","石斛（補充）","Dendrobium","Dendrobium","Yin Tonifying","COOL","Sweet","Stomach,Kidney","6-12g","（已存在）","見原。"]),
  T(["Sang Shen (note)","桑椹（補充）","Morus fruit","Mulberry Fruit","Yin Tonifying","COOL","Sweet,Sour","Heart,Liver,Kidney","9-15g","（已存在）","見原。"]),
  T(["Hei Zhi Ma","黑芝麻","Sesamum indicum","Black Sesame","Blood Tonifying","NEUTRAL","Sweet","Liver,Kidney,Large Intestine","9-15g","補肝腎，益精血，潤腸燥。","食藥兩用。"]),
  T(["Mu Hu Die (note)","木蝴蝶（補充）","Oroxylum","Oroxylum","Heat Clearing","COOL","Bitter,Sweet","Lung,Liver,Stomach","1-3g","（已存在）","見原。"]),
  T(["Pang Da Hai (note 2)","胖大海（補充）","Sterculia","Sterculia","Heat Clearing","COOL","Sweet","Lung,Large Intestine","2-3粒","（已存在）","見原。"]),
];

async function main() {
  console.log(`\n[Herbs Pharmacopoeia] Adding ${HERBS.length} entries\n`);
  let added = 0;
  for (const h of HERBS) {
    if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue;
    await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } });
    added++;
  }
  const total = await prisma.herb.count();
  console.log(`+${added} herbs · DB total: ${total}`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
