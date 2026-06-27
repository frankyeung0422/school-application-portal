import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";

/**
 * Photo-to-formula analyzer. Vision call (OpenAI gpt-4o or Claude Opus,
 * configurable) extracts a herb list from the 處方 photo, fuzzy-matches
 * each herb to the DB, then matches the composition against known
 * Formula entries to surface likely formula, patterns, and conditions.
 * Clinical decision support only — never replaces a 中醫師's judgment.
 */

export interface ExtractedHerb {
  name: string;
  pinyin?: string;
  dosage?: string;
  notes?: string;
}

export interface AnalysisResult {
  ok: true;
  rawPrescription: string;
  extractedHerbs: ExtractedHerb[];
  matchedHerbs: Array<{
    raw: string;
    herbId: string;
    chineseName: string;
    pinyinName: string;
    category: string;
    dosage?: string;
  }>;
  unmatchedHerbs: string[];
  matchedFormulas: Array<{
    formulaId: string;
    chineseName: string;
    pinyinName: string;
    category: string;
    actions: string | null;
    indications: string | null;
    matchPct: number;
    matchedHerbCount: number;
    totalHerbCount: number;
  }>;
  suggestedConditions: Array<{
    conditionId: string;
    westernName: string;
    chineseName: string;
    tcmName: string | null;
    icd11Code: string | null;
    score: number;
  }>;
  suggestedPatterns: Array<{
    patternId: string;
    chineseName: string;
    pinyinName: string;
    score: number;
  }>;
  warnings: string[];
}

export interface AnalysisError {
  ok: false;
  error: string;
  reason: "no_api_key" | "vision_error" | "no_herbs_found" | "internal";
}

export type AnalysisResponse = AnalysisResult | AnalysisError;

type VisionProvider = "openai" | "anthropic";
type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

// Models can be overridden via env. Defaults are chosen for accuracy on
// handwritten Traditional Chinese — gpt-4o is markedly stronger than
// gpt-4o-mini on cursive 中藥 names; claude-opus-4-7 likewise on Anthropic.
const OPENAI_VISION_MODEL = process.env.OCR_OPENAI_MODEL ?? "gpt-4o";
const ANTHROPIC_VISION_MODEL = process.env.OCR_ANTHROPIC_MODEL ?? "claude-opus-4-7";

function buildVisionPrompt(herbAnchors: string[]): string {
  // Include up to ~250 known herb names as an anchor vocabulary — the model
  // can snap ambiguous handwriting to the closest legitimate herb instead of
  // hallucinating a near-character. This is the single biggest accuracy win
  // for cursive 處方.
  const anchorBlock = herbAnchors.length > 0
    ? `\n\nKNOWN HERB VOCABULARY (use these exact characters whenever the strokes plausibly match — do NOT invent variants):\n${herbAnchors.join("、")}`
    : "";
  return `You are an expert Traditional Chinese Medicine (TCM) prescription parser working on a 處方箋 photo (often handwritten by a 中醫師, sometimes printed/typed).

Return ONLY a strict JSON object with this shape:
{
  "transcription": "<full transcription of every visible Chinese character — herb names + dosages + any annotations like 先煎/後下/水煎服/共X劑>",
  "herbs": [
    {"name": "<herb chinese name, e.g. 黃芪>", "pinyin": "<pinyin if obvious e.g. Huang Qi>", "dosage": "<e.g. 30g, 9g, 三錢>", "notes": "<optional: 先煎 / 後下 / 沖服 / 包煎 / role if marked>"}
  ]
}

Rules:
- Be METHODICAL. First mentally transcribe top-to-bottom, right-to-left if it's a column layout. Then list each herb you transcribed.
- Most prescriptions list ONE herb per line, often with the dosage right after the name (e.g. "黃芪 30g" or "黃芪三錢").
- Common cursive shorthands: 「炙」(炙) prefix on 甘草/黃耆 etc., 「炒」prefix, 「生」prefix. Keep the prefix in the herb name (e.g. 炙甘草, 炒白朮).
- Distinguish similar characters: 黃芩 vs 黃芪 vs 黃連; 桂枝 vs 桂皮; 白朮 vs 蒼朮; 半夏 vs 法半夏 vs 制半夏.
- Both Simplified and Traditional are common — preserve the form written. (e.g. 黄芪 vs 黃芪 — both fine.)
- Dosages: "g" or "克" or 錢/分 are all common. Quantities like "三錢" / "9克" both OK.
- Do NOT invent herbs you cannot see. If a stroke is ambiguous and there is no plausible match in the vocabulary, omit it rather than guess.
- If the image clearly is NOT a TCM prescription (e.g. random photo, English-only, food menu), return {"transcription": "<what you see>", "herbs": []}.
- Output JSON ONLY — no prose, no markdown fences, no explanation.${anchorBlock}`;
}

export function getConfiguredVisionProvider(): VisionProvider | null {
  // Prefer OpenAI when both keys are set.
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

function stripJsonFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
}

/**
 * Hand-curated Chinese name for the western disease label. The DB stores
 * westernName in English (ICD-style), but the UI is Traditional Chinese, so
 * surface the Chinese disease name in the suggestedConditions list.
 *
 * Falls back to the westernName itself if not in the map.
 */
const WESTERN_NAME_TO_ZH: Record<string, string> = {
  // Core 15 from prisma/seeds/conditions.ts
  "Chronic Fatigue Syndrome": "慢性疲勞綜合徵",
  "Major Depressive Disorder": "重性抑鬱障礙",
  "Irritable Bowel Syndrome": "腸躁症",
  "Primary Insomnia": "原發性失眠",
  "Chronic Low Back Pain": "慢性下背痛",
  "Functional Dyspepsia": "功能性消化不良",
  "Essential Hypertension": "原發性高血壓",
  "Type 2 Diabetes Mellitus": "2型糖尿病",
  "Allergic Rhinitis": "過敏性鼻炎",
  "Menopausal Syndrome": "更年期綜合徵",
  "Migraine": "偏頭痛",
  "Knee Osteoarthritis": "膝骨關節炎",
  "Coronary Heart Disease": "冠狀動脈心臟病",
  "Chronic Obstructive Pulmonary Disease": "慢性阻塞性肺疾病",
  "Chemotherapy-Induced Nausea and Vomiting": "化療誘導的噁心嘔吐",
  // 4 added 2026-05-10 for cold/flu prescription support
  "Influenza": "流行性感冒",
  "Common Cold": "普通感冒",
  "Acute Bronchitis": "急性支氣管炎",
  "Acute Pharyngitis": "急性咽炎",
  // Harvested from scripts/enrich-*.ts (chineseName already curated there)
  "Acne Vulgaris": "尋常痤瘡",
  "Acute Myocardial Infarction": "急性心肌梗死",
  "Acute Pancreatitis": "急性胰腺炎",
  "Age-Related Macular Degeneration": "年齡相關性黃斑變性",
  "Allergic Conjunctivitis": "過敏性結膜炎",
  "Alzheimer Disease": "阿茲海默症",
  "Asthma": "支氣管哮喘",
  "Atopic Dermatitis": "特應性皮炎",
  "Atrial Fibrillation": "心房顫動",
  "Attention Deficit Hyperactivity Disorder": "注意缺陷多動障礙",
  "Benign Prostatic Hyperplasia": "良性前列腺增生",
  "Cervical Spondylosis": "頸椎病",
  "Chronic Fatigue Syndrome (Severe)": "慢性疲勞綜合徵（重型）",
  "Chronic Hepatitis B": "慢性乙型肝炎",
  "Chronic Kidney Disease": "慢性腎臟病",
  "Chronic Pharyngitis": "慢性咽炎",
  "Chronic Sinusitis": "慢性鼻竇炎",
  "Chronic Urticaria": "慢性蕁麻疹",
  "Constipation (Functional)": "功能性便秘",
  "Endometriosis": "子宮內膜異位症",
  "Erectile Dysfunction": "勃起功能障礙",
  "Female Infertility": "女性不孕症",
  "Gastroesophageal Reflux Disease": "胃食管反流病",
  "Generalized Anxiety Disorder": "廣泛性焦慮障礙",
  "Gout": "痛風",
  "Hemorrhoids": "痔瘡",
  "Hyperlipidemia": "高脂血症",
  "Ischemic Stroke": "缺血性中風",
  "Lumbar Disc Herniation": "腰椎間盤突出",
  "Non-alcoholic Fatty Liver Disease": "非酒精性脂肪肝病",
  "Osteoporosis": "骨質疏鬆症",
  "Parkinson Disease": "帕金森病",
  "Peptic Ulcer Disease": "消化性潰瘍",
  "Polycystic Ovary Syndrome": "多囊卵巢綜合徵",
  "Postherpetic Neuralgia": "帶狀皰疹後神經痛",
  "Premenstrual Syndrome": "經前綜合徵",
  "Psoriasis": "牛皮癬（銀屑病）",
  "Recurrent Pregnancy Loss": "復發性流產",
  "Rheumatoid Arthritis": "類風濕關節炎",
  "Sepsis": "膿毒症",
  "Tinnitus": "耳鳴",
  "Trigeminal Neuralgia": "三叉神經痛",
  "Uterine Fibroids": "子宮肌瘤",
  "Vertigo (Meniere Disease)": "梅尼埃病",
};

function chineseNameForCondition(westernName: string, description: string | null): string {
  if (WESTERN_NAME_TO_ZH[westernName]) return WESTERN_NAME_TO_ZH[westernName];
  // Fallback: a Chinese description usually starts with the Chinese disease
  // name — e.g. "慢性疲勞綜合徵是一種…". Extract the leading CJK run only if
  // the description actually starts with a CJK character.
  if (description) {
    const first = description.charCodeAt(0);
    const startsCjk = (first >= 0x3400 && first <= 0x9fff) || (first >= 0xf900 && first <= 0xfaff);
    if (startsCjk) {
      // Match a run of CJK characters plus a couple of common ASCII type-suffixes
      // (e.g. "2型糖尿病"). Stop at the first non-name punctuation.
      const m = description.match(/^[㐀-鿿A-Za-z0-9型]+/);
      if (m && m[0].length >= 2 && m[0].length <= 20) return m[0];
    }
  }
  return westernName;
}

/**
 * Extract the TCM disease term that the description names — typically
 * after 中醫稱「X」 or 中醫多歸屬「X」、「Y」範疇. Returns the first 「…」
 * snippet found, or null if none.
 */
function tcmNameFromDescription(description: string | null): string | null {
  if (!description) return null;
  // 中醫稱「不寐」 / 中醫稱「胸痹」、「心痛」 / 中醫多歸屬「腰痛」範疇
  const re = /中醫(?:多?歸屬|稱)((?:「[^」]+」、?)+)/;
  const hit = description.match(re);
  if (!hit) return null;
  const names: string[] = [];
  const inner = hit[1];
  const reInner = /「([^」]+)」/g;
  let m: RegExpExecArray | null;
  while ((m = reInner.exec(inner)) !== null) names.push(m[1]);
  return names.length > 0 ? names.join("、") : null;
}

async function extractHerbsWithOpenAI(
  imageBase64: string,
  imageMimeType: ImageMime,
  prompt: string,
): Promise<{ transcription: string; herbs: ExtractedHerb[] }> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const dataUri = `data:${imageMimeType};base64,${imageBase64}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      max_tokens: 4096,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUri, detail: "high" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI vision request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI vision response.");
  return JSON.parse(stripJsonFence(content));
}

async function extractHerbsWithAnthropic(
  imageBase64: string,
  imageMimeType: ImageMime,
  prompt: string,
): Promise<{ transcription: string; herbs: ExtractedHerb[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: ANTHROPIC_VISION_MODEL,
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMimeType, data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Anthropic vision model.");
  }
  return JSON.parse(stripJsonFence(textBlock.text));
}

export async function analyzePrescriptionImage(
  imageBase64: string,
  imageMimeType: ImageMime,
): Promise<AnalysisResponse> {
  const provider = getConfiguredVisionProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "No vision API key configured. Set OPENAI_API_KEY (preferred) or ANTHROPIC_API_KEY in your .env file to enable photo analysis.",
      reason: "no_api_key",
    };
  }

  // Pull the herb DB once. We use the chineseName list as anchor vocabulary
  // for the vision model AND reuse it for fuzzy-matching afterwards.
  const allHerbs = await prisma.herb.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true, chineseName: true, pinyinName: true, latinName: true, englishName: true,
      category: true,
    },
  });
  const anchorVocab = allHerbs
    .map((h) => h.chineseName)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  const prompt = buildVisionPrompt(anchorVocab);

  let visionJson: { transcription: string; herbs: ExtractedHerb[] };
  try {
    visionJson =
      provider === "openai"
        ? await extractHerbsWithOpenAI(imageBase64, imageMimeType, prompt)
        : await extractHerbsWithAnthropic(imageBase64, imageMimeType, prompt);
  } catch (err) {
    return {
      ok: false,
      error: `Vision analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      reason: "vision_error",
    };
  }

  const extractedHerbs: ExtractedHerb[] = (visionJson.herbs ?? []).filter((h) => h.name);
  if (extractedHerbs.length === 0) {
    return {
      ok: false,
      error: "No herbs identified in the image. Try a clearer photo with the herb list visible.",
      reason: "no_herbs_found",
    };
  }

  return analyzeExtractedHerbs(extractedHerbs, visionJson.transcription ?? "", allHerbs);
}

/**
 * Manual-selection entry point: caller supplies herb DB IDs (and optional
 * dosages). Skips the vision step and the fuzzy-match step — IDs are trusted.
 */
export async function analyzeHerbList(
  selections: Array<{ herbId: string; dosage?: string }>,
): Promise<AnalysisResponse> {
  if (selections.length === 0) {
    return {
      ok: false,
      error: "No herbs supplied.",
      reason: "no_herbs_found",
    };
  }

  const ids = selections.map((s) => s.herbId);
  const dbHerbs = await prisma.herb.findMany({
    where: { id: { in: ids } },
    select: { id: true, chineseName: true, pinyinName: true, category: true },
  });
  const byId = new Map(dbHerbs.map((h) => [h.id, h]));

  const matchedHerbs: AnalysisResult["matchedHerbs"] = [];
  const unmatchedHerbs: string[] = [];
  const extractedHerbs: ExtractedHerb[] = [];
  for (const sel of selections) {
    const h = byId.get(sel.herbId);
    if (!h) {
      unmatchedHerbs.push(sel.herbId);
      continue;
    }
    extractedHerbs.push({ name: h.chineseName, pinyin: h.pinyinName, dosage: sel.dosage });
    matchedHerbs.push({
      raw: h.chineseName,
      herbId: h.id,
      chineseName: h.chineseName,
      pinyinName: h.pinyinName,
      category: h.category,
      dosage: sel.dosage,
    });
  }

  return composeAnalysis({
    rawPrescription: "",
    extractedHerbs,
    matchedHerbs,
    unmatchedHerbs,
  });
}

type HerbRow = {
  id: string;
  chineseName: string;
  pinyinName: string;
  latinName: string | null;
  englishName: string | null;
  category: string;
};

// Strip common processing-method prefixes the OCR may include but the DB
// stores as plain forms (e.g. 炒白朮 → 白朮, 制半夏 → 半夏, 炙甘草 → 甘草).
const PROCESS_PREFIXES = ["炙", "炒", "制", "製", "生", "熟", "焦", "煅", "醋", "酒", "鹽", "蜜", "麩"];
function stripProcessPrefix(name: string): string {
  let n = name;
  // Strip up to two prefix chars (e.g. 制半夏 → 半夏, 蜜炙甘草 → 甘草).
  for (let i = 0; i < 2; i++) {
    if (n.length > 1 && PROCESS_PREFIXES.includes(n[0])) {
      n = n.slice(1);
    } else {
      break;
    }
  }
  return n;
}

async function analyzeExtractedHerbs(
  extractedHerbs: ExtractedHerb[],
  rawPrescription: string,
  allHerbs: HerbRow[],
): Promise<AnalysisResponse> {
  const matchedHerbs: AnalysisResult["matchedHerbs"] = [];
  const unmatchedHerbs: string[] = [];

  for (const ex of extractedHerbs) {
    const exNameRaw = ex.name.trim();
    const exNameStripped = stripProcessPrefix(exNameRaw);

    // 1. Exact chineseName match — try raw then stripped form.
    let match: HerbRow | undefined =
      allHerbs.find((h) => h.chineseName === exNameRaw) ??
      allHerbs.find((h) => h.chineseName === exNameStripped);

    // 2. Pinyin exact match.
    if (!match && ex.pinyin) {
      const pin = ex.pinyin.trim().toLowerCase().replace(/\s+/g, " ");
      match = allHerbs.find((h) => h.pinyinName.toLowerCase() === pin);
    }

    // 3. Substring match (partial Chinese name like 黃芪 vs 北芪).
    if (!match) {
      const target = exNameStripped;
      match = allHerbs.find((h) =>
        h.chineseName.includes(target) || target.includes(h.chineseName),
      );
    }

    // 4. Pinyin loose match — strip spaces, compare lowercased.
    if (!match && ex.pinyin) {
      const pinNoSpace = ex.pinyin.toLowerCase().replace(/\s+/g, "");
      match = allHerbs.find((h) => h.pinyinName.toLowerCase().replace(/\s+/g, "") === pinNoSpace);
    }

    if (match) {
      matchedHerbs.push({
        raw: exNameRaw,
        herbId: match.id,
        chineseName: match.chineseName,
        pinyinName: match.pinyinName,
        category: match.category,
        dosage: ex.dosage,
      });
    } else {
      unmatchedHerbs.push(exNameRaw + (ex.dosage ? ` (${ex.dosage})` : ""));
    }
  }

  return composeAnalysis({ rawPrescription, extractedHerbs, matchedHerbs, unmatchedHerbs });
}

async function composeAnalysis(args: {
  rawPrescription: string;
  extractedHerbs: ExtractedHerb[];
  matchedHerbs: AnalysisResult["matchedHerbs"];
  unmatchedHerbs: string[];
}): Promise<AnalysisResponse> {
  const { rawPrescription, extractedHerbs, matchedHerbs, unmatchedHerbs } = args;

  const formulasWithHerbs = await prisma.formula.findMany({
    select: {
      id: true, chineseName: true, pinyinName: true, category: true,
      actions: true, indications: true,
      herbs: { select: { herbId: true, role: true } },
    },
  });

  const matchedHerbIds = new Set(matchedHerbs.map((h) => h.herbId));
  const matchedFormulas: AnalysisResult["matchedFormulas"] = [];
  for (const f of formulasWithHerbs) {
    if (f.herbs.length === 0) continue;
    const totalHerbs = f.herbs.length;
    const matchedCount = f.herbs.filter((h) => matchedHerbIds.has(h.herbId)).length;
    if (matchedCount === 0) continue;
    const matchPct = Math.round((matchedCount / totalHerbs) * 100);
    if ((matchPct >= 60 && matchedCount >= 3) || (matchedCount === totalHerbs && totalHerbs >= 1)) {
      matchedFormulas.push({
        formulaId: f.id,
        chineseName: f.chineseName,
        pinyinName: f.pinyinName,
        category: f.category,
        actions: f.actions,
        indications: f.indications,
        matchPct,
        matchedHerbCount: matchedCount,
        totalHerbCount: totalHerbs,
      });
    }
  }
  matchedFormulas.sort((a, b) => b.matchPct - a.matchPct);

  const formulaIds = matchedFormulas.map((f) => f.formulaId);
  const patternFormulas = formulaIds.length > 0
    ? await prisma.patternFormula.findMany({
        where: { formulaId: { in: formulaIds } },
        select: {
          patternId: true,
          isPrimary: true,
          pattern: { select: { chineseName: true, pinyinName: true } },
        },
      })
    : [];
  const patternScores = new Map<string, { id: string; chineseName: string; pinyinName: string; score: number }>();
  for (const pf of patternFormulas) {
    const key = pf.patternId;
    const existing = patternScores.get(key);
    const score = (existing?.score ?? 0) + (pf.isPrimary ? 2 : 1);
    patternScores.set(key, {
      id: pf.patternId,
      chineseName: pf.pattern.chineseName,
      pinyinName: pf.pattern.pinyinName,
      score,
    });
  }
  const suggestedPatterns = Array.from(patternScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p) => ({ patternId: p.id, chineseName: p.chineseName, pinyinName: p.pinyinName, score: p.score }));

  const patternIds = suggestedPatterns.map((p) => p.patternId);
  const conditionMappings = patternIds.length > 0
    ? await prisma.conditionPatternMapping.findMany({
        where: { patternId: { in: patternIds } },
        select: {
          conditionId: true,
          frequency: true,
          condition: { select: { westernName: true, icd11Code: true, description: true } },
        },
      })
    : [];
  const conditionScores = new Map<
    string,
    { id: string; westernName: string; description: string | null; icd11Code: string | null; score: number }
  >();
  const freqWeight = { COMMON: 3, OCCASIONAL: 2, RARE: 1 } as const;
  for (const cm of conditionMappings) {
    const key = cm.conditionId;
    const existing = conditionScores.get(key);
    const score = (existing?.score ?? 0) + (freqWeight[cm.frequency as keyof typeof freqWeight] ?? 1);
    conditionScores.set(key, {
      id: cm.conditionId,
      westernName: cm.condition.westernName,
      description: cm.condition.description,
      icd11Code: cm.condition.icd11Code,
      score,
    });
  }
  const suggestedConditions = Array.from(conditionScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((c) => ({
      conditionId: c.id,
      westernName: c.westernName,
      chineseName: chineseNameForCondition(c.westernName, c.description),
      tcmName: tcmNameFromDescription(c.description),
      icd11Code: c.icd11Code,
      score: c.score,
    }));

  const warnings: string[] = [];
  if (unmatchedHerbs.length > 0) {
    warnings.push(
      `${unmatchedHerbs.length} herb(s) could not be matched to the database — may be uncommon herbs, custom abbreviations, or OCR errors.`,
    );
  }
  if (matchedFormulas.length === 0) {
    warnings.push(
      "Composition does not closely match any classical or patent formula in our database — likely a custom prescription. Suggested uses below are inferred from individual herbs.",
    );
  }
  if (matchedHerbs.length < 3) {
    warnings.push(
      "Few herbs were identified. Result reliability is low — add more herbs or re-photograph the full prescription.",
    );
  }

  return {
    ok: true,
    rawPrescription,
    extractedHerbs,
    matchedHerbs,
    unmatchedHerbs,
    matchedFormulas,
    suggestedConditions,
    suggestedPatterns,
    warnings,
  };
}
