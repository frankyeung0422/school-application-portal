/**
 * BindingDB import — annotate ProteinTarget rows with experimental druggability
 * (measured ligand count + best affinity) from BindingDB, keyed by UniProt.
 *
 * Idempotent: skips targets already annotated unless --force. Bounded by --max.
 * Only fetches targets present in both the graph and UNIPROT_BY_GENE.
 *
 * Dry run: npx tsx scripts/import-bindingdb.ts
 * Apply:   npx tsx scripts/import-bindingdb.ts --apply --max=80
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { UNIPROT_BY_GENE, fetchTargetAffinity } from "../src/lib/research/bindingdb";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const MAX = Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 80);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const targets = await prisma.proteinTarget.findMany({
    where: { geneSymbol: { in: Object.keys(UNIPROT_BY_GENE) } },
    select: { id: true, geneSymbol: true, uniprotId: true, bindingdbCount: true },
  });
  const queue = targets.filter((t) => FORCE || t.bindingdbCount == null).slice(0, MAX);
  console.log(`Targets in graph with a UniProt mapping: ${targets.length}; to fetch: ${queue.length}`);

  let annotated = 0;
  for (const t of queue) {
    const uniprot = UNIPROT_BY_GENE[t.geneSymbol];
    let aff;
    try {
      aff = await fetchTargetAffinity(uniprot);
    } catch (e) {
      console.warn(`  ⚠ ${t.geneSymbol} (${uniprot}): ${String(e).slice(0, 100)}`);
      await sleep(400);
      continue;
    }
    if (!aff) {
      console.log(`  – ${t.geneSymbol}: no measured binders`);
      await sleep(300);
      continue;
    }
    if (!APPLY) {
      console.log(`  [dry] ${t.geneSymbol}: ${aff.count} binders, best ${aff.bestType}=${aff.bestNm} nM`);
      await sleep(300);
      continue;
    }
    await prisma.proteinTarget.update({
      where: { id: t.id },
      data: { uniprotId: uniprot, bindingdbCount: aff.count, bestAffinityType: aff.bestType, bestAffinityNm: aff.bestNm },
    });
    annotated++;
    console.log(`  ✓ ${t.geneSymbol}: ${aff.count} binders, best ${aff.bestType}=${aff.bestNm} nM`);
    await sleep(300);
  }

  console.log(APPLY ? `\n✓ Applied. annotated=${annotated}` : `\n(dry run) Re-run with --apply.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
