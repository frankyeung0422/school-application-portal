import { prisma } from "@/lib/db/prisma";
import { DRUG_CYP, HERB_CYP, type Enzyme, type HerbCyp } from "./cyp-data";

/**
 * Predict pharmacokinetic herb-drug interactions from CYP/transporter overlap.
 *
 * Primary signal: curated HERB_CYP (herb inhibits/induces enzyme X) × DRUG_CYP
 * (drug is a substrate of X). Inhibition raises substrate exposure (toxicity);
 * induction lowers it (efficacy loss); prodrug substrates invert the efficacy
 * logic. Secondary, clearly-labelled signal: herbs whose graph compounds target
 * a CYP that a drug is a substrate of — direction unverified, THEORETICAL only.
 */

export interface PredictedInteraction {
  herbId: string;
  herbChineseName: string;
  herbPinyinName: string;
  drugGeneric: string;
  drugDisplay: string;
  enzyme: Enzyme;
  direction: "inhibits" | "induces";
  effect: "INCREASE" | "DECREASE"; // on drug exposure / active effect
  severity: "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL";
  basis: "curated" | "network";
  mechanism: string;
  management: string;
}

export interface PredictInput {
  herbs: { id: string; chineseName: string; pinyinName: string; latinName: string | null }[];
  drugs: { generic: string; display: string }[];
}

const SEV_RANK: Record<string, number> = { MAJOR: 3, MODERATE: 2, MINOR: 1, THEORETICAL: 0 };

function matchHerbCyp(pinyinName: string, latinName: string | null): HerbCyp | undefined {
  const pin = pinyinName.toLowerCase();
  const lat = (latinName ?? "").toLowerCase();
  return HERB_CYP.find(
    (h) => h.pinyin.some((p) => pin.includes(p)) || (h.latin && lat.includes(h.latin.toLowerCase())),
  );
}

export async function predictPkInteractions(input: PredictInput): Promise<PredictedInteraction[]> {
  const out: PredictedInteraction[] = [];
  const seen = new Set<string>(); // herbId|generic|enzyme — one prediction per enzyme pair

  // ── Primary: curated herb-CYP modulation × drug substrate ──
  for (const herb of input.herbs) {
    const hc = matchHerbCyp(herb.pinyinName, herb.latinName);
    if (!hc) continue;
    for (const drug of input.drugs) {
      const dc = DRUG_CYP[drug.generic.toLowerCase()];
      if (!dc?.substrate) continue;
      const consider: { enz: Enzyme; direction: "inhibits" | "induces" }[] = [
        ...(hc.inhibits ?? []).map((enz) => ({ enz, direction: "inhibits" as const })),
        ...(hc.induces ?? []).map((enz) => ({ enz, direction: "induces" as const })),
      ];
      for (const { enz, direction } of consider) {
        if (!dc.substrate.includes(enz)) continue;
        const key = `${herb.id}|${drug.generic}|${enz}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const isProdrug = dc.prodrugOf?.includes(enz) ?? false;
        let effect: PredictedInteraction["effect"];
        let severity: PredictedInteraction["severity"];
        let mech: string;
        if (direction === "inhibits") {
          if (isProdrug) {
            effect = "DECREASE";
            severity = "MAJOR";
            mech = `${herb.chineseName}抑制 ${enz}；${drug.display} 為需經 ${enz} 活化的前體藥，抑制將降低其活性代謝物 → 療效下降。`;
          } else {
            effect = "INCREASE";
            severity = dc.narrowTI ? "MAJOR" : "MODERATE";
            mech = `${herb.chineseName}抑制 ${enz}；${drug.display} 經 ${enz} 代謝清除，併用將升高其血藥濃度 → 毒性風險。`;
          }
        } else {
          if (isProdrug) {
            effect = "INCREASE";
            severity = dc.narrowTI ? "MAJOR" : "MODERATE";
            mech = `${herb.chineseName}誘導 ${enz}；加速活化 ${drug.display} 前體藥，活性代謝物升高 → 毒性風險。`;
          } else {
            effect = "DECREASE";
            severity = dc.narrowTI ? "MAJOR" : "MODERATE";
            mech = `${herb.chineseName}誘導 ${enz}；加速 ${drug.display} 代謝清除，併用將降低其血藥濃度 → 療效下降。`;
          }
        }
        const management =
          effect === "INCREASE"
            ? "建議監測藥物濃度與毒性徵象，必要時減量或錯開服藥時間。"
            : "建議監測療效指標，必要時調整劑量或改用替代方案。";

        out.push({
          herbId: herb.id,
          herbChineseName: herb.chineseName,
          herbPinyinName: herb.pinyinName,
          drugGeneric: drug.generic,
          drugDisplay: drug.display,
          enzyme: enz,
          direction,
          effect,
          severity,
          basis: "curated",
          mechanism: `${mech} ${hc.note}`,
          management,
        });
      }
    }
  }

  // ── Secondary: graph-derived CYP overlap (direction unverified) ──
  const drugSubstrates = input.drugs
    .map((d) => ({ ...d, cyp: (DRUG_CYP[d.generic.toLowerCase()]?.substrate ?? []).filter((e) => e !== "PGP") }))
    .filter((d) => d.cyp.length > 0);

  if (drugSubstrates.length > 0 && input.herbs.length > 0) {
    const links = await prisma.compoundTarget.findMany({
      where: { compound: { herbId: { in: input.herbs.map((h) => h.id) } }, target: { geneSymbol: { startsWith: "CYP" } } },
      select: { compound: { select: { herbId: true } }, target: { select: { geneSymbol: true } } },
    });
    const herbCyp = new Map<string, Set<string>>();
    for (const l of links) {
      const s = herbCyp.get(l.compound.herbId) ?? new Set<string>();
      s.add(l.target.geneSymbol);
      herbCyp.set(l.compound.herbId, s);
    }
    for (const herb of input.herbs) {
      const cyps = herbCyp.get(herb.id);
      if (!cyps) continue;
      for (const drug of drugSubstrates) {
        for (const enz of drug.cyp) {
          if (!cyps.has(enz)) continue;
          const key = `${herb.id}|${drug.generic}|${enz}`;
          if (seen.has(key)) continue; // already curated → skip
          seen.add(key);
          out.push({
            herbId: herb.id,
            herbChineseName: herb.chineseName,
            herbPinyinName: herb.pinyinName,
            drugGeneric: drug.generic,
            drugDisplay: drug.display,
            enzyme: enz,
            direction: "inhibits",
            effect: "INCREASE",
            severity: "THEORETICAL",
            basis: "network",
            mechanism: `網絡藥理推斷：${herb.chineseName}所含成分可能作用於 ${enz}，而 ${drug.display} 為 ${enz} 受質；作用方向（抑制/誘導）尚未驗證。`,
            management: "此為靶點圖譜推斷之理論性提示，須查證原始文獻後再評估臨床意義。",
          });
        }
      }
    }
  }

  out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || (a.basis === "curated" ? -1 : 1));
  return out;
}
