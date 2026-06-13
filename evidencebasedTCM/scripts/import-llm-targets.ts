/**
 * LLM-fallback network-pharmacology ingestion.
 *
 * For herbs that still have NO molecular targets after the curated seed, ask an
 * LLM for the herb's signature active compounds + their well-established human
 * protein targets (HGNC gene symbols). Stored with source:"LLM" and a low
 * confidence (0.4) so these edges are visibly second-class versus curated ones.
 *
 * Herbs are processed in priority order (most formula appearances first) so the
 * highest-leverage gaps close first. Idempotent — skips herbs that already have
 * targets. Provider: OpenAI (gpt-4o-mini) or Anthropic, whichever key is set
 * (same pick logic as grade-paper.ts).
 *
 * Dry run: npx tsx scripts/import-llm-targets.ts
 * Apply:   npx tsx scripts/import-llm-targets.ts --apply --max=30
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const MAX = Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 20);

const OPENAI_MODEL = process.env.LLM_TARGETS_OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.LLM_TARGETS_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function pickProvider(): "openai" | "anthropic" | null {
  const ovr = process.env.LLM_TARGETS_PROVIDER?.toLowerCase();
  if (ovr === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (ovr === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

const PROMPT_HEADER = `You are a traditional-Chinese-medicine network-pharmacology curator.
For the given single herb, return its 1-3 MOST-STUDIED active compounds and their
WELL-ESTABLISHED human protein targets (HGNC gene symbols).

Return STRICT JSON only (no prose, no markdown fences):
{
  "compounds": [
    {
      "name": "English compound name",
      "pubchemCid": "string or null",
      "mechanism": "Traditional Chinese (繁體中文) one sentence: molecular mechanism + TCM action",
      "targets": ["HGNC", "GENE", "SYMBOLS"]
    }
  ]
}

Rules:
- Gene symbols MUST be valid uppercase HGNC symbols (e.g. TNF, IL6, NFKB1, PPARG, AKT1, PTGS2, NOS3).
- 4-12 targets per compound, only widely-published ones. Do NOT invent targets.
- If you do not have solid evidence for this herb, return {"compounds": []}.
- mechanism MUST be Traditional Chinese.`;

let _anthropic: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

async function callAnthropic(userBlock: string): Promise<string | null> {
  const res = await anthropic().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 800,
    temperature: 0,
    messages: [{ role: "user", content: `${PROMPT_HEADER}\n\n${userBlock}` }],
  });
  const b = res.content.find((c) => c.type === "text");
  return b && b.type === "text" ? b.text : null;
}

async function callOpenAI(userBlock: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 800,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: `${PROMPT_HEADER}\n\n${userBlock}` }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

interface LLMCompound {
  name: string;
  pubchemCid?: string | null;
  mechanism?: string;
  targets: string[];
}

function parseCompounds(text: string): LLMCompound[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim());
  } catch {
    return [];
  }
  const compounds = (raw as { compounds?: unknown }).compounds;
  if (!Array.isArray(compounds)) return [];
  const out: LLMCompound[] = [];
  for (const c of compounds) {
    if (!c || typeof c !== "object") continue;
    const name = (c as { name?: unknown }).name;
    const targets = (c as { targets?: unknown }).targets;
    if (typeof name !== "string" || !Array.isArray(targets)) continue;
    const genes = targets
      .filter((g): g is string => typeof g === "string")
      .map((g) => g.trim().toUpperCase())
      .filter((g) => /^[A-Z0-9]{2,10}$/.test(g));
    if (genes.length === 0) continue;
    const cid = (c as { pubchemCid?: unknown }).pubchemCid;
    const mech = (c as { mechanism?: unknown }).mechanism;
    out.push({
      name: name.slice(0, 120),
      pubchemCid: typeof cid === "string" && cid.length > 0 && cid !== "null" ? cid : null,
      mechanism: typeof mech === "string" ? mech : undefined,
      targets: [...new Set(genes)].slice(0, 12),
    });
  }
  return out.slice(0, 3);
}

async function getOrCreateTarget(geneSymbol: string): Promise<string> {
  const existing = await prisma.proteinTarget.findUnique({ where: { geneSymbol } });
  if (existing) return existing.id;
  return (await prisma.proteinTarget.create({ data: { geneSymbol } })).id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const provider = pickProvider();
  if (!provider) {
    console.error("No LLM key — set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
    process.exitCode = 1;
    return;
  }
  console.log(`Provider: ${provider} (${provider === "openai" ? OPENAI_MODEL : ANTHROPIC_MODEL}), max=${MAX}, apply=${APPLY}`);

  // Targetless herbs, prioritized by formula membership (most-used first).
  const herbs = await prisma.herb.findMany({
    where: { status: "PUBLISHED", activeCompounds: { none: { targets: { some: {} } } } },
    select: {
      id: true, chineseName: true, latinName: true, englishName: true, category: true, description: true,
      _count: { select: { formulaHerbs: true } },
    },
  });
  herbs.sort((a, b) => b._count.formulaHerbs - a._count.formulaHerbs);
  const queue = herbs.slice(0, MAX);

  let herbsUpdated = 0, compoundsCreated = 0, edgesCreated = 0;

  for (const h of queue) {
    const userBlock = `Herb: ${h.chineseName}${h.latinName ? ` (${h.latinName})` : ""}${h.englishName ? ` / ${h.englishName}` : ""}
Category: ${h.category}
Note: ${(h.description ?? "").slice(0, 200)}`;

    let text: string | null = null;
    try {
      text = provider === "openai" ? await callOpenAI(userBlock) : await callAnthropic(userBlock);
    } catch (e) {
      console.warn(`  ⚠ ${h.chineseName}: ${String(e).slice(0, 120)}`);
      await sleep(500);
      continue;
    }
    const compounds = text ? parseCompounds(text) : [];
    if (compounds.length === 0) {
      console.log(`  – ${h.chineseName}: no compounds returned`);
      await sleep(200);
      continue;
    }

    if (!APPLY) {
      console.log(`  [dry] ${h.chineseName} ← ${compounds.map((c) => `${c.name}(${c.targets.length})`).join(", ")}`);
      continue;
    }

    for (const c of compounds) {
      let compound = await prisma.herbActiveCompound.findFirst({ where: { herbId: h.id, compoundName: c.name } });
      if (!compound) {
        compound = await prisma.herbActiveCompound.create({
          data: { herbId: h.id, compoundName: c.name, pubchemCid: c.pubchemCid ?? null, mechanismOfAction: c.mechanism ?? null },
        });
        compoundsCreated++;
      }
      for (const gene of c.targets) {
        const targetId = await getOrCreateTarget(gene);
        const link = await prisma.compoundTarget.findUnique({ where: { compoundId_targetId: { compoundId: compound.id, targetId } } });
        if (!link) {
          await prisma.compoundTarget.create({ data: { compoundId: compound.id, targetId, source: "LLM", confidence: 0.4 } });
          edgesCreated++;
        }
      }
    }
    herbsUpdated++;
    console.log(`  ✓ ${h.chineseName}: ${compounds.length} compounds, ${compounds.reduce((s, c) => s + c.targets.length, 0)} targets`);
    await sleep(250);
  }

  console.log(
    APPLY
      ? `\n✓ Applied. herbsUpdated=${herbsUpdated} compoundsCreated=${compoundsCreated} edgesCreated=${edgesCreated}`
      : `\n(dry run) ${queue.length} herbs queued. Re-run with --apply.`,
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
