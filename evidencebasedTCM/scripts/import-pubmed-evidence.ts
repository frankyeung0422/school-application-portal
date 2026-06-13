/**
 * PubMed → EvidenceEntry batch importer.
 *
 * For each TCM topic we (a) query PubMed for top-relevance RCTs/SR/MAs in
 * the last 10 years, (b) ask Claude to grade each paper, and (c) insert as
 * EvidenceEntry with the appropriate EvidenceHerbLink / EvidenceFormulaLink
 * / EvidencePatternLink rows.
 *
 * Idempotent — skips papers already imported by pubmedId.
 *
 * Run dry:    npx tsx scripts/import-pubmed-evidence.ts
 * Run apply:  npx tsx scripts/import-pubmed-evidence.ts --apply
 * Limit:      npx tsx scripts/import-pubmed-evidence.ts --apply --max=50
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { esearch, efetch, type PubMedArticle } from "../src/lib/research/pubmed";
import { gradePaper, type GradedEvidence } from "../src/lib/research/grade-paper";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface Topic {
  // Human-readable label (Chinese) for log output.
  label: string;
  // PubMed query — combine TCM keyword + condition + study type filter.
  // Wrap intervention in OR group and condition in another OR group.
  query: string;
  // Per-topic cap (we usually want ≤ 10 papers per topic for diversity).
  retmax: number;
  // Cross-reference targets. Use pinyin (matches Herb.pinyinName / Formula.pinyinName)
  // and English pattern name where available.
  herbPinyin?: string[];
  formulaPinyin?: string[];
  patternPinyin?: string[];
}

// Topics span the existing condition catalog. Queries are intentionally
// narrow so we get high-precision matches — broad terms drag in too much noise.
const TOPICS: Topic[] = [
  // ───── Cardiovascular ─────
  {
    label: "丹參 / 冠心病 - Salvia for CHD",
    query: "(Salvia miltiorrhiza OR Danshen) AND (coronary heart disease OR angina) AND (randomized OR meta-analysis OR systematic review)",
    retmax: 8,
    herbPinyin: ["Dan Shen"],
  },
  {
    label: "黃芪 / 心衰 - Astragalus for heart failure",
    query: "(Astragalus OR Huang Qi) AND (heart failure OR cardiac function) AND (randomized OR meta-analysis OR systematic review)",
    retmax: 6,
    herbPinyin: ["Huang Qi"],
  },
  // ───── Diabetes ─────
  {
    label: "黃連 / 糖尿病 - Coptis for T2DM",
    query: "(Coptis OR berberine) AND (type 2 diabetes OR glycemic control) AND (randomized OR meta-analysis OR systematic review)",
    retmax: 8,
    herbPinyin: ["Huang Lian"],
  },
  // ───── Insomnia / Anxiety ─────
  {
    label: "酸棗仁 / 失眠 - Suan Zao Ren for insomnia",
    query: "(Suan Zao Ren OR Ziziphus jujuba) AND (insomnia OR sleep) AND (randomized OR clinical trial)",
    retmax: 6,
    herbPinyin: ["Suan Zao Ren"],
    formulaPinyin: ["Suan Zao Ren Tang"],
  },
  {
    label: "酸棗仁湯 - Suan Zao Ren Tang RCTs",
    query: "(Suan Zao Ren Tang OR Suanzaoren decoction) AND (randomized OR systematic review)",
    retmax: 5,
    formulaPinyin: ["Suan Zao Ren Tang"],
  },
  // ───── Depression / Liver Qi ─────
  {
    label: "逍遙散 / 抑鬱 - Xiao Yao San for depression",
    query: "(Xiaoyao San OR Xiao Yao San OR Free and Easy Wanderer) AND (depression OR anxiety) AND (randomized OR systematic review)",
    retmax: 6,
    formulaPinyin: ["Xiao Yao San"],
  },
  // ───── GI / IBS / Functional dyspepsia ─────
  {
    label: "六君子湯 / 功能性消化不良",
    query: "(Liu Jun Zi Tang OR Rikkunshito) AND (functional dyspepsia OR gastric emptying) AND (randomized OR clinical trial)",
    retmax: 6,
    formulaPinyin: ["Liu Jun Zi Tang"],
  },
  // ───── Cold / Flu ─────
  {
    label: "銀翹散 / 上呼吸道感染",
    query: "(Yin Qiao San OR Yinqiaosan) AND (cold OR upper respiratory infection OR influenza) AND (randomized OR clinical trial)",
    retmax: 6,
    formulaPinyin: ["Yin Qiao San"],
  },
  {
    label: "麻杏石甘湯 / 肺炎、咳嗽",
    query: "(Maxing Shigan Tang OR Ma Xing Shi Gan Tang) AND (pneumonia OR cough OR asthma) AND (randomized OR clinical trial)",
    retmax: 5,
    formulaPinyin: ["Ma Xing Shi Gan Tang"],
  },
  // ───── Pain ─────
  {
    label: "獨活寄生湯 / 膝關節炎、腰痛",
    query: "(Duhuo Jisheng Tang OR Du Huo Ji Sheng Tang) AND (knee osteoarthritis OR low back pain) AND (randomized OR clinical trial)",
    retmax: 5,
    formulaPinyin: ["Du Huo Ji Sheng Tang"],
  },
  // ───── Menopause ─────
  {
    label: "二仙湯 / 更年期",
    query: "(Erxian Tang OR Er Xian Tang) AND (menopause OR perimenopausal) AND (randomized OR clinical trial)",
    retmax: 5,
  },
  // ───── Hypertension ─────
  {
    label: "天麻 / 高血壓",
    query: "(Gastrodia OR Tian Ma) AND (hypertension OR blood pressure) AND (randomized OR clinical trial OR meta-analysis)",
    retmax: 5,
    herbPinyin: ["Tian Ma"],
  },
  // ───── COVID-19 ─────
  {
    label: "連花清瘟 / COVID-19",
    query: "(Lianhua Qingwen OR Lian Hua Qing Wen) AND (COVID-19 OR SARS-CoV-2) AND (randomized OR systematic review)",
    retmax: 6,
  },
  // ───── Cancer adjunct ─────
  {
    label: "黃芪 / 化療輔助",
    query: "(Astragalus) AND (chemotherapy OR cancer adjuvant) AND (randomized OR systematic review)",
    retmax: 5,
    herbPinyin: ["Huang Qi"],
  },
  // ───── Stroke ─────
  {
    label: "補陽還五湯 / 中風後遺症",
    query: "(Buyang Huanwu Tang OR Bu Yang Huan Wu Tang) AND (stroke OR ischemic stroke) AND (randomized OR systematic review)",
    retmax: 5,
    formulaPinyin: ["Bu Yang Huan Wu Tang"],
  },
  // ───── Acupuncture ─────
  {
    label: "針灸 / 偏頭痛",
    query: "acupuncture AND (migraine OR tension headache) AND (randomized OR meta-analysis)",
    retmax: 6,
  },
  {
    label: "針灸 / 慢性下背痛",
    query: "acupuncture AND (chronic low back pain) AND (randomized OR meta-analysis)",
    retmax: 5,
  },
  // ───── Allergic rhinitis ─────
  {
    label: "玉屏風散 / 過敏性鼻炎",
    query: "(Yupingfeng San OR Yu Ping Feng San OR Jade Windscreen) AND (allergic rhinitis OR allergy) AND (randomized OR clinical trial)",
    retmax: 5,
  },
];

const MIN_YEAR = 2010;
const MAX_YEAR = new Date().getFullYear();

const argv = new Set(process.argv.slice(2));
const APPLY = argv.has("--apply");
const MAX_OVERALL =
  Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1]) || 300;

function trunc(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  const t = s.trim();
  if (t.length === 0) return null;
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

async function main() {
  console.log(`[pubmed-import] mode=${APPLY ? "APPLY" : "DRY-RUN"}  cap=${MAX_OVERALL}  topics=${TOPICS.length}`);
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error("Need OPENAI_API_KEY or ANTHROPIC_API_KEY in .env for paper grading.");
    process.exit(2);
  }

  // Pre-load cross-ref maps once.
  const [herbs, formulas, patterns] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, pinyinName: true, chineseName: true } }),
    prisma.formula.findMany({ select: { id: true, pinyinName: true, chineseName: true } }),
    prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } }),
  ]);
  const herbByPinyin = new Map(herbs.map((h) => [h.pinyinName.toLowerCase(), h.id]));
  const formulaByPinyin = new Map(formulas.map((f) => [f.pinyinName.toLowerCase(), f.id]));
  const patternByPinyin = new Map(patterns.map((p) => [p.pinyinName.toLowerCase(), p.id]));

  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoAbstract = 0;
  let skippedGradeFail = 0;
  let total = 0;

  for (const t of TOPICS) {
    if (inserted >= MAX_OVERALL) break;
    console.log(`\n── ${t.label}  (cap ${t.retmax})`);
    try {
      const pmids = await esearch(t.query, t.retmax, MIN_YEAR, MAX_YEAR);
      console.log(`   esearch → ${pmids.length} pmids`);
      if (pmids.length === 0) continue;

      // Skip ones already in DB.
      const existing = await prisma.evidenceEntry.findMany({
        where: { pubmedId: { in: pmids } },
        select: { pubmedId: true },
      });
      const existingSet = new Set(existing.map((e) => e.pubmedId));
      const fresh = pmids.filter((p) => !existingSet.has(p));
      skippedExisting += pmids.length - fresh.length;
      if (fresh.length === 0) {
        console.log(`   all ${pmids.length} already imported, skip`);
        continue;
      }

      const articles = await efetch(fresh);
      console.log(`   efetch → ${articles.length} articles`);
      total += articles.length;

      for (const a of articles) {
        if (inserted >= MAX_OVERALL) break;
        if (!a.abstract || a.abstract.length < 50) {
          skippedNoAbstract++;
          continue;
        }
        let grade: GradedEvidence | null;
        try {
          grade = await gradePaper(a);
        } catch (err) {
          console.log(`   ⚠ grade error PMID ${a.pubmedId}: ${err instanceof Error ? err.message : err}`);
          skippedGradeFail++;
          continue;
        }
        if (!grade) {
          skippedGradeFail++;
          continue;
        }

        if (!APPLY) {
          console.log(
            `   [dry] ${a.pubmedId} ${grade.studyType} ${grade.evidenceLevel}/${grade.evidenceGrade} — ${a.title.slice(0, 80)}`,
          );
          inserted++;
          continue;
        }

        // Insert with cross-refs.
        const created = await prisma.evidenceEntry.create({
          data: {
            title: trunc(a.title, 500)!,
            studyType: grade.studyType,
            evidenceLevel: grade.evidenceLevel,
            evidenceGrade: grade.evidenceGrade,
            authors: trunc(a.authors, 1000),
            journal: trunc(a.journal, 300),
            year: a.year,
            doi: a.doi,
            pubmedId: a.pubmedId,
            abstract: trunc(a.abstract, 8000),
            summary: trunc(grade.summary, 1000),
            sampleSize: grade.sampleSize,
            population: trunc(grade.population, 1000),
            intervention: trunc(grade.intervention, 1000),
            comparator: trunc(grade.comparator, 500),
            primaryOutcome: trunc(grade.primaryOutcome, 1000),
            resultsSummary: trunc(grade.resultsSummary, 2000),
            riskOfBias: grade.riskOfBias,
            qualityScore: grade.qualityScore,
            qualityTool: grade.riskOfBias ? "Cochrane RoB 2 (LLM-assessed)" : null,
            status: "PUBLISHED",
          },
          select: { id: true },
        });

        for (const hp of t.herbPinyin ?? []) {
          const hid = herbByPinyin.get(hp.toLowerCase());
          if (hid) {
            try {
              await prisma.evidenceHerbLink.create({
                data: {
                  evidenceId: created.id,
                  herbId: hid,
                  outcomeType: grade.outcomeType,
                  effectDirection: grade.effectDirection,
                },
              });
            } catch { /* duplicate */ }
          }
        }
        for (const fp of t.formulaPinyin ?? []) {
          const fid = formulaByPinyin.get(fp.toLowerCase());
          if (fid) {
            try {
              await prisma.evidenceFormulaLink.create({
                data: {
                  evidenceId: created.id,
                  formulaId: fid,
                  outcomeType: grade.outcomeType,
                  effectDirection: grade.effectDirection,
                },
              });
            } catch { /* duplicate */ }
          }
        }
        for (const pp of t.patternPinyin ?? []) {
          const pid = patternByPinyin.get(pp.toLowerCase());
          if (pid) {
            try {
              await prisma.evidencePatternLink.create({
                data: {
                  evidenceId: created.id,
                  patternId: pid,
                  outcomeType: grade.outcomeType,
                  effectDirection: grade.effectDirection,
                },
              });
            } catch { /* duplicate */ }
          }
        }

        console.log(
          `   ✓ ${a.pubmedId} ${grade.studyType} ${grade.evidenceLevel}/${grade.evidenceGrade} — ${a.title.slice(0, 70)}`,
        );
        inserted++;
      }
    } catch (err) {
      console.log(`   ✕ topic failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    `\n[pubmed-import] DONE — ${APPLY ? "inserted" : "would insert"} ${inserted}, ` +
      `skipped ${skippedExisting} already-present, ${skippedNoAbstract} no-abstract, ${skippedGradeFail} grade-fail; ${total} candidates seen.`,
  );

  const ec = await prisma.evidenceEntry.count();
  console.log(`  DB total evidence entries: ${ec}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
