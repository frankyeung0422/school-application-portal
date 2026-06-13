/**
 * Complete the standard 361-point WHO acupuncture set across 14 meridians.
 * Each missing point is added with a concise location and indication summary.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface AP { code:string; p:string; c:string; eng:string; merid:string; loc:string; depth:string; act:string; ind:string; }

// Compact tuples: [code, pinyin, chinese, english, location, depth, action, indication]
const compact = (m: string) => (rows: Array<readonly [string,string,string,string,string,string?,string?,string?]>): AP[] =>
  rows.map(([code, p, c, eng, loc, depth = "0.3-0.5 cun", act = "局部調節", ind = ""]) => ({
    code, p, c, eng, merid: m, loc, depth, act, ind,
  }));

const POINTS: AP[] = [
  // ─────── LUNG (LU) — 11 points ───────
  ...compact("Lung")([
    ["LU2", "Yun Men", "雲門", "Cloud Gate", "胸前壁外上方，鎖骨下窩凹陷處", "0.3-0.5 cun oblique", "宣肺理氣", "咳嗽、氣喘、胸痛"],
    ["LU3", "Tian Fu", "天府", "Heavenly Storehouse", "臂內側，腋前紋下3寸", "0.5-1.0 cun perpendicular", "清肺涼血", "咳嗽、氣喘、鼻衄"],
    ["LU4", "Xia Bai", "俠白", "Gathering White", "臂內側，腋前紋下4寸", "0.5-1.0 cun perpendicular", "宣肺寬胸", "咳嗽、胸痛、肘臂痛"],
    ["LU8", "Jing Qu", "經渠", "Channel Gutter", "前臂掌面，腕橫紋上1寸，橈骨莖突內側", "0.1-0.3 cun perpendicular", "宣肺平喘", "咳嗽、氣喘、咽痛"],
    ["LU10", "Yu Ji", "魚際", "Fish Border", "手掌側，第1掌骨中點，赤白肉際處", "0.5-0.8 cun perpendicular", "清肺利咽", "咳嗽、咯血、咽痛、發熱、小兒疳積"],
  ]),

  // ─────── LARGE INTESTINE (LI) — 20 points ───────
  ...compact("Large Intestine")([
    ["LI1", "Shang Yang", "商陽", "Metal Yang", "食指末節橈側，距指甲角0.1寸", "0.1 cun prick", "清熱通絡", "牙痛、咽腫、熱病、暈厥"],
    ["LI2", "Er Jian", "二間", "Second Interval", "食指本節前，橈側赤白肉際", "0.2-0.3 cun perpendicular", "瀉熱止痛", "牙痛、咽腫、目痛"],
    ["LI5", "Yang Xi", "陽溪", "Yang Stream", "腕背橫紋橈側端，拇短伸肌與拇長伸肌腱之間", "0.3-0.5 cun perpendicular", "清熱通絡", "頭痛、目痛、齒痛、咽腫、腕痛"],
    ["LI6", "Pian Li", "偏歷", "Veering Passage", "前臂背面橈側，陽溪與曲池連線上，腕橫紋上3寸", "0.3-0.5 cun perpendicular", "通絡利水", "目赤、耳鳴、鼻衄、水腫"],
    ["LI7", "Wen Liu", "溫溜", "Warm Dwelling", "前臂背面橈側，腕橫紋上5寸", "0.3-0.5 cun perpendicular", "清熱解毒", "頭痛、面腫、咽腫、肩臂痛"],
    ["LI8", "Xia Lian", "下廉", "Lower Angle", "前臂背面橈側，肘橫紋下4寸", "0.5-0.8 cun perpendicular", "通絡止痛", "肘臂痛、頭痛、目眩"],
    ["LI9", "Shang Lian", "上廉", "Upper Angle", "前臂背面橈側，肘橫紋下3寸", "0.5-0.8 cun perpendicular", "通絡止痛", "肘臂痛、半身不遂、腹痛"],
    ["LI10", "Shou San Li", "手三里", "Arm Three Mile", "前臂背面橈側，肘橫紋下2寸", "0.5-1.0 cun perpendicular", "通絡止痛", "肘臂痠痛、肩臂痿痺、腹痛"],
    ["LI12", "Zhou Liao", "肘髎", "Elbow Bone Hole", "肱骨外上髁上緣", "0.3-0.5 cun perpendicular", "舒筋活絡", "肘臂痛、攣急"],
    ["LI13", "Shou Wu Li", "手五里", "Arm Five Miles", "肘橫紋上3寸", "0.3-0.5 cun perpendicular", "舒筋通絡", "肘臂痛、瘰癧"],
    ["LI14", "Bi Nao", "臂臑", "Upper Arm", "三角肌止點", "0.5-1.0 cun perpendicular", "通絡明目", "肩臂痛、目疾、瘰癧"],
    ["LI16", "Ju Gu", "巨骨", "Big Bone", "肩部，鎖骨肩峰端與肩胛岡之間凹陷處", "0.5-0.8 cun perpendicular", "舒筋活絡", "肩臂痛、瘰癧、癭氣"],
    ["LI17", "Tian Ding", "天鼎", "Heaven Tripod", "頸外側部，胸鎖乳突肌後緣", "0.3-0.5 cun perpendicular", "清熱利咽", "咽腫、暴瘖、瘰癧、癭瘤"],
    ["LI18", "Fu Tu", "扶突", "Supporting Prominence", "頸外側部，喉結旁開3寸", "0.3-0.5 cun perpendicular", "清咽消腫", "咳嗽、氣喘、咽腫、暴瘖、瘰癧"],
    ["LI19", "Kou He Liao", "口禾髎", "Grain Bone Hole", "鼻孔外緣下方", "0.3-0.5 cun perpendicular", "通鼻竅", "鼻塞、鼻衄、口歪"],
  ]),

  // ─────── STOMACH (ST) — 45 points ───────
  ...compact("Stomach")([
    ["ST3", "Ju Liao", "巨髎", "Great Bone Hole", "面部，瞳孔直下平鼻翼下緣", "0.3-0.5 cun perpendicular", "祛風通絡", "口眼歪斜、面腫、齒痛"],
    ["ST4", "Di Cang", "地倉", "Earth Granary", "面部，口角旁0.4寸", "0.3-0.5 cun transverse", "祛風通絡", "口歪、流涎、面神經麻痹"],
    ["ST9", "Ren Ying", "人迎", "Man's Welcome", "頸部，喉結旁開1.5寸", "0.3-0.5 cun perpendicular", "理氣降逆", "咽腫、氣喘、瘰癧、頭痛、高血壓"],
    ["ST10", "Shui Tu", "水突", "Water Prominence", "頸部，胸鎖乳突肌前緣，人迎與氣舍中點", "0.3-0.5 cun perpendicular", "清熱利咽", "咳嗽、氣喘、咽腫"],
    ["ST11", "Qi She", "氣舍", "Qi Abode", "頸部，鎖骨內側端上緣", "0.2-0.3 cun perpendicular", "清咽利肺", "咽喉腫痛、瘰癧、頸項強痛"],
    ["ST12", "Que Pen", "缺盆", "Empty Basin", "鎖骨上窩中央，前正中線旁開4寸", "0.3-0.5 cun perpendicular", "宣肺理氣", "咳嗽、氣喘、咽腫、瘰癧、缺盆中痛"],
    ["ST13", "Qi Hu", "氣戶", "Qi Door", "胸部，鎖骨下緣，前正中線旁開4寸", "0.3-0.5 cun oblique", "理氣止咳", "咳嗽、氣喘、胸脅滿痛"],
    ["ST14", "Ku Fang", "庫房", "Storeroom", "胸部，第1肋間隙，前正中線旁開4寸", "0.3-0.5 cun oblique", "理氣止咳", "咳嗽、氣喘、胸脅脹痛"],
    ["ST15", "Wu Yi", "屋翳", "Room Screen", "胸部，第2肋間隙", "0.3-0.5 cun oblique", "止咳化痰", "咳嗽、氣喘、乳癰"],
    ["ST16", "Ying Chuang", "膺窗", "Breast Window", "胸部，第3肋間隙", "0.3-0.5 cun oblique", "宣肺理氣", "咳嗽、氣喘、胸脅滿痛、乳癰"],
    ["ST17", "Ru Zhong", "乳中", "Breast Middle", "乳頭中央", "禁針禁灸", "標誌定位", "本穴僅作定位用，禁針禁灸"],
    ["ST18", "Ru Gen", "乳根", "Breast Root", "胸部，乳頭直下，第5肋間隙", "0.3-0.5 cun oblique", "通乳止咳", "乳癰、乳少、咳嗽、氣喘、呃逆、胸痛"],
    ["ST19", "Bu Rong", "不容", "Not Contained", "上腹部，臍上6寸，前正中線旁開2寸", "0.5-1.0 cun perpendicular", "和胃降逆", "嘔吐、胃痛、食欲不振、腹脹"],
    ["ST20", "Cheng Man", "承滿", "Receive Fullness", "上腹部，臍上5寸", "0.5-1.0 cun perpendicular", "理氣和胃", "胃痛、嘔吐、腹脹、食欲不振"],
    ["ST22", "Guan Men", "關門", "Gate Pass", "上腹部，臍上3寸", "0.5-1.0 cun perpendicular", "調胃理腸", "胃痛、腹脹、食欲不振、泄瀉"],
    ["ST23", "Tai Yi", "太乙", "Supreme Unity", "上腹部，臍上2寸", "0.5-1.0 cun perpendicular", "和胃化痰", "胃痛、心煩、癲狂"],
    ["ST24", "Hua Rou Men", "滑肉門", "Slippery Flesh Gate", "上腹部，臍上1寸", "0.5-1.0 cun perpendicular", "和胃化痰", "胃痛、嘔吐、癲狂"],
    ["ST26", "Wai Ling", "外陵", "Outer Mound", "下腹部，臍下1寸", "0.5-1.0 cun perpendicular", "和胃化滯", "腹痛、疝氣、痛經"],
    ["ST27", "Da Ju", "大巨", "Great Magnificence", "下腹部，臍下2寸", "0.5-1.0 cun perpendicular", "調腸通便", "小腹脹滿、小便不利、疝氣、遺精、早泄"],
    ["ST28", "Shui Dao", "水道", "Water Path", "下腹部，臍下3寸", "0.5-1.0 cun perpendicular", "通利水道", "小腹脹滿、小便不利、痛經、不孕"],
    ["ST29", "Gui Lai", "歸來", "Return", "下腹部，臍下4寸", "0.5-1.0 cun perpendicular", "理氣調經", "腹痛、疝氣、月經不調、痛經、白帶、陰挺"],
    ["ST30", "Qi Chong", "氣衝", "Qi Surge", "腹股溝外側，臍下5寸，前正中線旁開2寸", "0.5-1.0 cun perpendicular", "調氣養血", "腸鳴、腹痛、疝氣、月經不調、不孕、陽痿"],
    ["ST31", "Bi Guan", "髀關", "Thigh Joint", "大腿前面，髂前上棘與髕底外側端連線上，平會陰", "0.5-1.0 cun perpendicular", "通絡疏經", "腰痛、下肢痿痺、腿痛"],
    ["ST32", "Fu Tu", "伏兔", "Crouching Rabbit", "大腿前面，髕底上6寸", "0.5-1.0 cun perpendicular", "通絡止痛", "腰胯疼痛、下肢痿痺、疝氣、腳氣"],
    ["ST33", "Yin Shi", "陰市", "Yin Market", "大腿前面，髕底上3寸", "0.5-1.0 cun perpendicular", "舒筋通絡", "腿膝麻痺、疼痛、屈伸不利、疝氣"],
    ["ST35", "Du Bi", "犢鼻", "Calf's Nose", "屈膝，髕韌帶外側凹陷中（外膝眼）", "0.5-1.0 cun oblique", "通利關節", "膝痛、下肢痿痺、屈伸不利、腳氣"],
    ["ST37", "Shang Ju Xu", "上巨虛", "Upper Great Hollow", "小腿外側，犢鼻下6寸，距脛骨前緣一橫指", "0.5-1.2 cun perpendicular", "調腸理氣", "腹痛、腸鳴、泄瀉、便秘、闌尾炎、下肢痿痺"],
    ["ST38", "Tiao Kou", "條口", "Lines Opening", "小腿外側，犢鼻下8寸", "0.5-1.2 cun perpendicular", "舒筋活絡", "肩臂痛、脘腹疼痛、下肢痿痺"],
    ["ST39", "Xia Ju Xu", "下巨虛", "Lower Great Hollow", "小腿外側，犢鼻下9寸", "0.5-1.2 cun perpendicular", "調腸理氣", "小腹痛、泄瀉、痢疾、乳癰、下肢痿痺"],
    ["ST41", "Jie Xi", "解溪", "Stream Divide", "足背踝關節橫紋中央", "0.3-0.5 cun perpendicular", "通絡止痛", "頭痛、眩暈、癲狂、腹脹、便秘、下肢痿痺"],
    ["ST42", "Chong Yang", "衝陽", "Surging Yang", "足背最高處，足背動脈搏動處", "0.3-0.5 cun perpendicular", "和胃化痰", "胃痛、口眼歪斜、足背腫痛"],
    ["ST43", "Xian Gu", "陷谷", "Sunken Valley", "足背，第2、3跖骨結合部前方凹陷處", "0.3-0.5 cun perpendicular", "和胃利水", "面浮身腫、目赤腫痛、腸鳴腹痛"],
    ["ST45", "Li Dui", "厲兌", "Severe Mouth", "第2趾外側，趾甲角旁0.1寸", "0.1 cun prick", "清熱和胃", "鼻衄、齒痛、咽腫、熱病、多夢、癲狂"],
  ]),

  // ─────── SPLEEN (SP) — 21 points ───────
  ...compact("Spleen")([
    ["SP2", "Da Du", "大都", "Great Capital", "足內側緣，第1跖趾關節前下方赤白肉際", "0.1-0.3 cun perpendicular", "健脾化濕", "腹脹、胃痛、嘔吐、泄瀉、熱病無汗"],
    ["SP5", "Shang Qiu", "商丘", "Shang Hill", "足內側，內踝前下方凹陷處", "0.3-0.5 cun perpendicular", "健脾化濕", "腹脹、泄瀉、便秘、腳氣、踝痛"],
    ["SP7", "Lou Gu", "漏谷", "Leaking Valley", "小腿內側，內踝尖上6寸", "0.5-1.0 cun perpendicular", "健脾消腫", "腹脹、腸鳴、小便不利、遺精、下肢痿痺"],
    ["SP8", "Di Ji", "地機", "Earth Pivot", "小腿內側，陰陵泉下3寸", "0.5-1.0 cun perpendicular", "健脾通經", "腹痛、泄瀉、小便不利、月經不調、痛經、遺精、水腫"],
    ["SP11", "Ji Men", "箕門", "Winnower Gate", "大腿內側，血海上6寸", "0.3-0.5 cun perpendicular", "健脾利尿", "小便不利、遺尿、腹股溝腫痛"],
    ["SP12", "Chong Men", "衝門", "Surging Gate", "腹股溝外側，恥骨聯合上緣中點旁開3.5寸", "0.5-1.0 cun perpendicular", "理氣調經", "腹痛、疝氣、崩漏、帶下"],
    ["SP13", "Fu She", "府舍", "Bowel Abode", "下腹部，臍下4寸，前正中線旁開4寸", "0.5-1.0 cun perpendicular", "潤腸通便", "腹痛、疝氣、積聚"],
    ["SP14", "Fu Jie", "腹結", "Abdominal Bind", "下腹部，臍下1.3寸，前正中線旁開4寸", "0.5-1.0 cun perpendicular", "和腸消滯", "繞臍腹痛、咳逆、疝氣、泄瀉"],
    ["SP15", "Da Heng", "大橫", "Great Horizontal", "腹中部，臍中旁開4寸", "0.5-1.0 cun perpendicular", "理腸通便", "泄瀉、便秘、腹痛、痢疾"],
    ["SP16", "Fu Ai", "腹哀", "Abdominal Lament", "上腹部，臍上3寸，前正中線旁開4寸", "0.5-0.8 cun perpendicular", "健脾和胃", "繞臍痛、消化不良、便秘、痢疾"],
    ["SP17", "Shi Dou", "食竇", "Food Hole", "胸外側部，第5肋間隙，前正中線旁開6寸", "0.3-0.5 cun oblique", "宣肺理氣", "胸脅脹痛、噯氣、反胃、腹脹、水腫"],
    ["SP18", "Tian Xi", "天溪", "Heaven Stream", "胸外側部，第4肋間隙", "0.3-0.5 cun oblique", "理氣寬胸", "胸脅疼痛、咳嗽、乳腫"],
    ["SP19", "Xiong Xiang", "胸鄉", "Chest Village", "胸外側部，第3肋間隙", "0.3-0.5 cun oblique", "宣肺止咳", "胸脅脹痛、轉側不利"],
    ["SP20", "Zhou Rong", "周榮", "Encircling Glory", "胸外側部，第2肋間隙", "0.3-0.5 cun oblique", "宣肺止咳", "咳嗽、氣喘、胸脅脹痛、不思飲食"],
  ]),

  // ─────── HEART (HT) — 9 points ───────
  ...compact("Heart")([
    ["HT1", "Ji Quan", "極泉", "Highest Spring", "腋窩頂點，腋動脈搏動處", "0.3-0.5 cun perpendicular (避動脈)", "寬胸理氣", "心痛、胸悶、肩臂痛、脅肋疼痛、瘰癧"],
    ["HT2", "Qing Ling", "青靈", "Greenish Spirit", "臂內側，肘橫紋上3寸", "0.3-0.5 cun perpendicular", "理氣止痛", "頭痛、目黃、脅痛、肩臂痛"],
    ["HT6", "Yin Xi", "陰郄", "Yin Cleft", "前臂掌側，腕橫紋上0.5寸", "0.3-0.5 cun perpendicular", "養陰清心", "心痛、驚悸、骨蒸盜汗、吐血、衄血"],
  ]),

  // ─────── SMALL INTESTINE (SI) — 19 points ───────
  ...compact("Small Intestine")([
    ["SI1", "Shao Ze", "少澤", "Lesser Marsh", "小指末節尺側，距指甲角0.1寸", "0.1 cun prick", "清熱通乳", "頭痛、目翳、咽腫、乳少、熱病、昏迷"],
    ["SI2", "Qian Gu", "前谷", "Front Valley", "小指尺側，指掌關節前赤白肉際", "0.2-0.3 cun perpendicular", "清熱利咽", "頭痛、目痛、耳鳴、咽腫、乳少、熱病、手指麻木"],
    ["SI5", "Yang Gu", "陽谷", "Yang Valley", "腕背橫紋尺側端，尺骨莖突與三角骨之間", "0.3-0.5 cun perpendicular", "明目通絡", "頭痛、目眩、耳鳴、耳聾、熱病、癲狂癇、腕痛"],
    ["SI7", "Zhi Zheng", "支正", "Branch to Outer", "前臂背面尺側，腕橫紋上5寸", "0.3-0.5 cun perpendicular", "清熱解毒", "頭痛、目眩、熱病、項強、肘臂酸痛"],
    ["SI9", "Jian Zhen", "肩貞", "Upright Shoulder", "肩關節後下方，腋後紋頭上1寸", "1.0-1.5 cun perpendicular", "通絡止痛", "肩臂疼痛、瘰癧、耳鳴"],
    ["SI10", "Nao Shu", "臑俞", "Upper Arm Shu", "肩部，腋後紋頭直上，肩胛岡下緣凹陷中", "0.5-1.0 cun perpendicular", "舒筋通絡", "肩臂酸痛、瘰癧"],
    ["SI12", "Bing Feng", "秉風", "Grasping Wind", "肩胛岡上窩中央，天宗直上", "0.3-0.5 cun perpendicular", "舒筋活絡", "肩胛疼痛、上肢酸麻"],
    ["SI13", "Qu Yuan", "曲垣", "Crooked Wall", "肩胛岡上窩內側端", "0.3-0.5 cun oblique", "舒筋通絡", "肩胛疼痛"],
    ["SI14", "Jian Wai Shu", "肩外俞", "Outer Shoulder Shu", "背部，第1胸椎旁開3寸", "0.3-0.5 cun oblique", "舒筋活絡", "肩背痠痛、頸項強急"],
    ["SI15", "Jian Zhong Shu", "肩中俞", "Middle Shoulder Shu", "背部，第7頸椎旁開2寸", "0.3-0.5 cun oblique", "宣肺解表", "咳嗽、氣喘、肩背疼痛、目視不明"],
    ["SI16", "Tian Chuang", "天窗", "Heaven Window", "頸外側部，胸鎖乳突肌後緣，喉結平", "0.3-0.5 cun perpendicular", "通絡聰耳", "耳鳴、耳聾、咽腫、暴瘖、頸項強痛"],
    ["SI17", "Tian Rong", "天容", "Heaven Visage", "頸外側部，下頜角後方", "0.3-0.5 cun perpendicular", "清咽利耳", "耳鳴、耳聾、咽腫、頸項強痛"],
    ["SI18", "Quan Liao", "顴髎", "Cheek Bone Hole", "面部，目外眥直下，顴骨下緣凹陷處", "0.3-0.5 cun perpendicular", "祛風通絡", "口眼歪斜、眼瞼瞤動、齒痛、頰腫"],
  ]),

  // ─────── BLADDER (BL) — 67 points ───────
  ...compact("Bladder")([
    ["BL4", "Qu Cha", "曲差", "Crooked Place", "頭部，前髮際正中直上0.5寸，旁開1.5寸", "0.3-0.5 cun transverse", "明目通鼻", "頭痛、鼻塞、鼻衄、目視不明"],
    ["BL6", "Cheng Guang", "承光", "Receive Light", "頭部，前髮際正中直上2.5寸，旁開1.5寸", "0.3-0.5 cun transverse", "清熱明目", "頭痛、目眩、鼻塞、嘔吐"],
    ["BL7", "Tong Tian", "通天", "Reach Heaven", "頭部，前髮際正中直上4寸，旁開1.5寸", "0.3-0.5 cun transverse", "通鼻竅", "頭痛、眩暈、鼻塞、鼻衄、鼻淵"],
    ["BL8", "Luo Que", "絡卻", "Declining Connection", "頭部，前髮際正中直上5.5寸，旁開1.5寸", "0.3-0.5 cun transverse", "祛風明目", "頭暈、目視不明、耳鳴、鼻塞、癲狂"],
    ["BL9", "Yu Zhen", "玉枕", "Jade Pillow", "後頭部，後髮際正中直上2.5寸，旁開1.3寸", "0.3-0.5 cun transverse", "通絡止痛", "頭痛、目痛、鼻塞"],
    ["BL22", "San Jiao Shu", "三焦俞", "Sanjiao Shu", "腰部，第1腰椎棘突下旁開1.5寸", "0.5-0.8 cun perpendicular", "通調水道", "腹脹、腸鳴、嘔吐、泄瀉、痢疾、水腫、腰背強痛"],
    ["BL24", "Qi Hai Shu", "氣海俞", "Sea of Qi Shu", "腰部，第3腰椎棘突下旁開1.5寸", "0.5-0.8 cun perpendicular", "益腎固陽", "腰痛、痛經、痔瘡、腹脹"],
    ["BL25", "Da Chang Shu", "大腸俞", "Large Intestine Shu", "腰部，第4腰椎棘突下旁開1.5寸", "0.5-0.8 cun perpendicular", "通腸理氣", "腰痛、腹脹、泄瀉、便秘、痢疾"],
    ["BL29", "Zhong Lv Shu", "中膂俞", "Middle Spine Shu", "骶部，第3骶椎旁開1.5寸", "0.5-0.8 cun perpendicular", "強腰理氣", "泄瀉、痢疾、疝氣、腰骶痛"],
    ["BL35", "Hui Yang", "會陽", "Yang Meeting", "骶部，尾骨端旁開0.5寸", "0.5-0.8 cun perpendicular", "理氣固精", "泄瀉、痢疾、便血、痔瘡、陽痿、帶下"],
    ["BL37", "Yin Men", "殷門", "Gate of Abundance", "大腿後面，承扶與委中連線上，承扶下6寸", "1.0-1.5 cun perpendicular", "舒筋通絡", "腰痛、下肢痿痺"],
    ["BL38", "Fu Xi", "浮郄", "Superficial Cleft", "膕橫紋外側端上1寸", "0.5-1.0 cun perpendicular", "舒筋通絡", "便秘、股膕部疼痛、麻木"],
    ["BL39", "Wei Yang", "委陽", "Bend Yang", "膕橫紋外側端，當股二頭肌腱內緣", "0.5-1.0 cun perpendicular", "通利三焦", "腹滿、小便不利、腰脊強痛、腿足攣痛"],
    ["BL41", "Fu Fen", "附分", "Attachment Branch", "背部，第2胸椎旁開3寸", "0.5-0.8 cun oblique", "疏風通絡", "頸項強痛、肘臂麻木"],
    ["BL42", "Po Hu", "魄戶", "Po Door", "背部，第3胸椎旁開3寸", "0.5-0.8 cun oblique", "宣肺平喘", "咳嗽、氣喘、肺癆、項強、肩背痛"],
    ["BL46", "Ge Guan", "膈關", "Diaphragm Pass", "背部，第7胸椎旁開3寸", "0.5-0.8 cun oblique", "理氣降逆", "胸悶、噯氣、嘔吐、脊背強痛"],
    ["BL48", "Yang Gang", "陽綱", "Yang Headrope", "背部，第10胸椎旁開3寸", "0.5-0.8 cun oblique", "疏肝利膽", "腸鳴、腹痛、泄瀉、黃疸、消渴"],
    ["BL49", "Yi She", "意舍", "Reflection Abode", "背部，第11胸椎旁開3寸", "0.5-0.8 cun oblique", "健脾和胃", "腹脹、腸鳴、泄瀉、嘔吐"],
    ["BL50", "Wei Cang", "胃倉", "Stomach Granary", "背部，第12胸椎旁開3寸", "0.5-0.8 cun oblique", "和胃健脾", "胃痛、腹脹、小兒食積、水腫、脊背痛"],
    ["BL53", "Bao Huang", "胞肓", "Bladder Gao", "臀部，平第2骶後孔旁開3寸", "1.0-1.5 cun perpendicular", "理氣調水", "腸鳴、腹脹、便秘、癃閉、陰腫、腰脊痛"],
    ["BL54", "Zhi Bian", "秩邊", "Sequential Limit", "臀部，平第4骶後孔旁開3寸", "1.5-2.0 cun perpendicular", "舒筋活絡", "腰骶痛、下肢痿痺、痔瘡、陰痛、小便不利、便秘"],
    ["BL55", "He Yang", "合陽", "Yang Junction", "小腿後面，膕橫紋下2寸", "0.5-1.0 cun perpendicular", "舒筋活絡", "腰脊強痛、下肢痿痺、疝氣、崩漏"],
    ["BL56", "Cheng Jin", "承筋", "Sinew Support", "小腿後面，腓腸肌肌腹中央", "0.5-1.0 cun perpendicular", "舒筋通絡", "痔瘡、腰背拘急、下肢痿痺、霍亂轉筋"],
    ["BL63", "Jin Men", "金門", "Metal Gate", "足外側部，外踝前緣直下，骰骨外側凹陷中", "0.3-0.5 cun perpendicular", "舒筋通絡", "頭痛、癲癇、小兒驚風、腰痛、下肢痿痺、外踝痛"],
    ["BL64", "Jing Gu", "京骨", "Capital Bone", "足外側部，第5跖骨粗隆下方", "0.3-0.5 cun perpendicular", "清頭明目", "頭痛、項強、目翳、癲癇、腰痛"],
    ["BL65", "Shu Gu", "束骨", "Bundle Bone", "足外側部，第5跖趾關節後緣赤白肉際", "0.3-0.5 cun perpendicular", "通絡止痛", "頭痛、項強、目眩、癲狂、腰背痛"],
    ["BL66", "Zu Tong Gu", "足通谷", "Foot Through Valley", "足外側部，第5跖趾關節前緣赤白肉際", "0.2-0.3 cun perpendicular", "清頭明目", "頭痛、項強、目眩、鼻衄、癲狂"],
  ]),

  // ─────── KIDNEY (KI) — 27 points ───────
  ...compact("Kidney")([
    ["KI2", "Ran Gu", "然谷", "Burning Valley", "足內側緣，足舟骨粗隆下方", "0.5-1.0 cun perpendicular", "清熱益腎", "月經不調、陰挺、陰癢、白濁、遺精、消渴、咽喉腫痛"],
    ["KI4", "Da Zhong", "大鐘", "Big Bell", "足內側，內踝後下方", "0.3-0.5 cun perpendicular", "強腰益腎", "癃閉、遺尿、便秘、咯血、氣喘、癡呆、嗜臥"],
    ["KI5", "Shui Quan", "水泉", "Water Spring", "足內側，內踝後下方", "0.3-0.5 cun perpendicular", "通經活絡", "月經不調、痛經、閉經、陰挺、小便不利、目昏花、腹痛"],
    ["KI8", "Jiao Xin", "交信", "Intersection Reach", "小腿內側，太溪直上2寸，脛骨內側緣後方", "0.5-1.0 cun perpendicular", "益腎調經", "月經不調、崩漏、陰挺、泄瀉、便秘、睪丸腫痛"],
    ["KI9", "Zhu Bin", "築賓", "Guest House", "小腿內側，太溪上5寸", "0.5-1.0 cun perpendicular", "寧心安神", "癲狂、嘔吐、疝氣、小腿內側痛"],
    ["KI10", "Yin Gu", "陰谷", "Yin Valley", "膕窩內側，半腱肌與半膜肌之間", "0.5-1.0 cun perpendicular", "益腎調經", "陽痿、疝氣、月經不調、崩漏、小便難、陰中痛"],
    ["KI11", "Heng Gu", "橫骨", "Pubic Bone", "下腹部，臍下5寸，前正中線旁開0.5寸", "0.5-1.0 cun perpendicular", "益腎助陽", "陰部痛、少腹痛、遺精、陽痿、遺尿、小便不通"],
    ["KI12", "Da He", "大赫", "Great Manifestation", "下腹部，臍下4寸", "0.5-1.0 cun perpendicular", "益腎理胞", "陰部痛、子宮脫垂、遺精、月經不調、痛經、不妊"],
    ["KI13", "Qi Xue", "氣穴", "Qi Hole", "下腹部，臍下3寸", "0.5-1.0 cun perpendicular", "調經止帶", "月經不調、白帶、小便不通、泄瀉、痢疾、腰脊痛"],
    ["KI14", "Si Man", "四滿", "Fourfold Fullness", "下腹部，臍下2寸", "0.5-1.0 cun perpendicular", "理氣調經", "月經不調、崩漏、帶下、產後惡露不淨、小腹痛、遺精、遺尿"],
    ["KI15", "Zhong Zhu", "中注", "Middle Flow", "下腹部，臍下1寸", "0.5-1.0 cun perpendicular", "調經理腸", "月經不調、腹痛、便秘、泄瀉"],
    ["KI16", "Huang Shu", "肓俞", "Vitals Shu", "腹中部，臍中旁開0.5寸", "0.5-1.0 cun perpendicular", "理氣止痛", "腹痛、腹脹、嘔吐、便秘、泄瀉、痛經、月經不調"],
    ["KI17", "Shang Qu", "商曲", "Shang Bend", "上腹部，臍上2寸", "0.5-1.0 cun perpendicular", "和胃理腸", "腹痛、泄瀉、便秘、腹中積聚"],
    ["KI18", "Shi Guan", "石關", "Stone Pass", "上腹部，臍上3寸", "0.5-1.0 cun perpendicular", "降逆止嘔", "嘔吐、腹痛、便秘、產後腹痛、不妊"],
    ["KI19", "Yin Du", "陰都", "Yin Capital", "上腹部，臍上4寸", "0.5-1.0 cun perpendicular", "理氣降逆", "腹脹、腹痛、便秘、不孕、瘧疾"],
    ["KI20", "Fu Tong Gu", "腹通谷", "Abdomen Through Valley", "上腹部，臍上5寸", "0.5-0.8 cun perpendicular", "和胃止嘔", "腹脹、腹痛、嘔吐、心悸、心痛"],
    ["KI21", "You Men", "幽門", "Hidden Gate", "上腹部，臍上6寸", "0.5-0.8 cun perpendicular", "和胃降逆", "腹痛、嘔吐、善噫、泄瀉"],
    ["KI22", "Bu Lang", "步廊", "Walking Corridor", "胸部，第5肋間隙", "0.3-0.5 cun oblique", "寬胸理氣", "咳嗽、氣喘、胸痛、嘔吐、不嗜食、乳癰"],
    ["KI23", "Shen Feng", "神封", "Spirit Seal", "胸部，第4肋間隙", "0.3-0.5 cun oblique", "止咳平喘", "咳嗽、氣喘、胸脅脹滿、嘔吐、乳癰"],
    ["KI24", "Ling Xu", "靈墟", "Spirit Wasteland", "胸部，第3肋間隙", "0.3-0.5 cun oblique", "止咳平喘", "咳嗽、氣喘、胸脅脹痛、乳癰"],
    ["KI25", "Shen Cang", "神藏", "Spirit Storage", "胸部，第2肋間隙", "0.3-0.5 cun oblique", "止咳寧心", "咳嗽、氣喘、胸悶嘔吐、不嗜食"],
    ["KI26", "Yu Zhong", "彧中", "Lively Center", "胸部，第1肋間隙", "0.3-0.5 cun oblique", "止咳化痰", "咳嗽、氣喘、痰壅、胸脅脹滿"],
    ["KI27", "Shu Fu", "俞府", "Shu Mansion", "胸部，鎖骨下緣，前正中線旁開2寸", "0.3-0.5 cun oblique", "止咳平喘", "咳嗽、氣喘、胸痛、嘔吐、不嗜食"],
  ]),

  // ─────── PERICARDIUM (PC) — 9 points ───────
  ...compact("Pericardium")([
    ["PC2", "Tian Quan", "天泉", "Heavenly Spring", "臂內側，腋前紋頭下2寸", "0.3-0.5 cun perpendicular", "活血通絡", "胸脅脹滿、咳嗽、心痛、心悸、視物不明、上臂內側痛"],
    ["PC5", "Jian Shi", "間使", "Intermediate Messenger", "前臂掌側，腕橫紋上3寸", "0.3-0.5 cun perpendicular", "和胃寬胸", "心痛、心悸、胸悶、嘔吐、熱病、煩躁、瘧疾、癲狂"],
  ]),

  // ─────── TRIPLE ENERGIZER (TE) — 23 points ───────
  ...compact("Triple Energizer")([
    ["TE1", "Guan Chong", "關衝", "Passage Hub", "無名指末節尺側，距指甲角0.1寸", "0.1 cun prick", "清熱開竅", "頭痛、目赤、咽腫、舌強、熱病、心煩、暈厥"],
    ["TE2", "Ye Men", "液門", "Fluid Gate", "手背部，第4、5指間赤白肉際", "0.3-0.5 cun perpendicular", "清熱通絡", "頭痛、目赤、耳暴聾、咽腫、瘧疾、手臂痛"],
    ["TE4", "Yang Chi", "陽池", "Yang Pool", "腕背橫紋上，指總伸肌腱尺側緣凹陷處", "0.3-0.5 cun perpendicular", "舒筋活絡", "腕痛、肩臂痛、消渴、口乾、瘧疾、耳聾"],
    ["TE6", "Zhi Gou", "支溝", "Branch Ditch", "前臂背側，腕背橫紋上3寸", "0.5-1.0 cun perpendicular", "清熱通便", "暴瘖、耳聾、肩背酸痛、便秘、脅肋痛、熱病"],
    ["TE7", "Hui Zong", "會宗", "Convergence and Gathering", "前臂背側，腕背橫紋上3寸，旁開支溝1寸", "0.3-0.5 cun perpendicular", "清耳聰絡", "耳聾、癇證、上肢肌膚痛"],
    ["TE8", "San Yang Luo", "三陽絡", "Three Yang Connection", "前臂背側，腕背橫紋上4寸", "0.5-1.0 cun perpendicular", "通絡開竅", "暴瘖、齒痛、耳聾、手臂痛"],
    ["TE9", "Si Du", "四瀆", "Four Rivers", "前臂背側，肘尖下5寸", "0.5-1.0 cun perpendicular", "通絡聰耳", "暴瘖、暴聾、齒痛、咽腫、上肢痿痺"],
    ["TE10", "Tian Jing", "天井", "Heavenly Well", "上臂外側，肘尖上1寸", "0.5-1.0 cun perpendicular", "化痰通絡", "偏頭痛、耳聾、瘰癧、癲癇、肘臂痛"],
    ["TE11", "Qing Leng Yuan", "清冷淵", "Cold Abyss", "上臂外側，肘尖上2寸", "0.3-0.5 cun perpendicular", "通絡止痛", "頭痛、肩臂痛、振寒"],
    ["TE12", "Xiao Luo", "消濼", "Dissolving Connection", "上臂外側，三角肌止點下方", "0.3-0.5 cun perpendicular", "舒筋通絡", "頭痛、項強、肩背痛"],
    ["TE13", "Nao Hui", "臑會", "Upper Arm Convergence", "上臂外側，肩髎下3寸", "0.5-1.0 cun perpendicular", "通絡消癭", "瘰癧、癭氣、肩臂痛"],
    ["TE14", "Jian Liao", "肩髎", "Shoulder Bone Hole", "肩部，肩髃後方凹陷處", "0.5-1.0 cun perpendicular", "舒筋活絡", "肩臂痛、不能舉、半身不遂、癮疹"],
    ["TE15", "Tian Liao", "天髎", "Heaven Bone Hole", "肩胛部，肩井與曲垣中點", "0.3-0.5 cun perpendicular", "祛風通絡", "肩臂痛、頸項強直、胸中煩悶"],
    ["TE16", "Tian You", "天牖", "Heaven Window", "頸側部，乳突後下方", "0.5-1.0 cun perpendicular", "聰耳明目", "頭暈、頭痛、目痛、耳鳴、耳聾、咽腫"],
    ["TE18", "Qi Mai", "瘛脈", "Spasm Vessel", "頭部，耳後乳突中央", "0.1 cun prick", "清熱止痙", "頭痛、耳鳴、耳聾、小兒驚癇、嘔吐、泄瀉"],
    ["TE19", "Lu Xi", "顱息", "Skull's Rest", "頭部，耳後翳風與角孫沿耳輪連線的下、中1/3交點", "0.1-0.3 cun transverse", "通竅鎮痛", "頭痛、耳鳴、耳聾、小兒驚癇、嘔吐"],
    ["TE20", "Jiao Sun", "角孫", "Joint Grandson", "頭部，耳尖直上入髮際處", "0.3-0.5 cun transverse", "祛風散熱", "耳腫、目翳、齒痛、項強、頰腫"],
    ["TE22", "Er He Liao", "耳和髎", "Ear Harmony Bone Hole", "頭側部，鬢髮後緣，耳廓根的前方", "0.1-0.3 cun transverse (避動脈)", "祛風通絡", "頭痛、耳鳴、牙關緊閉、口歪、頷腫"],
    ["TE23", "Si Zhu Kong", "絲竹空", "Bamboo Hollow", "面部，眉梢凹陷處", "0.3-0.5 cun transverse", "祛風止痛", "頭痛、目赤、目眩、目翳、視物不清、齒痛、癲狂癇"],
  ]),

  // ─────── GALLBLADDER (GB) — 44 points ───────
  ...compact("Gallbladder")([
    ["GB2", "Ting Hui", "聽會", "Hearing Convergence", "面部，耳屏間切跡前方，下頜骨髁突後緣，張口呈凹陷處", "0.5-0.8 cun perpendicular", "聰耳開竅", "耳鳴、耳聾、聤耳、齒痛、面痛、口眼歪斜"],
    ["GB4", "Han Yan", "頷厭", "Jaw Servant", "頭部鬢髮上，當頭維與曲鬢弧形連線上1/4與下3/4交點處", "0.3-0.5 cun transverse", "祛風止痛", "偏頭痛、眩暈、耳鳴、目外眥痛"],
    ["GB5", "Xuan Lu", "懸顱", "Suspended Skull", "頭部鬢髮上，頭維與曲鬢弧形連線中點", "0.3-0.5 cun transverse", "通絡止痛", "偏頭痛、目赤腫痛、齒痛"],
    ["GB7", "Qu Bin", "曲鬢", "Curved Hairline", "頭部，耳前鬢角髮際後緣的垂線與耳尖水平線交點處", "0.3-0.5 cun transverse", "清熱止痛", "頭痛連齒、頷頰腫"],
    ["GB9", "Tian Chong", "天衝", "Heavenly Surge", "頭部，耳根後緣直上入髮際2寸", "0.3-0.5 cun transverse", "祛風止痛", "頭痛、齒齦腫痛、癲癇"],
    ["GB10", "Fu Bai", "浮白", "Floating White", "頭部，耳後乳突後上方", "0.3-0.5 cun transverse", "清頭明目", "頭痛、耳鳴、耳聾、齒痛、瘿氣、瘰癧"],
    ["GB11", "Tou Qiao Yin", "頭竅陰", "Head Yin Hole", "頭部，乳突後上方", "0.3-0.5 cun transverse", "通竅止痛", "頭痛、頸項強痛、胸脅痛、耳鳴、耳聾、目痛"],
    ["GB15", "Tou Lin Qi", "頭臨泣", "Head Tear Brimming", "頭部，瞳孔直上入前髮際0.5寸", "0.3-0.5 cun transverse", "祛風明目", "頭痛、目眩、流淚、目翳、鼻塞、鼻淵、耳聾、小兒驚癇"],
    ["GB16", "Mu Chuang", "目窗", "Window of Eye", "頭部，前髮際上1.5寸，瞳孔直上", "0.3-0.5 cun transverse", "明目止痛", "頭痛、目痛、目眩、鼻塞、小兒驚癇"],
    ["GB17", "Zheng Ying", "正營", "Upright Construction", "頭部，前髮際上2.5寸，瞳孔直上", "0.3-0.5 cun transverse", "止痛安神", "頭痛、頭暈、目眩、唇吻急強"],
    ["GB18", "Cheng Ling", "承靈", "Spirit Support", "頭部，前髮際上4寸，瞳孔直上", "0.3-0.5 cun transverse", "通竅明目", "頭痛、眩暈、目痛、鼻塞、鼻衄"],
    ["GB19", "Nao Kong", "腦空", "Brain Hollow", "頭部，枕外隆凸的上緣外側，當風池直上，平腦戶", "0.3-0.5 cun transverse", "醒腦明目", "頭痛、頸項強痛、目眩、目赤、鼻痛、耳鳴、耳聾、癲狂癇"],
    ["GB22", "Yuan Ye", "淵腋", "Armpit Abyss", "側胸部，腋中線上腋下3寸，第4肋間隙", "0.3-0.5 cun oblique", "理氣寬胸", "胸滿、脅痛、腋下腫、上肢痺痛"],
    ["GB23", "Zhe Jin", "輒筋", "Flank Sinews", "側胸部，淵腋前1寸", "0.3-0.5 cun oblique", "降逆寬胸", "胸滿、氣喘、嘔吐、吞酸、脅肋疼痛"],
    ["GB24", "Ri Yue", "日月", "Sun and Moon", "上腹部，乳頭直下，第7肋間隙", "0.3-0.5 cun oblique", "疏肝利膽", "脅肋疼痛、脹滿、嘔吐、吞酸、呃逆、黃疸"],
    ["GB26", "Dai Mai", "帶脈", "Belt Vessel", "側腹部，第11肋骨游離端下方垂線與臍水平線的交點上", "0.5-1.0 cun perpendicular", "調經止帶", "月經不調、赤白帶下、小腹痛、疝氣、腰脅痛"],
    ["GB27", "Wu Shu", "五樞", "Fifth Pivot", "側腹部，臍下3寸，髂前上棘前0.5寸", "0.5-1.0 cun perpendicular", "調經理腸", "陰挺、赤白帶下、月經不調、疝氣、少腹痛、便秘、腰胯痛"],
    ["GB28", "Wei Dao", "維道", "Linking Path", "側腹部，髂前上棘前下方，五樞前下0.5寸", "0.5-1.0 cun perpendicular", "理氣調水", "腰胯痛、少腹痛、陰挺、疝氣、帶下"],
    ["GB32", "Zhong Du", "中瀆", "Middle Ditch", "大腿外側，膕橫紋上7寸", "1.0-1.5 cun perpendicular", "通絡止痛", "下肢痿痺、麻木、半身不遂"],
    ["GB33", "Xi Yang Guan", "膝陽關", "Knee Yang Pass", "膝外側，陽陵泉上3寸", "0.5-1.0 cun perpendicular", "舒筋活絡", "膝臏腫痛、屈伸不利、下肢痿痺"],
    ["GB38", "Yang Fu", "陽輔", "Yang Support", "小腿外側，外踝尖上4寸，腓骨前緣", "0.5-1.0 cun perpendicular", "舒筋通絡", "偏頭痛、目外眥痛、缺盆中痛、腋下腫痛、瘰癧、胸脅痛、下肢外側痛"],
    ["GB40", "Qiu Xu", "丘墟", "Mound's Ruin", "足外踝前下方", "0.5-0.8 cun perpendicular", "舒肝利膽", "頸項痛、腋下腫、胸脅痛、瘧疾、下肢痿痺、外踝腫痛"],
    ["GB41", "Zu Lin Qi", "足臨泣", "Foot Tear Brimming", "足背外側，第4跖趾關節後方", "0.3-0.5 cun perpendicular", "舒肝熄風", "頭痛、目外眥痛、目眩、瘰癧、脅肋疼痛、瘧疾、月經不調"],
    ["GB43", "Xia Xi", "俠溪", "Pinched Stream", "足背外側，第4、5趾間赤白肉際", "0.3-0.5 cun perpendicular", "清熱熄風", "頭痛、眩暈、目外眥痛、耳聾、耳鳴、頰腫、胸脅痛、發熱、足跗腫痛"],
    ["GB44", "Zu Qiao Yin", "足竅陰", "Foot Yin Hole", "足第4趾外側，距趾甲角0.1寸", "0.1 cun prick", "清熱熄風", "頭痛、目赤腫痛、耳鳴、耳聾、咽腫、舌強、熱病、失眠、月經不調"],
  ]),

  // ─────── LIVER (LR) — 14 points ───────
  ...compact("Liver")([
    ["LR4", "Zhong Feng", "中封", "Middle Seal", "足背側，內踝前1寸", "0.3-0.5 cun perpendicular", "舒筋通絡", "疝氣、遺精、小便不利、黃疸、胸腹脹滿、腰痛、足冷、內踝腫痛"],
    ["LR5", "Li Gou", "蠡溝", "Wood Worm Canal", "小腿內側，內踝尖上5寸，脛骨內側面中央", "0.3-0.5 cun transverse", "舒肝理氣", "月經不調、赤白帶下、陰挺、陰癢、疝氣、小便不利、睪丸腫痛、小腿酸痛"],
    ["LR6", "Zhong Du", "中都", "Middle Capital", "小腿內側，內踝尖上7寸", "0.5-1.0 cun perpendicular", "舒肝理氣", "脅痛、腹脹、泄瀉、疝氣、崩漏、惡露不淨"],
    ["LR7", "Xi Guan", "膝關", "Knee Joint", "小腿內側，脛骨內側髁的後下方，陰陵泉後1寸", "0.5-1.0 cun perpendicular", "舒筋活絡", "膝髕腫痛、寒濕走注、歷節風痛、下肢痿痺"],
    ["LR9", "Yin Bao", "陰包", "Yin Bladder", "大腿內側，股骨內上髁上4寸", "0.5-1.0 cun perpendicular", "理氣調經", "月經不調、小便不利、遺尿、腰骶引少腹痛"],
    ["LR10", "Zu Wu Li", "足五里", "Foot Five Miles", "大腿內側，氣衝直下3寸", "0.5-1.0 cun perpendicular", "通氣化滯", "少腹脹痛、小便不通、陰挺、睪丸腫痛、嗜臥、四肢倦怠、瘰癧"],
    ["LR11", "Yin Lian", "陰廉", "Yin's Modesty", "大腿內側，氣衝直下2寸", "0.5-1.0 cun perpendicular", "調經止痛", "月經不調、赤白帶下、少腹疼痛、股內側痛、下肢攣急"],
    ["LR12", "Ji Mai", "急脈", "Urgent Pulse", "恥骨結節外側", "0.3-0.5 cun perpendicular (避動脈)", "理氣止痛", "少腹痛、疝氣、陰挺、陰莖痛、股內側痛"],
    ["LR13", "Zhang Men", "章門", "Camphorwood Gate", "側腹部，第11肋游離端的下方", "0.5-0.8 cun perpendicular", "疏肝健脾", "腹痛、腹脹、腸鳴、泄瀉、嘔吐、神疲肢倦、胸脅痛、痞塊、黃疸"],
  ]),

  // ─────── CONCEPTION VESSEL (CV) — 24 points ───────
  ...compact("Conception Vessel")([
    ["CV1", "Hui Yin", "會陰", "Meeting of Yin", "會陰部，男性陰囊根部與肛門連線中點，女性大陰唇後聯合與肛門連線中點", "0.5-1.0 cun perpendicular", "醒神通陰", "溺水窒息、昏迷、癲狂、脫肛、陰挺、陰痛、陰癢、痔疾、遺精、月經不調"],
    ["CV7", "Yin Jiao", "陰交", "Yin Junction", "下腹部，前正中線上，臍下1寸", "0.5-1.0 cun perpendicular", "理氣調經", "腹痛、水腫、疝氣、陰部多汗、月經不調、崩漏、帶下、產後血暈"],
    ["CV10", "Xia Wan", "下脘", "Lower Stomach Cavity", "上腹部，前正中線上，臍上2寸", "0.5-1.0 cun perpendicular", "和胃健脾", "腹痛、腹脹、嘔吐、呃逆、食穀不化、痞塊、瘀血泄瀉、痢疾"],
    ["CV11", "Jian Li", "建里", "Inner Strengthening", "上腹部，前正中線上，臍上3寸", "0.5-1.0 cun perpendicular", "和胃健脾", "胃脘痛、腹脹、嘔吐、食欲不振、腸中切痛、水腫"],
    ["CV13", "Shang Wan", "上脘", "Upper Stomach Cavity", "上腹部，前正中線上，臍上5寸", "0.5-1.0 cun perpendicular", "和胃降逆", "胃痛、嘔吐、呃逆、反胃、腹脹、納呆、心痛、心悸、癲狂癇"],
    ["CV14", "Ju Que", "巨闕", "Great Tower", "上腹部，前正中線上，臍上6寸", "0.5-1.0 cun perpendicular", "化痰寧心", "胸痛、心痛、心悸、嘔吐、吞酸、癲狂癇、健忘"],
    ["CV16", "Zhong Ting", "中庭", "Center Court", "胸部，前正中線上，平第5肋間隙", "0.3-0.5 cun perpendicular", "寬胸消脹", "胸脅滿、噎膈、嘔吐、心痛、小兒吐乳"],
    ["CV18", "Yu Tang", "玉堂", "Jade Hall", "胸部，前正中線上，平第3肋間隙", "0.3-0.5 cun transverse", "寬胸止咳", "膺胸疼痛、咳嗽、氣短、氣喘、嘔吐、胸悶"],
    ["CV19", "Zi Gong", "紫宮", "Purple Palace", "胸部，前正中線上，平第2肋間隙", "0.3-0.5 cun transverse", "寬胸理氣", "咳嗽、氣喘、胸痛、胸滿、喉痺、嘔吐"],
    ["CV20", "Hua Gai", "華蓋", "Florid Canopy", "胸部，前正中線上，平第1肋間隙", "0.3-0.5 cun transverse", "寬胸利膈", "咳嗽、氣喘、胸滿、脅肋痛、咽腫"],
    ["CV21", "Xuan Ji", "璇璣", "Jade Pendant", "胸部，前正中線上，天突下1寸", "0.3-0.5 cun transverse", "寬胸利肺", "咳嗽、氣喘、胸悶、咽喉腫痛、噎食、不思飲食"],
    ["CV22", "Tian Tu", "天突", "Heavenly Prominence", "頸部，胸骨上窩中央", "0.3-0.5 cun transverse downward (慢進)", "宣肺利氣", "咳嗽、氣喘、胸中氣逆、咯吐膿血、咽喉腫痛、暴瘖、癭氣、噎膈、梅核氣"],
    ["CV24", "Cheng Jiang", "承漿", "Sauce Receiver", "面部，頦唇溝的正中凹陷處", "0.3-0.5 cun transverse upward", "祛風通絡", "口眼歪斜、唇緊、面腫、齒痛、齦腫、流涎、口舌生瘡、暴瘖、癲癇"],
  ]),

  // ─────── GOVERNING VESSEL (GV) — 28 points ───────
  ...compact("Governing Vessel")([
    ["GV7", "Zhong Shu", "中樞", "Central Pivot", "背部，後正中線上，第10胸椎棘突下凹陷中", "0.5-1.0 cun oblique", "健脾利濕", "黃疸、嘔吐、腹滿、胃痛、食欲不振、腰背痛"],
    ["GV8", "Jin Suo", "筋縮", "Sinew Contraction", "背部，後正中線上，第9胸椎棘突下凹陷中", "0.5-1.0 cun oblique", "舒肝熄風", "癲癇、抽搐、脊強、背痛、胃痛、黃疸、四肢不收、筋攣拘急"],
    ["GV10", "Ling Tai", "靈台", "Spirit Tower", "背部，後正中線上，第6胸椎棘突下凹陷中", "0.5-1.0 cun oblique", "清熱解毒", "咳嗽、氣喘、項強、脊痛、疔瘡"],
    ["GV11", "Shen Dao", "神道", "Spirit Path", "背部，後正中線上，第5胸椎棘突下凹陷中", "0.5-1.0 cun oblique", "養心安神", "心痛、驚悸、怔忡、失眠健忘、中風不語、癇證、咳嗽、氣喘、瘧疾、傷寒、肩背痛"],
    ["GV15", "Ya Men", "啞門", "Mute's Gate", "項部，後髮際正中直上0.5寸", "0.5-0.8 cun perpendicular (慢進避腦延髓)", "醒神開竅", "舌強不語、暴瘖、頸項強急、脊強反折、中風尸厥、癲狂癇、頭痛、衄血、重舌"],
    ["GV17", "Nao Hu", "腦戶", "Brain Door", "頭部，後髮際正中直上2.5寸", "0.3-0.5 cun transverse", "通竅醒腦", "頭重、頭痛、面赤、目黃、眩暈、面痛、音瘂、項強、癲狂癇"],
    ["GV18", "Qiang Jian", "強間", "Unyielding Space", "頭部，後髮際正中直上4寸", "0.3-0.5 cun transverse", "醒腦寧神", "頭痛、目眩、項強、癲狂癇"],
    ["GV19", "Hou Ding", "後頂", "Behind the Vertex", "頭部，後髮際正中直上5.5寸（百會後1.5寸）", "0.3-0.5 cun transverse", "醒腦寧神", "頭痛、眩暈、項強、癲狂癇"],
    ["GV22", "Xin Hui", "囟會", "Fontanelle Meeting", "頭部，前髮際正中直上2寸（百會前3寸）", "0.3-0.5 cun transverse (小兒前囟未閉禁針)", "通竅醒腦", "頭痛、目眩、面赤暴腫、鼻淵、鼻衄、癲疾、嗜睡"],
    ["GV25", "Su Liao", "素髎", "White Bone Hole", "面部，鼻尖正中央", "0.1 cun prick", "醒腦開竅", "鼻塞、鼻衄、鼻流清涕、鼻淵、鼻中息肉、低血壓、休克、新生兒窒息"],
    ["GV27", "Dui Duan", "兌端", "Extremity Mouth", "面部，上唇尖端，人中溝下端皮膚與唇的移行部", "0.1 cun prick", "醒神通絡", "癲狂、癔病、口歪唇緊、齒齦腫痛、鼻塞鼻衄、消渴嗜飲"],
    ["GV28", "Yin Jiao", "齦交", "Gum Intersection", "上唇內，唇繫帶與上齒齦的相接處", "0.1 cun prick or transverse", "寧神鎮痙", "齒齦腫痛、口臭、齒衄、面赤頰腫、唇吻強急、面腫、項強、癲狂、痔疾"],
  ]),
];

async function main() {
  console.log(`\n[Acupoints] Adding ${POINTS.length} standard meridian points\n`);
  let ac = 0;
  for (const a of POINTS) {
    if (await prisma.acupuncturePoint.findFirst({ where: { code: a.code } })) continue;
    await prisma.acupuncturePoint.create({ data: { code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng, meridian: a.merid, location: a.loc, depth: a.depth, actions: a.act, indications: a.ind, status: "PUBLISHED" } });
    ac++;
  }
  console.log(`+${ac} acupoints`);
  const cnt = await prisma.acupuncturePoint.count();
  const merids = await prisma.acupuncturePoint.groupBy({ by: ["meridian"], _count: true });
  console.log(`Total: ${cnt} acupoints across ${merids.length} meridians`);
  for (const m of merids.sort((a,b) => b._count - a._count)) console.log(`  ${m.meridian.padEnd(22)} ${m._count}`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
