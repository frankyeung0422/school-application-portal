/**
 * Network-pharmacology ingestion — protein target → KEGG pathway.
 *
 * Seeds Pathway rows and TargetPathway links from the curated PATHWAY_SEED.
 * Only links pathway member genes that already exist as ProteinTarget rows
 * (i.e. targets actually reachable from a herb compound), so the enrichment
 * graph stays grounded in our herb library. Run AFTER import-compound-targets.
 *
 * Dry run: npx tsx scripts/enrich-pathways.ts
 * Apply:   npx tsx scripts/enrich-pathways.ts --apply
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PATHWAY_SEED } from "./data/network-pharmacology-seed";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

async function main() {
  const targets = await prisma.proteinTarget.findMany({ select: { id: true, geneSymbol: true } });
  const targetByGene = new Map(targets.map((t) => [t.geneSymbol, t.id]));
  console.log(`ProteinTargets in DB: ${targets.length}`);

  let pathwaysCreated = 0;
  let linksCreated = 0;

  for (const p of PATHWAY_SEED) {
    const reachable = p.genes.filter((g) => targetByGene.has(g));
    if (reachable.length === 0) {
      console.log(`  ${p.code} ${p.name}: 0 reachable targets — skipping`);
      continue;
    }
    console.log(`  ${p.code} ${p.name}: ${reachable.length}/${p.genes.length} reachable`);
    if (!APPLY) continue;

    let pathway = await prisma.pathway.findUnique({ where: { code: p.code } });
    if (!pathway) {
      pathway = await prisma.pathway.create({
        data: { code: p.code, name: p.name, source: p.source, category: p.category ?? null },
      });
      pathwaysCreated++;
    }
    for (const gene of reachable) {
      const targetId = targetByGene.get(gene)!;
      const existing = await prisma.targetPathway.findUnique({
        where: { targetId_pathwayId: { targetId, pathwayId: pathway.id } },
      });
      if (!existing) {
        await prisma.targetPathway.create({ data: { targetId, pathwayId: pathway.id } });
        linksCreated++;
      }
    }
  }

  if (APPLY) console.log(`\n✓ Applied. pathwaysCreated=${pathwaysCreated} targetPathwayLinks=${linksCreated}`);
  else console.log(`\n(dry run) Re-run with --apply.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
