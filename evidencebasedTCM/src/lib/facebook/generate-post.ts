/**
 * KB-mining content generator for Facebook posts.
 *
 * Picks a record from the TCM database (herb-drug interaction, contraindication,
 * formula+evidence pairing, etc.), wraps it as a topic brief, asks OpenAI to
 * compose an engaging zh-Hant post, and writes a markdown file to
 * marketing/cmarketplan/facebook-posts/generated/YYYY-MM-DD/ — same heading
 * conventions as hand-written posts so the existing parser/lister picks it up.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import { chat } from "./openai";

const FB_ROOT = path.join(process.cwd(), "marketing", "cmarketplan", "facebook-posts");
const GEN_ROOT = path.join(FB_ROOT, "generated");
const HISTORY_FILE = path.join(GEN_ROOT, ".history.json");

export type TopicKind =
  | "herb-drug-interaction"
  | "contraindication-pregnancy"
  | "formula-evidence"
  | "evidence-spotlight"
  | "herb-active-compound";

export interface TopicBrief {
  kind: TopicKind;
  refKey: string; // stable key for dedupe ("hdi:<id>", "herb:<id>", etc.)
  headline: string; // short label for logs/UI
  context: Record<string, unknown>; // shoveled to the LLM
  suggestedTemplate: string; // SVG template filename
}

interface History {
  used: string[]; // refKeys already featured
}

async function readHistory(): Promise<History> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as History;
  } catch {
    return { used: [] };
  }
}

async function writeHistory(h: History): Promise<void> {
  await fs.mkdir(GEN_ROOT, { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(h, null, 2), "utf-8");
}

/**
 * Pick a topic the system hasn't covered yet. Rotates through kinds for
 * variety. Returns null only if literally everything has been used (very
 * unlikely given KB size).
 */
export async function pickTopic(): Promise<TopicBrief | null> {
  const history = await readHistory();
  const used = new Set(history.used);

  const order: TopicKind[] = [
    "herb-drug-interaction",
    "contraindication-pregnancy",
    "formula-evidence",
    "evidence-spotlight",
    "herb-active-compound",
  ];
  const start = history.used.length % order.length;

  for (let i = 0; i < order.length; i++) {
    const kind = order[(start + i) % order.length];
    const topic = await pickByKind(kind, used);
    if (topic) return topic;
  }
  return null;
}

async function pickByKind(kind: TopicKind, used: Set<string>): Promise<TopicBrief | null> {
  if (kind === "herb-drug-interaction") {
    const rows = await prisma.herbDrugInteraction.findMany({
      where: { severity: { in: ["MAJOR", "MODERATE"] } },
      include: { herb: true },
      take: 200,
    });
    for (const r of rows) {
      const key = `hdi:${r.id}`;
      if (used.has(key)) continue;
      return {
        kind,
        refKey: key,
        headline: `${r.herb.chineseName} × ${r.drugName} (${r.severity})`,
        context: {
          herb: {
            chineseName: r.herb.chineseName,
            pinyinName: r.herb.pinyinName,
            englishName: r.herb.englishName,
            category: r.herb.category,
          },
          drugName: r.drugName,
          drugClass: r.drugClass,
          severity: r.severity,
          interactionType: r.interactionType,
          mechanism: r.mechanism,
          clinicalEffect: r.clinicalEffect,
          management: r.management,
          evidenceQuality: r.evidenceQuality,
        },
        suggestedTemplate: "01-hook-photo.svg",
      };
    }
    return null;
  }

  if (kind === "contraindication-pregnancy") {
    const rows = await prisma.herbContraindication.findMany({
      where: { pregnancyCategory: { in: ["CONTRAINDICATED", "CAUTION"] } },
      include: { herb: true },
      take: 200,
    });
    for (const r of rows) {
      const key = `ci:${r.id}`;
      if (used.has(key)) continue;
      return {
        kind,
        refKey: key,
        headline: `${r.herb.chineseName} 妊娠 ${r.pregnancyCategory}`,
        context: {
          herb: { chineseName: r.herb.chineseName, pinyinName: r.herb.pinyinName, englishName: r.herb.englishName },
          condition: r.condition,
          severity: r.severity,
          pregnancyCategory: r.pregnancyCategory,
          lactationSafety: r.lactationSafety,
          description: r.description,
        },
        suggestedTemplate: "05-data-stat.svg",
      };
    }
    return null;
  }

  if (kind === "formula-evidence") {
    const rows = await prisma.evidenceFormulaLink.findMany({
      where: {
        evidence: { evidenceGrade: { in: ["A", "B"] } },
      },
      include: { evidence: true, formula: true },
      take: 200,
    });
    for (const r of rows) {
      const key = `fev:${r.id}`;
      if (used.has(key)) continue;
      return {
        kind,
        refKey: key,
        headline: `${r.formula.chineseName} — ${r.evidence.title.slice(0, 40)}`,
        context: {
          formula: {
            chineseName: r.formula.chineseName,
            pinyinName: r.formula.pinyinName,
            englishName: r.formula.englishName,
            actions: r.formula.actions,
            indications: r.formula.indications,
            sourceText: r.formula.sourceText,
          },
          evidence: {
            title: r.evidence.title,
            studyType: r.evidence.studyType,
            evidenceGrade: r.evidence.evidenceGrade,
            year: r.evidence.year,
            sampleSize: r.evidence.sampleSize,
            primaryOutcome: r.evidence.primaryOutcome,
            resultsSummary: r.evidence.resultsSummary,
            summary: r.evidence.summary,
          },
          outcomeType: r.outcomeType,
          effectDirection: r.effectDirection,
        },
        suggestedTemplate: "03-case-study.svg",
      };
    }
    return null;
  }

  if (kind === "evidence-spotlight") {
    const rows = await prisma.evidenceEntry.findMany({
      where: { evidenceGrade: { in: ["A", "B"] }, year: { gte: 2018 } },
      orderBy: { year: "desc" },
      take: 200,
    });
    for (const r of rows) {
      const key = `ev:${r.id}`;
      if (used.has(key)) continue;
      return {
        kind,
        refKey: key,
        headline: `${r.title.slice(0, 50)} (${r.year})`,
        context: {
          title: r.title,
          studyType: r.studyType,
          evidenceGrade: r.evidenceGrade,
          authors: r.authors,
          journal: r.journal,
          year: r.year,
          sampleSize: r.sampleSize,
          population: r.population,
          intervention: r.intervention,
          primaryOutcome: r.primaryOutcome,
          resultsSummary: r.resultsSummary,
          summary: r.summary,
        },
        suggestedTemplate: "02-quick-tip.svg",
      };
    }
    return null;
  }

  if (kind === "herb-active-compound") {
    const rows = await prisma.herb.findMany({
      where: { activeCompounds: { some: {} } },
      include: { activeCompounds: { take: 3 } },
      take: 200,
    });
    for (const r of rows) {
      const key = `hc:${r.id}`;
      if (used.has(key)) continue;
      return {
        kind,
        refKey: key,
        headline: `${r.chineseName} 活性成分`,
        context: {
          chineseName: r.chineseName,
          pinyinName: r.pinyinName,
          englishName: r.englishName,
          latinName: r.latinName,
          category: r.category,
          nature: r.nature,
          flavor: r.flavor,
          meridianTropism: r.meridianTropism,
          modernPharmacology: r.modernPharmacology,
          activeCompounds: r.activeCompounds.map((c) => ({
            name: c.compoundName,
            cas: c.casNumber,
          })),
        },
        suggestedTemplate: "02-quick-tip.svg",
      };
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// LLM prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `你是「實證中醫 EBTCM」的社群媒體編輯。網站：evidencebasedtcm.com。

品牌調性：
- 繁體中文（香港），偶爾混入英文藥名 / 學術詞
- 友善、實證、不誇大；用「研究顯示」「Cochrane 評級」「GRADE B」等
- 每篇以一個吸引人的鈎子開頭（故事 / 數字 / 問題）
- 200–400 字內文
- 1–3 個 emoji（不濫用）
- 結尾必有 CTA：免費查詢 / 下載 / 留言
- 結尾 5–7 個 hashtag（#實證中醫 必含）

輸出嚴格 JSON，欄位：
{
  "title": "Week 5 · 主題類型 · 簡短標題",
  "body": "貼文內文（繁中）",
  "firstComment": "第一則留言（含網址）",
  "poster": {
    "smallLabel": "實證中醫 · 知識分享",
    "line1": "海報主標 line 1（≤10字）",
    "line2": "海報主標 line 2（≤10字）",
    "subLine1": "副標 line 1（≤16字）",
    "subLine2": "副標 line 2（≤16字）",
    "ctaLine1": "海報 CTA（≤14字）",
    "url": "evidencebasedtcm.com/<path>"
  }
}

切記：不可發明 DOI、不可發明數據、不可宣稱「治癒」。如資料庫無數字，改用定性表述。`;

export interface GeneratedPost {
  topic: TopicBrief;
  title: string;
  body: string;
  firstComment: string;
  poster: {
    smallLabel: string;
    line1: string;
    line2: string;
    subLine1: string;
    subLine2: string;
    ctaLine1: string;
    url: string;
  };
}

export async function generatePost(topic: TopicBrief): Promise<GeneratedPost> {
  const userPrompt = `主題類型：${topic.kind}
標題提示：${topic.headline}

資料庫原始記錄（請以此為唯一事實來源）：
\`\`\`json
${JSON.stringify(topic.context, null, 2)}
\`\`\`

請寫一篇 Facebook 貼文。`;

  const raw = await chat({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    responseFormat: "json_object",
    temperature: 0.85,
    maxTokens: 1400,
  });

  let parsed: Omit<GeneratedPost, "topic">;
  try {
    parsed = JSON.parse(raw) as Omit<GeneratedPost, "topic">;
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${(e as Error).message}. Raw: ${raw.slice(0, 300)}`);
  }
  if (!parsed.title || !parsed.body || !parsed.poster) {
    throw new Error(`LLM output missing required fields. Got: ${Object.keys(parsed).join(",")}`);
  }
  return { ...parsed, topic };
}

// ---------------------------------------------------------------------------
// Persist
// ---------------------------------------------------------------------------

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Write the generated post to disk as a markdown file using the same heading
 * conventions as hand-written posts, then update the history file so the
 * topic isn't re-picked.
 *
 * Returns the absolute path to the written file.
 */
export async function writePostFile(p: GeneratedPost): Promise<string> {
  const day = todayISO();
  const dir = path.join(GEN_ROOT, day);
  await fs.mkdir(dir, { recursive: true });

  // Count existing posts in today's folder to build NN-<slug> stem.
  const existing = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith(".md"));
  const idx = String(existing.length + 1).padStart(2, "0");
  const slug = slugify(p.topic.headline) || p.topic.kind;
  const stem = `${idx}-${slug}`;
  const filePath = path.join(dir, `${stem}.md`);

  const md = `# ${p.title}

**類型**：${p.topic.kind}
**來源**：AI 生成（KB 來源：${p.topic.refKey}）
**海報模板**：\`${p.topic.suggestedTemplate}\`

---

## 貼文內文

${p.body}

---

## 第一則留言

${p.firstComment}

---

## 海報文字（${p.topic.suggestedTemplate}）

- **SMALL LABEL**: ${p.poster.smallLabel}
- **LINE 1**: ${p.poster.line1}
- **LINE 2**: ${p.poster.line2}
- **SUB LINE 1**: ${p.poster.subLine1}
- **SUB LINE 2**: ${p.poster.subLine2}
- **CTA LINE 1**: ${p.poster.ctaLine1}
- **URL**: ${p.poster.url}
`;

  await fs.writeFile(filePath, md, "utf-8");

  const history = await readHistory();
  history.used.push(p.topic.refKey);
  await writeHistory(history);

  return filePath;
}
