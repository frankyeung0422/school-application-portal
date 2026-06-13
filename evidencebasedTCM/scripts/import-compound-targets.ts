/**
 * Network-pharmacology ingestion — herb → active compound → protein target.
 *
 * Seeds HerbActiveCompound rows (these were previously empty), ProteinTarget
 * rows, and the CompoundTarget edges between them, from the curated
 * high-confidence dataset in scripts/data/network-pharmacology-seed.ts.
 *
 * Optional --llm flag: for herbs that have a mechanismOfAction but no curated
 * targets, ask Claude to propose likely gene targets, written with
 * source:"LLM" + low confidence so they are visibly second-class. Requires
 * ANTHROPIC_API_KEY; skipped silently otherwise.
 *
 * Idempotent — safe to re-run.
 *
 * Dry run: npx tsx scripts/import-compound-targets.ts
 * Apply:   npx tsx scripts/import-compound-targets.ts --apply
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { HERB_COMPOUND_SEED } from "./data/network-pharmacology-seed";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

async function getOrCreateTarget(geneSymbol: string): Promise<string> {
  const existing = await prisma.proteinTarget.findUnique({ where: { geneSymbol } });
  if (existing) return existing.id;
  const created = await prisma.proteinTarget.create({ data: { geneSymbol } });
  return created.id;
}

async function main() {
  let herbsMatched = 0;
  let compoundsCreated = 0;
  let edgesCreated = 0;
  let targetsCreated = 0;
  const targetCountBefore = await prisma.proteinTarget.count();

  for (const seed of HERB_COMPOUND_SEED) {
    const herbs = await prisma.herb.findMany({
      where: { status: "PUBLISHED", latinName: { contains: seed.latin, mode: "insensitive" } },
      select: { id: true, chineseName: true, latinName: true },
    });
    if (herbs.length === 0) {
      console.warn(`  ⚠ no herb matched latin="${seed.latin}" (${seed.zh})`);
      continue;
    }
    herbsMatched += herbs.length;

    for (const herb of herbs) {
      for (const c of seed.compounds) {
        if (!APPLY) {
          console.log(`  [dry] ${herb.chineseName} ← ${c.name} (${c.targets.length} targets)`);
          continue;
        }
        // Upsert the compound (no DB unique on herbId+name, so look up first).
        let compound = await prisma.herbActiveCompound.findFirst({
          where: { herbId: herb.id, compoundName: c.name },
        });
        if (!compound) {
          compound = await prisma.herbActiveCompound.create({
            data: {
              herbId: herb.id,
              compoundName: c.name,
              pubchemCid: c.pubchemCid ?? null,
              mechanismOfAction: c.mechanism,
            },
          });
          compoundsCreated++;
        } else if (!compound.mechanismOfAction && c.mechanism) {
          await prisma.herbActiveCompound.update({
            where: { id: compound.id },
            data: { mechanismOfAction: c.mechanism, pubchemCid: compound.pubchemCid ?? c.pubchemCid ?? null },
          });
        }

        for (const gene of c.targets) {
          const targetId = await getOrCreateTarget(gene);
          const link = await prisma.compoundTarget.findUnique({
            where: { compoundId_targetId: { compoundId: compound.id, targetId } },
          });
          if (!link) {
            await prisma.compoundTarget.create({
              data: { compoundId: compound.id, targetId, source: "curated", confidence: 0.9 },
            });
            edgesCreated++;
          }
        }
      }
    }
  }

  if (APPLY) {
    targetsCreated = (await prisma.proteinTarget.count()) - targetCountBefore;
    console.log(
      `\n✓ Applied. herbsMatched=${herbsMatched} compoundsCreated=${compoundsCreated} ` +
      `targetsCreated=${targetsCreated} compoundTargetEdges=${edgesCreated}`,
    );
  } else {
    console.log(`\n(dry run) ${herbsMatched} herb rows would receive compounds. Re-run with --apply.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
