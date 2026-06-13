/**
 * Network-pharmacology ingestion — disease → gene sets.
 *
 * Seeds DiseaseGene rows from the curated DISEASE_GENE_SEED, keyed by
 * DISEASE_CATALOG[].id. Genes are drawn from DisGeNET/OMIM-grade disease
 * gene associations in the literature. Idempotent.
 *
 * Dry run: npx tsx scripts/import-disease-genes.ts
 * Apply:   npx tsx scripts/import-disease-genes.ts --apply
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DISEASE_GENE_SEED } from "./data/network-pharmacology-seed";
import { DISEASE_CATALOG } from "../src/lib/research/disease-catalog";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

async function main() {
  const catalogIds = new Set(DISEASE_CATALOG.map((d) => d.id));
  let rowsCreated = 0;

  for (const [diseaseId, seed] of Object.entries(DISEASE_GENE_SEED)) {
    if (!catalogIds.has(diseaseId)) {
      console.warn(`  ⚠ disease "${diseaseId}" has gene seed but is NOT in DISEASE_CATALOG (skipping)`);
      continue;
    }
    for (const gene of seed.genes) {
      if (!APPLY) {
        continue;
      }
      const existing = await prisma.diseaseGene.findUnique({
        where: { diseaseId_geneSymbol: { diseaseId, geneSymbol: gene } },
      });
      if (!existing) {
        await prisma.diseaseGene.create({
          data: { diseaseId, diseaseName: seed.name, geneSymbol: gene, source: "curated", score: null },
        });
        rowsCreated++;
      }
    }
    console.log(`  ${diseaseId} (${seed.name}): ${seed.genes.length} genes`);
  }

  if (APPLY) console.log(`\n✓ Applied. diseaseGeneRowsCreated=${rowsCreated}`);
  else console.log(`\n(dry run) Re-run with --apply.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
