/**
 * Backfill pregnancy / lactation / pediatric safety flags onto each herb's
 * HerbContraindication row(s). Uses Claude/OpenAI to read the herb's
 * description, modern pharmacology, and contraindication text, then returns
 * structured safety categories.
 *
 * Idempotent — only fills NULL columns; existing curated values are preserved.
 *
 * Run dry:    npx tsx scripts/backfill-safety-flags.ts
 * Run apply:  npx tsx scripts/backfill-safety-flags.ts --apply
 * Limit:      npx tsx scripts/backfill-safety-flags.ts --apply --max=50
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const MAX = Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1]) || 999;

const OPENAI_MODEL = process.env.SAFETY_OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.SAFETY_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

type Provider = "openai" | "anthropic";
function pickProvider(): Provider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

const PREG = ["SAFE", "CAUTION", "CONTRAINDICATED", "UNKNOWN"];
const LACT = ["SAFE", "CAUTION", "CONTRAINDICATED", "UNKNOWN"];
const PED = ["SAFE", "CAUTION_OVER_2", "CAUTION_OVER_6", "CONTRAINDICATED", "UNKNOWN"];

interface SafetyOut {
  pregnancyCategory: typeof PREG[number];
  lactationSafety: typeof LACT[number];
  pediatricSafety: typeof PED[number];
  reason: string;
}

const PROMPT = `You are a TCM pharmacovigilance assistant. Given a Chinese herb's
description, classical contraindications, and modern pharmacology, classify
its safety in three populations. Return STRICT JSON only.

pregnancyCategory: one of
  SAFE — no known harm with normal dosing
  CAUTION — use sparingly or only when benefits outweigh risks
  CONTRAINDICATED — classical or modern evidence of harm (abortifacient,
    teratogen, strong blood-mover, etc.)
  UNKNOWN — insufficient data

lactationSafety: SAFE | CAUTION | CONTRAINDICATED | UNKNOWN

pediatricSafety: one of
  SAFE — generally fine for children at adjusted dose
  CAUTION_OVER_2 — only for children ≥ 2 years old, with caution
  CAUTION_OVER_6 — only for children ≥ 6 years old, with caution
  CONTRAINDICATED — not for use in children
  UNKNOWN

Use UNKNOWN when the text is silent — DO NOT default to SAFE.

For herbs with classical 妊娠禁忌 (e.g. 莪朮, 三棱, 桃仁, 紅花, 大黃 in high dose, 番瀉葉, 牽牛子, 麝香),
pregnancyCategory MUST be CONTRAINDICATED.

For potent or toxic herbs (附子, 細辛, 半夏 生品, 烏頭, 馬錢子, 雷公藤, 砒石, 巴豆),
pediatricSafety MUST be CONTRAINDICATED or CAUTION_OVER_6.

Output:
{
  "pregnancyCategory": "...",
  "lactationSafety": "...",
  "pediatricSafety": "...",
  "reason": "<one sentence in Traditional Chinese explaining the classification>"
}`;

function stripFence(s: string): string {
  return s.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
}

async function classifyOpenAI(input: string): Promise<SafetyOut | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 400,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: `${PROMPT}\n\n${input}` }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = j.choices?.[0]?.message?.content ?? null;
  return text ? validate(text) : null;
}

let _anth: Anthropic | null = null;
async function classifyAnthropic(input: string): Promise<SafetyOut | null> {
  if (!_anth) _anth = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await _anth.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 400,
    temperature: 0,
    messages: [{ role: "user", content: `${PROMPT}\n\n${input}` }],
  });
  const block = res.content.find((c) => c.type === "text");
  return block && block.type === "text" ? validate(block.text) : null;
}

function validate(text: string): SafetyOut | null {
  try {
    const raw = JSON.parse(stripFence(text)) as Record<string, unknown>;
    const pc = typeof raw.pregnancyCategory === "string" && PREG.includes(raw.pregnancyCategory) ? raw.pregnancyCategory : "UNKNOWN";
    const ls = typeof raw.lactationSafety === "string" && LACT.includes(raw.lactationSafety) ? raw.lactationSafety : "UNKNOWN";
    const ps = typeof raw.pediatricSafety === "string" && PED.includes(raw.pediatricSafety) ? raw.pediatricSafety : "UNKNOWN";
    const reason = typeof raw.reason === "string" ? raw.reason : "";
    return { pregnancyCategory: pc, lactationSafety: ls, pediatricSafety: ps, reason };
  } catch {
    return null;
  }
}

async function classify(input: string): Promise<SafetyOut | null> {
  const prov = pickProvider();
  if (!prov) throw new Error("No API key — set OPENAI_API_KEY or ANTHROPIC_API_KEY");
  return prov === "openai" ? classifyOpenAI(input) : classifyAnthropic(input);
}

async function main() {
  console.log(`[backfill-safety] mode=${APPLY ? "APPLY" : "DRY-RUN"}  cap=${MAX}`);

  // Pull every herb + its contraindication rows.
  const herbs = await prisma.herb.findMany({
    select: {
      id: true, chineseName: true, pinyinName: true, description: true, modernPharmacology: true,
      contraindications: {
        select: { id: true, condition: true, description: true, pregnancyCategory: true, lactationSafety: true, pediatricSafety: true },
      },
    },
  });

  let processed = 0, updated = 0, created = 0, skipped = 0;
  for (const h of herbs) {
    if (processed >= MAX) break;

    // Decide whether any flag is missing across all rows.
    const allFilled = h.contraindications.length > 0 && h.contraindications.every(
      (c) => c.pregnancyCategory && c.lactationSafety && c.pediatricSafety,
    );
    if (allFilled) {
      skipped++;
      continue;
    }

    // Build a representative input.
    const contraText = h.contraindications.map((c) => `${c.condition}: ${c.description ?? ""}`).join("\n");
    const input =
      `Herb: ${h.chineseName} (${h.pinyinName})\n\n` +
      `Description:\n${h.description ?? "(none)"}\n\n` +
      `Modern pharmacology:\n${h.modernPharmacology ?? "(none)"}\n\n` +
      `Existing contraindications:\n${contraText || "(none)"}`;

    let out: SafetyOut | null;
    try {
      out = await classify(input);
    } catch (err) {
      console.log(`  ⚠ ${h.chineseName} — LLM error: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    if (!out) {
      console.log(`  ⚠ ${h.chineseName} — empty output`);
      continue;
    }

    processed++;
    const label = `${h.chineseName.padEnd(6, "　")} → 孕:${out.pregnancyCategory} 乳:${out.lactationSafety} 兒:${out.pediatricSafety}`;
    if (!APPLY) {
      console.log(`  [dry] ${label} — ${out.reason.slice(0, 60)}`);
      continue;
    }

    if (h.contraindications.length === 0) {
      // Create a "general safety" contraindication row.
      await prisma.herbContraindication.create({
        data: {
          herbId: h.id,
          condition: "一般安全分類",
          severity: out.pregnancyCategory === "CONTRAINDICATED" ? "MAJOR" : "THEORETICAL",
          description: out.reason,
          pregnancyCategory: out.pregnancyCategory as "SAFE" | "CAUTION" | "CONTRAINDICATED" | "UNKNOWN",
          lactationSafety: out.lactationSafety as "SAFE" | "CAUTION" | "CONTRAINDICATED" | "UNKNOWN",
          pediatricSafety: out.pediatricSafety as "SAFE" | "CAUTION_OVER_2" | "CAUTION_OVER_6" | "CONTRAINDICATED" | "UNKNOWN",
        },
      });
      created++;
      console.log(`  + created ${label}`);
    } else {
      // Update existing rows only where the field is null (preserve curated).
      for (const c of h.contraindications) {
        const data: Record<string, unknown> = {};
        if (!c.pregnancyCategory) data.pregnancyCategory = out.pregnancyCategory;
        if (!c.lactationSafety) data.lactationSafety = out.lactationSafety;
        if (!c.pediatricSafety) data.pediatricSafety = out.pediatricSafety;
        if (Object.keys(data).length > 0) {
          await prisma.herbContraindication.update({ where: { id: c.id }, data });
        }
      }
      updated++;
      console.log(`  ↻ updated ${label}`);
    }
  }

  console.log(`\n[backfill-safety] processed=${processed}, created=${created}, updated=${updated}, skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
