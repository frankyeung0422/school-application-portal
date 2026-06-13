/**
 * Import course lecture notes from theqi.com into the CourseLesson table.
 * Fetches HTML, extracts text content, and stores structured knowledge.
 *
 * Run: npx tsx scripts/import-courses.ts [courseId] [startLesson] [endLesson]
 * Example: npx tsx scripts/import-courses.ts class6 1 20
 * Default: imports key lessons from all courses
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface CourseConfig {
  id: string;
  name: string;
  instructor: string;
  prefix: string;
  totalLessons: number;
  // Key lessons to import (most clinically valuable)
  keyLessons: number[];
}

const COURSES: CourseConfig[] = [
  {
    id: "class6", name: "中藥學", instructor: "張廷模教授",
    prefix: "med_", totalLessons: 79,
    keyLessons: [1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 79],
  },
  {
    id: "class4", name: "方劑學", instructor: "鄧中甲教授",
    prefix: "fj", totalLessons: 82,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 82],
  },
  {
    id: "class5", name: "中醫基礎理論", instructor: "李德新教授",
    prefix: "c", totalLessons: 75,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75],
  },
  {
    id: "class3", name: "診斷學", instructor: "朱文鋒教授",
    prefix: "zd", totalLessons: 75,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75],
  },
  {
    id: "class1", name: "傷寒論", instructor: "郝萬山教授",
    prefix: "note_", totalLessons: 70,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  },
  {
    id: "class2", name: "金匱要略", instructor: "王雪華教授",
    prefix: "kg_", totalLessons: 80,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
  },
  {
    id: "class7", name: "黃帝內經", instructor: "王洪圖教授",
    prefix: "nj_", totalLessons: 80,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
  },
  {
    id: "class8", name: "溫病學", instructor: "劉景源教授",
    prefix: "wb", totalLessons: 72,
    keyLessons: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 72],
  },
];

// Simple HTML-to-text extraction
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<\/th>/gi, " | ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extract herb names from text
function extractHerbs(text: string): string[] {
  const herbPatterns = [
    "人參", "黃耆", "黃芪", "白朮", "甘草", "大棗", "當歸", "熟地", "白芍", "川芎",
    "茯苓", "澤瀉", "半夏", "陳皮", "柴胡", "黃芩", "黃連", "黃柏", "梔子", "連翹",
    "金銀花", "丹參", "紅花", "桃仁", "麻黃", "桂枝", "薄荷", "葛根", "天麻", "鉤藤",
    "酸棗仁", "遠志", "龍骨", "牡蠣", "石膏", "知母", "枸杞子", "山茱萸", "杜仲",
    "附子", "肉桂", "乾薑", "生薑", "五味子", "麥門冬", "百合", "石斛", "天花粉",
    "地龍", "靈芝", "決明子", "刺蒺藜", "木香", "香附", "枳殼", "枳實", "厚朴",
    "薏苡仁", "砂仁", "豆蔻", "蒼朮", "防風", "羌活", "獨活", "牛膝", "秦艽",
  ];
  return herbPatterns.filter((h) => text.includes(h));
}

// Extract formula names from text
function extractFormulas(text: string): string[] {
  const formulaPatterns = [
    "桂枝湯", "麻黃湯", "小柴胡湯", "大柴胡湯", "白虎湯", "承氣湯", "四逆湯",
    "理中湯", "四君子湯", "四物湯", "八珍湯", "十全大補湯", "歸脾湯", "逍遙散",
    "六味地黃丸", "金匱腎氣丸", "補中益氣湯", "生脈散", "酸棗仁湯", "天王補心丹",
    "半夏瀉心湯", "黃連解毒湯", "龍膽瀉肝湯", "導赤散", "清營湯", "犀角地黃湯",
    "血府逐瘀湯", "補陽還五湯", "二陳湯", "溫膽湯", "半夏白朮天麻湯", "止嗽散",
    "麻杏石甘湯", "銀翹散", "桑菊飲", "敗毒散", "天麻鉤藤飲", "痛瀉要方",
    "川芎茶調散", "甘麥大棗湯", "玉泉丸", "真武湯", "知柏地黃丸", "香砂六君子湯",
    "參苓白朮散", "保和丸", "越婢湯", "柴葛解肌湯", "當歸四逆湯", "陽和湯",
  ];
  return formulaPatterns.filter((f) => text.includes(f));
}

// Extract clinical pearls (sentences with clinical keywords)
function extractClinicalPearls(text: string): string {
  const keywords = ["臨床", "應用", "禁忌", "注意", "配伍", "用量", "現代", "研究", "療效", "治療"];
  const sentences = text.split(/[。！？\n]/).filter((s) => s.length > 10 && s.length < 200);
  const pearls = sentences.filter((s) => keywords.some((k) => s.includes(k))).slice(0, 10);
  return pearls.join("\n");
}

async function fetchLesson(course: CourseConfig, lessonNum: number): Promise<string | null> {
  const padded = lessonNum.toString().padStart(2, "0");
  const url = `https://www.theqi.com/cmed/class/${course.id}/${course.prefix}${padded}.html`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const html = await res.text();
    return htmlToText(html);
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetCourse = args[0] ?? null;
  const startLesson = args[1] ? parseInt(args[1]) : null;
  const endLesson = args[2] ? parseInt(args[2]) : null;

  const courses = targetCourse
    ? COURSES.filter((c) => c.id === targetCourse)
    : COURSES;

  if (courses.length === 0) {
    console.error(`Course "${targetCourse}" not found.`);
    process.exit(1);
  }

  let totalImported = 0;
  let totalSkipped = 0;

  for (const course of courses) {
    const lessons = startLesson && endLesson
      ? Array.from({ length: endLesson - startLesson + 1 }, (_, i) => startLesson + i)
      : course.keyLessons;

    console.log(`\n[${course.id}] ${course.name} — importing ${lessons.length} lessons…`);

    for (const num of lessons) {
      // Skip if already imported
      const exists = await prisma.courseLesson.findUnique({
        where: { courseId_lessonNum: { courseId: course.id, lessonNum: num } },
      });
      if (exists) {
        console.log(`  ↷ skip #${num} (exists)`);
        totalSkipped++;
        continue;
      }

      const text = await fetchLesson(course, num);
      if (!text || text.length < 100) {
        console.log(`  ✗ #${num} (fetch failed or too short)`);
        continue;
      }

      // Extract first meaningful line as title
      const lines = text.split("\n").filter((l) => l.trim().length > 2);
      const title = lines[0]?.slice(0, 100) ?? `${course.name} 第${num}講`;

      // Extract structured data
      const herbs = extractHerbs(text);
      const formulas = extractFormulas(text);
      const pearls = extractClinicalPearls(text);

      // Infer category from content keywords
      let category: string | null = null;
      const catMap: [string, string][] = [
        ["補氣", "補氣藥"], ["補血", "補血藥"], ["補陰", "補陰藥"], ["補陽", "補陽藥"],
        ["清熱", "清熱藥"], ["解表", "解表藥"], ["理氣", "理氣藥"], ["活血", "活血藥"],
        ["安神", "安神藥"], ["平肝", "平肝息風藥"], ["化痰", "化痰藥"], ["利濕", "利濕藥"],
        ["溫裡", "溫裡藥"], ["瀉下", "瀉下藥"], ["收澀", "收澀藥"], ["消食", "消食藥"],
        ["祛風濕", "祛風濕藥"], ["開竅", "開竅藥"], ["外用", "外用藥"],
        ["解表劑", "解表劑"], ["瀉下劑", "瀉下劑"], ["和解劑", "和解劑"],
        ["清熱劑", "清熱劑"], ["補益劑", "補益劑"], ["理血劑", "理血劑"],
        ["安神劑", "安神劑"], ["理氣劑", "理氣劑"], ["治風劑", "治風劑"],
        ["祛濕劑", "祛濕劑"], ["祛痰劑", "祛痰劑"], ["溫裡劑", "溫裡劑"],
        ["陰陽", "陰陽學說"], ["五行", "五行學說"], ["臟腑", "臟腑學說"],
        ["經絡", "經絡學說"], ["病因", "病因病機"], ["診法", "診法"],
        ["辨證", "辨證論治"], ["太陽", "太陽病"], ["陽明", "陽明病"],
        ["少陽", "少陽病"], ["太陰", "太陰病"], ["少陰", "少陰病"],
      ];
      for (const [kw, cat] of catMap) {
        if (text.includes(kw)) { category = cat; break; }
      }

      // Build key points from first 5 substantive lines
      const keyPoints = lines.slice(0, 8).filter((l) => l.length > 15).join("\n");

      await prisma.courseLesson.create({
        data: {
          courseId: course.id,
          courseName: course.name,
          instructor: course.instructor,
          lessonNum: num,
          title,
          category,
          content: text.slice(0, 30000), // Cap at 30KB
          keyPoints: keyPoints.slice(0, 2000),
          herbsMentioned: herbs.length > 0 ? JSON.stringify(herbs) : null,
          formulasMentioned: formulas.length > 0 ? JSON.stringify(formulas) : null,
          clinicalPearls: pearls.slice(0, 2000) || null,
          source: "theqi.com",
        },
      });

      console.log(`  ✓ #${num} "${title.slice(0, 40)}…" (${herbs.length}h ${formulas.length}f ${text.length}ch)`);
      totalImported++;

      // Rate limit
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\n[done] ${totalImported} imported · ${totalSkipped} skipped`);
  const total = await prisma.courseLesson.count();
  console.log(`[db] ${total} total lessons in database\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
